/**
 * MOUNTASSIR AI GOVERNOR — Experience SDK v1.
 *
 * The ONLY module (with the design system '@ds') an experience may import.
 * It exposes read-only data hooks and the `host` capability. A unit test
 * enforces that files under src/experiences import nothing else from the app.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { Catalog } from '@core/catalog';
import type { DataNature, GovEvent } from '@core/events/schema';
import type { GovernorState } from '@core/projection';
import type { Filters, Period } from '@core/selectors';
import type { HostApi, Selection } from '@engine/contract';
import type { QualitySettings } from '@engine/quality';

export type { ExperienceProps, HostApi, Selection, DeviceClass } from '@engine/contract';
export type { QualitySettings } from '@engine/quality';
export type { Catalog, AgentDef, DepartmentDef, SystemNode, SystemEdge, PastelSlot, EquipmentKind, AgentKind } from '@core/catalog';
export type { GovEvent, DataNature, AgentStatus, EventType, NodeKind } from '@core/events/schema';
export { STATUS_LABEL, NATURE_LABEL, AGENT_STATUSES } from '@core/events/schema';
export type { GovernorState, AgentRuntime, TaskRuntime, Decision, Incident, SkillState, ConnectorState, FeedItem, Totals } from '@core/projection';
export type { Filters, Period, PeriodPreset, FlowView, ModelRow, Bucket, UsageTotals, BeforeAfter, EventCategory } from '@core/selectors';
export {
  bucketize, byModel, recentFlows, sumUsage, beforeAfter, departmentLoad, eventDensity, natureMix, pickBucketMs, matches, categoryOf,
  PERIOD_LABEL, CATEGORY_LABEL,
} from '@core/selectors';
export type { Command, DispatchResult, Interaction } from '@core/commands';
export { PRICE_TABLE_SOURCE } from '@core/pricing';

export const SDK_VERSION = '1.0.0';

export interface SourceInfo {
  id: string;
  label: string;
  nature: DataNature;
  live: boolean;
  acceptsCommands: boolean;
  observable: string[];
  notObservable: string[];
}

/** Read-only snapshot shared by every experience. */
export interface GovernorSnapshot {
  version: number;
  mode: 'live' | 'replay';
  /** Current time of the view: wall clock in live mode, the playhead in replay. */
  now: number;
  period: Period;
  range: { from: number; to: number };
  filters: Filters;
  state: GovernorState;
  catalog: Catalog;
  selection: Selection | null;
  sources: SourceInfo[];
  /** True when at least one active source is synthetic. */
  hasDemo: boolean;
  canViewConfidential: boolean;
  /** All events (sorted, redacted). */
  allEvents: () => readonly GovEvent[];
  /** Events in the active period, filters applied (memoised by the shell). */
  rangeEvents: () => readonly GovEvent[];
  /** Events in an arbitrary window, filters applied. */
  windowEvents: (from: number, to: number) => readonly GovEvent[];
}

export const GovernorContext = createContext<GovernorSnapshot | null>(null);
export const HostContext = createContext<HostApi | null>(null);
export const QualityContext = createContext<QualitySettings | null>(null);

export interface ClockLike {
  subscribe(fn: (t: number, dt: number) => void): () => void;
}
export const ClockContext = createContext<ClockLike | null>(null);

export function useGovernor(): GovernorSnapshot {
  const v = useContext(GovernorContext);
  if (!v) throw new Error('useGovernor doit être utilisé dans une expérience montée par le shell.');
  return v;
}

export function useHost(): HostApi {
  const v = useContext(HostContext);
  if (!v) throw new Error('useHost doit être utilisé dans une expérience montée par le shell.');
  return v;
}

export function useQuality(): QualitySettings {
  const v = useContext(QualityContext);
  if (!v) throw new Error('useQuality hors contexte.');
  return v;
}

/** Subscribes to the shared, fps-capped animation clock (auto-paused when idle/hidden). */
export function useAnimationFrame(cb: (t: number, dt: number) => void, enabled = true) {
  const clock = useContext(ClockContext);
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!clock || !enabled) return;
    return clock.subscribe((t, dt) => ref.current(t, dt));
  }, [clock, enabled]);
}

/** Lookup helpers built once per catalog. */
export function useCatalogIndex() {
  const { catalog } = useGovernor();
  return useMemo(() => {
    const agents = new Map(catalog.agents.map((a) => [a.id, a]));
    const departments = new Map(catalog.departments.map((d) => [d.id, d]));
    const nodes = new Map(catalog.nodes.map((n) => [n.id, n]));
    return { agents, departments, nodes };
  }, [catalog]);
}

/** Masks summaries the viewer is not allowed to read. */
export function displaySummary(e: Pick<GovEvent, 'summary' | 'confidentiality'>, canViewConfidential: boolean): string {
  if ((e.confidentiality === 'restricted' || e.confidentiality === 'confidential') && !canViewConfidential) return 'Détails confidentiels masqués';
  return e.summary ?? '';
}

/** Media query hook (used for reduced motion, pointer type, etc.). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/* ---------- formatting shared by experiences ---------- */

const nf = new Intl.NumberFormat('fr-FR');
export function fmtInt(n: number) {
  return nf.format(Math.round(n));
}
export function fmtCompact(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(1).replace('.', ',')} Md`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',')} M`;
  if (a >= 1e4) return `${Math.round(n / 1e3)} k`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1).replace('.', ',')} k`;
  return nf.format(Math.round(n));
}
export function fmtUsd(n: number, digits = n < 10 ? 2 : 0) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}
export function fmtPct(x: number, digits = 0) {
  return `${(x * 100).toFixed(digits).replace('.', ',')} %`;
}
export function fmtDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${String(m % 60).padStart(2, '0')}`;
  return `${Math.round(h / 24)} j`;
}
export function fmtTime(ts: number, withDate = false) {
  return new Intl.DateTimeFormat('fr-FR', withDate ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ts);
}
export function fmtRelative(ts: number, now: number) {
  const d = Math.max(0, now - ts);
  if (d < 45_000) return 'à l’instant';
  if (d < 3_600_000) return `il y a ${Math.round(d / 60_000)} min`;
  if (d < 86_400_000) return `il y a ${Math.round(d / 3_600_000)} h`;
  return `il y a ${Math.round(d / 86_400_000)} j`;
}
export function modelLabel(id?: string) {
  if (!id) return '—';
  return id.replace(/^claude-/, '').replace(/-(\d)-(\d)$/, ' $1.$2').replace(/-(\d)$/, ' $1').replace(/^./, (c) => c.toUpperCase());
}
