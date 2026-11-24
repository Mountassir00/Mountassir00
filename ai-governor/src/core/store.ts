/**
 * EventStore — append-mostly, sorted event log + live projection.
 *
 * - Validates and redacts every incoming event (one entry point, no bypass).
 * - Applies in-order events incrementally; out-of-order batches trigger a rebuild.
 * - Notifies listeners once per microtask (batched), so a burst of events
 *   causes one render, not hundreds.
 * - `projectAt(t)` serves Replay with checkpoints + a forward cursor cache.
 */
import { EMPTY_CATALOG, mergeCatalogs, type Catalog } from './catalog';
import { validateEvent, type GovEvent } from './events/schema';
import { applyEvent, cloneState, emptyState, type GovernorState } from './projection';
import { redactDeep } from './security/redact';

const CHECKPOINT_EVERY = 1500;

export interface IngestReport {
  accepted: number;
  duplicates: number;
  rejected: number;
  errors: string[];
}

type Listener = () => void;

export class EventStore {
  private events: GovEvent[] = [];
  private ids = new Set<string>();
  private live: GovernorState = emptyState();
  private checkpoints: Array<{ index: number; state: GovernorState }> = [];
  private catalogs = new Map<string, Catalog>();
  private mergedCatalog: Catalog = EMPTY_CATALOG;
  private listeners = new Set<Listener>();
  private pending = false;
  private replayCache: { index: number; state: GovernorState } | null = null;
  /** Increments on every change; React hooks subscribe to it. */
  version = 0;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.version++;
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      for (const l of this.listeners) l();
    });
  }

  getVersion = () => this.version;

  setCatalog(sourceId: string, catalog: Catalog) {
    this.catalogs.set(sourceId, catalog);
    this.mergedCatalog = [...this.catalogs.values()].reduce(mergeCatalogs, EMPTY_CATALOG);
    this.notify();
  }

  getCatalog(): Catalog {
    return this.mergedCatalog;
  }

  getEvents(): readonly GovEvent[] {
    return this.events;
  }

  getLive(): GovernorState {
    return this.live;
  }

  firstTs(): number {
    return this.events[0]?.ts ?? Date.now();
  }

  lastTs(): number {
    return this.events[this.events.length - 1]?.ts ?? Date.now();
  }

  /** Single entry point for data. Unknown/invalid shapes are rejected, strings redacted. */
  ingest(input: readonly unknown[]): IngestReport {
    const report: IngestReport = { accepted: 0, duplicates: 0, rejected: 0, errors: [] };
    const fresh: GovEvent[] = [];
    for (const raw of input) {
      const r = validateEvent(redactDeep(raw));
      if (!r.ok) {
        report.rejected++;
        if (report.errors.length < 5) report.errors.push(r.error);
        continue;
      }
      if (this.ids.has(r.event.id)) {
        report.duplicates++;
        continue;
      }
      this.ids.add(r.event.id);
      fresh.push(r.event);
    }
    if (!fresh.length) return report;
    report.accepted = fresh.length;
    fresh.sort((a, b) => a.ts - b.ts);
    const last = this.lastTs();
    const inOrder = this.events.length === 0 || fresh[0].ts >= last;
    if (inOrder) {
      for (const e of fresh) {
        this.events.push(e);
        applyEvent(this.live, e);
        if (this.events.length % CHECKPOINT_EVERY === 0) {
          this.checkpoints.push({ index: this.events.length, state: cloneState(this.live) });
        }
      }
    } else {
      this.events = mergeSorted(this.events, fresh);
      this.rebuild();
    }
    this.replayCache = null;
    this.notify();
    return report;
  }

  /** Removes all events of a source (e.g. the user unloads an import). */
  removeSource(sourceId: string) {
    const before = this.events.length;
    this.events = this.events.filter((e) => e.sourceId !== sourceId);
    this.ids = new Set(this.events.map((e) => e.id));
    this.catalogs.delete(sourceId);
    this.mergedCatalog = [...this.catalogs.values()].reduce(mergeCatalogs, EMPTY_CATALOG);
    if (this.events.length !== before) this.rebuild();
    this.replayCache = null;
    this.notify();
  }

  private rebuild() {
    this.live = emptyState();
    this.checkpoints = [];
    for (let i = 0; i < this.events.length; i++) {
      applyEvent(this.live, this.events[i]);
      if ((i + 1) % CHECKPOINT_EVERY === 0) this.checkpoints.push({ index: i + 1, state: cloneState(this.live) });
    }
  }

  /** Number of events with ts <= t (binary search). */
  indexAt(t: number): number {
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.events[mid].ts <= t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * State of the system as it was at time t. Read-only usage expected.
   * Forward scrubbing (playback) reuses the previous replay state incrementally.
   */
  projectAt(t: number): GovernorState {
    const idx = this.indexAt(t);
    if (idx >= this.events.length) {
      const s = this.live;
      return { ...s, asOf: Math.max(t, s.asOf) };
    }
    let base: { index: number; state: GovernorState };
    if (this.replayCache && this.replayCache.index <= idx && idx - this.replayCache.index < CHECKPOINT_EVERY) {
      base = this.replayCache;
    } else {
      let cp: { index: number; state: GovernorState } | undefined;
      for (let i = this.checkpoints.length - 1; i >= 0; i--) {
        if (this.checkpoints[i].index <= idx) {
          cp = this.checkpoints[i];
          break;
        }
      }
      base = cp ? { index: cp.index, state: cloneState(cp.state) } : { index: 0, state: emptyState() };
    }
    for (let i = base.index; i < idx; i++) applyEvent(base.state, this.events[i]);
    base.index = idx;
    base.state.asOf = t;
    this.replayCache = base;
    return { ...base.state };
  }

  /** Events within [from, to], via binary search (no full scan). */
  range(from: number, to: number): GovEvent[] {
    const a = this.indexAt(from - 1);
    const b = this.indexAt(to);
    return this.events.slice(a, b);
  }
}

function mergeSorted(a: GovEvent[], b: GovEvent[]): GovEvent[] {
  const out: GovEvent[] = new Array(a.length + b.length);
  let i = 0;
  let j = 0;
  let k = 0;
  while (i < a.length && j < b.length) out[k++] = a[i].ts <= b[j].ts ? a[i++] : b[j++];
  while (i < a.length) out[k++] = a[i++];
  while (j < b.length) out[k++] = b[j++];
  return out;
}
