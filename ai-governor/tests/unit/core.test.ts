import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { EventStore } from '../../src/core/store';
import { project } from '../../src/core/projection';
import { DemoSource } from '../../src/core/sources/demo';
import { parseClaudeCodeTranscripts } from '../../src/core/sources/claudeCode';
import { redactString } from '../../src/core/security/redact';
import { authorize, TYPED_CONFIRMATION, type DispatchContext } from '../../src/core/commands';
import { validateEvent, type GovEvent } from '../../src/core/events/schema';
import { beforeAfter, bucketize, sumUsage } from '../../src/core/selectors';
import { estimateCost } from '../../src/core/pricing';

const NOW = Date.UTC(2026, 10, 24, 15, 0, 0);

async function demoStore() {
  const src = new DemoSource();
  const store = new EventStore();
  store.setCatalog(src.id, src.catalog());
  const events = await src.load(NOW);
  const rep = store.ingest(events);
  return { src, store, events, rep };
}

describe('event schema', () => {
  it('rejects malformed events and accepts valid ones', () => {
    expect(validateEvent({ foo: 1 }).ok).toBe(false);
    const ok = validateEvent({ v: 1, id: 'a', ts: 1, type: 'flow', origin: { kind: 'agent', id: 'x' }, status: 'info', confidentiality: 'internal', nature: 'demo', sourceId: 's' });
    expect(ok.ok).toBe(true);
  });
});

describe('demo source', () => {
  it('generates only demo-tagged, valid events within 30 days', async () => {
    const { events, rep } = await demoStore();
    expect(events.length).toBeGreaterThan(3000);
    expect(rep.rejected).toBe(0);
    expect(events.every((e) => e.nature === 'demo')).toBe(true);
    expect(events.every((e) => e.ts <= NOW)).toBe(true);
  });

  it('is deterministic for a given seed and time', async () => {
    const a = await new DemoSource().load(NOW);
    const b = await new DemoSource().load(NOW);
    expect(a.length).toBe(b.length);
    expect(a[100]).toEqual(b[100]);
  });
});

describe('projection & replay', () => {
  it('projectAt(t) equals a fresh fold of events up to t (replay never diverges)', async () => {
    const { store, events } = await demoStore();
    for (const frac of [0.1, 0.5, 0.77, 0.999]) {
      const t = events[Math.floor(events.length * frac)].ts;
      const fromStore = store.projectAt(t);
      const fresh = project(events, t);
      expect(fromStore.totals).toEqual(fresh.totals);
      expect(Object.keys(fromStore.tasks).length).toBe(Object.keys(fresh.tasks).length);
    }
    // forward scrubbing reuses the cursor and still matches
    const t1 = events[2000].ts;
    const t2 = events[2600].ts;
    store.projectAt(t1);
    expect(store.projectAt(t2).totals).toEqual(project(events, t2).totals);
  });

  it('dedupes events by id and handles out-of-order ingestion', async () => {
    const { store, events } = await demoStore();
    const before = store.getLive().totals.llmCalls;
    expect(store.ingest(events.slice(0, 50)).duplicates).toBe(50);
    expect(store.getLive().totals.llmCalls).toBe(before);
    const late: GovEvent = { ...events[10], id: 'late-1', ts: events[10].ts + 1 };
    store.ingest([late]);
    expect(store.getEvents().length).toBe(events.length + 1);
  });

  it('replay does not mutate the live state', async () => {
    const { store, events } = await demoStore();
    const liveCalls = store.getLive().totals.llmCalls;
    store.projectAt(events[500].ts);
    expect(store.getLive().totals.llmCalls).toBe(liveCalls);
  });
});

describe('redaction', () => {
  it('masks secrets before they reach the store', () => {
    expect(redactString('key sk-ant-api03-abcdefghijklmnop end')).not.toContain('sk-ant-api03');
    expect(redactString('Authorization: Bearer abcdefghijklmnopqrstuvwxyz')).toContain('[jeton masqué]');
    expect(redactString('password=hunter22')).toContain('[secret masqué]');
    expect(redactString('ghp_' + 'a'.repeat(36))).toContain('masqué');
    const store = new EventStore();
    store.ingest([{ v: 1, id: 'x', ts: 1, type: 'flow', origin: { kind: 'agent', id: 'a' }, status: 'info', confidentiality: 'internal', nature: 'demo', sourceId: 's', summary: 'token=sk-ant-admin01-zzzzzzzzzzzz' }]);
    expect(store.getEvents()[0].summary).not.toContain('sk-ant');
  });
});

describe('command gateway', () => {
  const base: DispatchContext = { role: 'owner', mode: 'live', sourceAcceptsCommands: true, sourceLabel: 'démo', interaction: 'click' };
  it('denies everything in replay', () => {
    expect(authorize({ type: 'task.pause', taskId: 't' }, { ...base, mode: 'replay' }).status).toBe('denied');
  });
  it('denies on read-only sources', () => {
    expect(authorize({ type: 'task.pause', taskId: 't' }, { ...base, sourceAcceptsCommands: false }).status).toBe('denied');
  });
  it('enforces role permissions', () => {
    expect(authorize({ type: 'task.pause', taskId: 't' }, { ...base, role: 'observer' }).status).toBe('denied');
    expect(authorize({ type: 'task.rerun', taskId: 't' }, { ...base, role: 'operator' }).status).toBe('denied');
  });
  it('refuses spend from ambiguous gestures', () => {
    const r = authorize({ type: 'task.rerun', taskId: 't' }, { ...base, interaction: 'double-click', confirmation: { acknowledged: true } });
    expect(r.status).toBe('denied');
  });
  it('requires typed confirmation for durable instruction changes', () => {
    const cmd = { type: 'decision.resolve' as const, decisionId: 'd', verdict: 'go' as const, durable: true };
    expect(authorize(cmd, base).status).toBe('needs-confirmation');
    expect(authorize(cmd, { ...base, confirmation: { acknowledged: true, typed: 'oui' } }).status).toBe('needs-confirmation');
    expect(authorize(cmd, { ...base, confirmation: { acknowledged: true, typed: TYPED_CONFIRMATION } }).status).toBe('executed');
  });
  it('low-risk commands run without friction', () => {
    expect(authorize({ type: 'task.pause', taskId: 't' }, base).status).toBe('executed');
  });
});

describe('selectors', () => {
  it('bucketize conserves token totals', async () => {
    const { events } = await demoStore();
    const from = events[0].ts;
    const to = events[events.length - 1].ts;
    const sum = sumUsage(events);
    const buckets = bucketize(events, from, to);
    expect(buckets.reduce((s, b) => s + b.tokensIn, 0)).toBe(sum.tokensIn);
  });
  it('before/after refuses to conclude on small samples', () => {
    const r = beforeAfter([], NOW, 86_400_000, 'x');
    expect(r.sufficient).toBe(false);
    expect(r.deltaCostPct).toBeNull();
  });
  it('the demo cache milestone lowers governor cost per task', async () => {
    const { store } = await demoStore();
    const tasks = Object.values(store.getLive().tasks).filter((t) => t.agentId === 'governor');
    const at = NOW - 20 * 86_400_000;
    const r = beforeAfter(tasks, at, 5 * 86_400_000, 'cache');
    expect(r.sufficient).toBe(true);
    expect(r.deltaCostPct!).toBeLessThan(0);
  });
  it('estimates cost from list prices', () => {
    const c = estimateCost('claude-opus-5-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 });
    expect(c.costUsd).toBeCloseTo(24);
    expect(estimateCost('unknown-model', { inputTokens: 5 }).known).toBe(false);
  });
});

describe('Claude Code importer', () => {
  it('keeps metadata only and dedupes usage by message id', () => {
    const lines = [
      { type: 'user', uuid: 'u1', timestamp: '2026-11-24T10:00:00Z', sessionId: 'sess-1', cwd: '/home/me/projet-a', message: { role: 'user', content: 'Secret prompt sk-ant-api03-SHOULDNOTLEAK' } },
      { type: 'assistant', uuid: 'a1', timestamp: '2026-11-24T10:00:05Z', sessionId: 'sess-1', cwd: '/home/me/projet-a', message: { id: 'msg_1', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'réponse privée' }], usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 } } },
      { type: 'assistant', uuid: 'a2', timestamp: '2026-11-24T10:00:06Z', sessionId: 'sess-1', cwd: '/home/me/projet-a', message: { id: 'msg_1', model: 'claude-opus-5-5', content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'cat .env' } }], usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 } } },
      { type: 'user', uuid: 'u2', timestamp: '2026-11-24T10:00:07Z', sessionId: 'sess-1', cwd: '/home/me/projet-a', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', is_error: true, content: 'boom' }] } },
    ].map((x) => JSON.stringify(x)).join('\n');
    const r = parseClaudeCodeTranscripts([{ name: 's.jsonl', text: lines }]);
    const dump = JSON.stringify(r.events);
    expect(dump).not.toContain('SHOULDNOTLEAK');
    expect(dump).not.toContain('réponse privée');
    expect(dump).not.toContain('cat .env');
    const calls = r.events.filter((e) => e.type === 'llm.call');
    expect(calls.length).toBe(1);
    expect(calls[0].metrics?.cacheReadTokens).toBe(1000);
    expect(r.events.some((e) => e.type === 'tool.call' && e.status === 'failed')).toBe(true);
    expect(r.events.every((e) => e.nature === 'real')).toBe(true);
    expect(r.catalog.departments[0].name).toBe('projet-a');
    const store = new EventStore();
    expect(store.ingest(r.events).rejected).toBe(0);
  });

  const dir = join(homedir(), '.claude/projects');
  it.skipIf(!existsSync(dir))('parses real local transcripts without rejections', () => {
    const files: Array<{ name: string; text: string }> = [];
    for (const p of readdirSync(dir)) {
      for (const f of readdirSync(join(dir, p))) if (f.endsWith('.jsonl')) files.push({ name: f, text: readFileSync(join(dir, p, f), 'utf8') });
    }
    const r = parseClaudeCodeTranscripts(files);
    const store = new EventStore();
    const rep = store.ingest(r.events);
    expect(rep.rejected).toBe(0);
    expect(r.stats.responses).toBeGreaterThan(0);
  });
});
