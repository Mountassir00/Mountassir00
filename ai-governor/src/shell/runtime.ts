/**
 * GovernorRuntime — lives outside React. It owns the event store, the data
 * sources and command dispatch. Experiences come and go; this object (and
 * every task it tracks) keeps running, so switching views never interrupts
 * work, loses data, or triggers any model call.
 */
import { authorize, type Command, type DispatchResult, type Interaction, type Role } from '@core/commands';
import type { GovEvent } from '@core/events/schema';
import { filterEvents, type Filters } from '@core/selectors';
import { EventStore } from '@core/store';
import type { DataSource } from '@core/sources/types';
import type { SourceInfo } from '@sdk';

export class GovernorRuntime {
  readonly store = new EventStore();
  private sources = new Map<string, DataSource>();
  private live = new Map<string, () => void>();
  /** Small LRU: views often read 2–3 windows (current, previous, timeline) per render. */
  private cache: Array<{ key: string; events: readonly GovEvent[] }> = [];
  /** Count of LLM calls initiated by the presentation layer. Must stay 0. */
  readonly uiInitiatedModelCalls = 0;

  async addSource(src: DataSource, opts: { live?: boolean } = {}) {
    if (this.sources.has(src.id)) this.removeSource(src.id);
    this.sources.set(src.id, src);
    this.store.setCatalog(src.id, src.catalog());
    const events = await src.load(Date.now());
    const report = this.store.ingest(events);
    if (opts.live !== false) this.setLive(src.id, true);
    return report;
  }

  removeSource(id: string) {
    this.setLive(id, false);
    this.sources.delete(id);
    this.store.removeSource(id);
  }

  setLive(id: string, on: boolean) {
    const src = this.sources.get(id);
    const cur = this.live.get(id);
    if (!on && cur) {
      cur();
      this.live.delete(id);
    }
    if (on && !cur && src?.subscribe && src.capabilities.live) {
      this.live.set(id, src.subscribe((events) => this.store.ingest(events)));
    }
  }

  isLive(id: string) {
    return this.live.has(id);
  }

  hasSource(id: string) {
    return this.sources.has(id);
  }

  sourceInfos(): SourceInfo[] {
    return [...this.sources.values()].map((s) => ({
      id: s.id,
      label: s.label,
      nature: s.defaultNature,
      live: this.live.has(s.id),
      acceptsCommands: s.capabilities.commands && !!s.operations,
      observable: s.visibility.observable,
      notObservable: s.visibility.notObservable,
    }));
  }

  /** Source that produced an entity (task/decision), to route a command to it. */
  sourceFor(cmd: Command): DataSource | undefined {
    const events = this.store.getEvents();
    const match = (e: GovEvent) =>
      'taskId' in cmd ? e.taskId === cmd.taskId : 'decisionId' in cmd ? e.attrs?.decisionId === cmd.decisionId : false;
    for (let i = events.length - 1; i >= 0; i--) if (match(events[i])) return this.sources.get(events[i].sourceId);
    if (cmd.type === 'instructions.modify') return [...this.sources.values()].find((s) => s.operations);
    return undefined;
  }

  check(cmd: Command, ctx: { role: Role; mode: 'live' | 'replay'; interaction: Interaction; confirmation?: { acknowledged: boolean; typed?: string } }): { result: DispatchResult; source?: DataSource } {
    const source = this.sourceFor(cmd);
    const result = authorize(cmd, {
      ...ctx,
      sourceAcceptsCommands: !!source?.capabilities.commands && !!source.operations,
      sourceLabel: source?.label ?? 'inconnue',
    });
    return { result, source };
  }

  async execute(cmd: Command, ctx: Parameters<GovernorRuntime['check']>[1]): Promise<DispatchResult> {
    const { result, source } = this.check(cmd, ctx);
    if (result.status !== 'executed' || !source?.operations) return result;
    const events = await source.operations.execute(cmd, Date.now());
    this.store.ingest(events);
    return result;
  }

  /** Filtered events of a window, memoised on (store version, window, filters). */
  windowEvents(from: number, to: number, filters: Filters): readonly GovEvent[] {
    const key = `${this.store.version}|${from}|${to}|${JSON.stringify(filters)}`;
    const hit = this.cache.find((c) => c.key === key);
    if (hit) return hit.events;
    const events = filterEvents(this.store.range(from, to), filters);
    this.cache = [{ key, events }, ...this.cache].slice(0, 6);
    return events;
  }

  dispose() {
    for (const off of this.live.values()) off();
    this.live.clear();
  }
}
