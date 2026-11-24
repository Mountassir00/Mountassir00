/**
 * Builds the read-only GovernorSnapshot and the HostApi given to experiences.
 */
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ROLE_PERMISSIONS, type Command, type DispatchResult, type Interaction } from '@core/commands';
import { PERIOD_MS, resolveRange } from '@core/selectors';
import type { HostApi } from '@engine/contract';
import type { QualitySettings } from '@engine/quality';
import { ClockContext, HostContext, QualityContext, type GovernorSnapshot } from '@sdk';
import type { AnimationClock } from '@engine/runtime';
import type { GovernorRuntime } from './runtime';
import { announce, setPrefs, toast, ui, useUi } from './uiStore';

export const RuntimeContext = createContext<GovernorRuntime | null>(null);
export function useRuntime() {
  const r = useContext(RuntimeContext);
  if (!r) throw new Error('Runtime absent');
  return r;
}

export function useStoreVersion(rt: GovernorRuntime) {
  return useSyncExternalStore(rt.store.subscribe.bind(rt.store), rt.store.getVersion, rt.store.getVersion);
}

/** Wall clock that ticks coarsely (5 s) in live mode — never per frame. */
function useLiveNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    }, 5000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

export function useSnapshot(): GovernorSnapshot {
  const rt = useRuntime();
  const version = useStoreVersion(rt);
  const time = useUi((s) => s.time);
  const period = useUi((s) => s.period);
  const filters = useUi((s) => s.filters);
  const selection = useUi((s) => s.selection);
  const role = useUi((s) => s.prefs.role);
  const wall = useLiveNow(time.mode === 'live');
  const liveNow = Math.max(wall, version ? rt.store.lastTs() : 0);
  const now = time.mode === 'live' ? liveNow : time.t;

  return useMemo<GovernorSnapshot>(() => {
    const span = period.preset === 'custom' ? (period.to ?? now) - (period.from ?? now - PERIOD_MS['24h']) : PERIOD_MS[period.preset];
    const range = time.mode === 'live' ? resolveRange(period, now) : { from: now - span, to: now };
    const state = time.mode === 'live' ? rt.store.getLive() : rt.store.projectAt(now);
    const sources = rt.sourceInfos();
    return {
      version,
      mode: time.mode,
      now,
      period,
      range,
      filters,
      state,
      catalog: rt.store.getCatalog(),
      selection,
      sources,
      hasDemo: sources.some((s) => s.nature === 'demo'),
      canViewConfidential: ROLE_PERMISSIONS[role].includes('view.confidential'),
      allEvents: () => rt.store.getEvents(),
      rangeEvents: () => rt.windowEvents(range.from, range.to, filters),
      windowEvents: (from, to) => rt.windowEvents(from, to, filters),
    };
  }, [rt, version, time.mode, now, period, filters, selection, role]);
}

/** Runs a command through the gateway, asking for confirmation when required. */
export async function requestCommand(rt: GovernorRuntime, cmd: Command, interaction: Interaction): Promise<DispatchResult> {
  const s = ui.get();
  const base = { role: s.prefs.role, mode: s.time.mode, interaction } as const;
  let { result } = rt.check(cmd, base);
  if (result.status === 'needs-confirmation') {
    const pending = result;
    const answer = await new Promise<{ acknowledged: boolean; typed?: string } | null>((resolve) => {
      ui.set({ confirm: { id: Date.now(), cmd, policy: pending.policy, expectedTyped: pending.expectedTyped, context: describe(cmd), resolve } });
    });
    ui.set({ confirm: null });
    if (!answer) {
      toast('Action annulée : rien n’a été modifié.', 'info');
      return { status: 'denied', policy: pending.policy, reason: 'Annulé par l’utilisateur' };
    }
    result = await rt.execute(cmd, { ...base, confirmation: answer });
  } else if (result.status === 'executed') {
    result = await rt.execute(cmd, base);
  }
  if (result.status === 'executed') {
    toast(`${result.policy.label} : fait.`);
    announce(`${result.policy.label} effectué`);
  } else if (result.status === 'denied') toast(result.reason, 'denied');
  else toast('Confirmation incomplète : action non exécutée.', 'denied');
  return result;
}

function describe(cmd: Command): string {
  switch (cmd.type) {
    case 'task.pause':
      return 'La tâche sera suspendue. Ses étapes restantes attendront votre reprise.';
    case 'task.resume':
      return 'La tâche reprendra là où elle s’est arrêtée et pourra de nouveau consommer des tokens.';
    case 'task.priority':
      return `La priorité passera à « ${cmd.priority} ».`;
    case 'task.rerun':
      return `Une nouvelle exécution sera lancée${cmd.estimatedCostUsd ? ` (coût estimé ≈ ${cmd.estimatedCostUsd.toFixed(2)} $)` : ''}. Elle consommera des tokens.`;
    case 'decision.resolve':
      return cmd.durable
        ? 'Cette décision modifie durablement vos instructions. Elle sera journalisée et réversible uniquement par une nouvelle décision.'
        : cmd.verdict === 'test'
          ? 'La proposition sera appliquée en test, sur un périmètre limité.'
          : cmd.verdict === 'go'
            ? 'La proposition sera appliquée.'
            : 'La proposition sera refusée et archivée.';
    case 'instructions.modify':
      return `Modification durable : ${cmd.summary}`;
  }
}

export function ExperienceProviders({ children, experienceId, quality, clock }: { children: ReactNode; experienceId: string; quality: QualitySettings; clock: AnimationClock }) {
  const rt = useRuntime();
  const host = useMemo<HostApi>(
    () => ({
      select(sel) {
        ui.set({ selection: sel, drawer: sel ? (sel.kind === 'decision' ? 'decisions' : 'inspector') : ui.get().drawer === 'inspector' ? null : ui.get().drawer });
      },
      request: (cmd, interaction) => requestCommand(rt, cmd, interaction),
      openDecisions() {
        ui.set({ drawer: 'decisions' });
      },
      getLocal<T>(key: string, fallback: T): T {
        const v = ui.get().prefs.local[experienceId]?.[key];
        return v === undefined ? fallback : (v as T);
      },
      setLocal(key, value) {
        setPrefs((p) => ({ ...p, local: { ...p.local, [experienceId]: { ...(p.local[experienceId] ?? {}), [key]: value } } }));
      },
      announce,
      navigate(target) {
        ui.set({ route: target });
      },
      setPeriod(preset) {
        ui.set((s) => ({ period: { preset }, time: s.time.mode === 'replay' ? { ...s.time, domain: null } : s.time }));
      },
      startReplay() {
        const s = ui.get();
        const to = rt.store.lastTs();
        const span = s.period.preset === 'custom' ? (s.period.to ?? to) - (s.period.from ?? to - PERIOD_MS['24h']) : PERIOD_MS[s.period.preset];
        ui.set({ time: { ...s.time, mode: 'replay', t: to - span, playing: true, domain: { from: to - span, to } } });
      },
      openFilters() {
        ui.set({ filtersOpen: true });
      },
      openSearch() {
        ui.set({ searchOpen: true });
      },
      getShared<T>(key: string, fallback: T): T {
        const v = ui.get().prefs.local.__shared?.[key];
        return v === undefined ? fallback : (v as T);
      },
      setShared(key, value) {
        setPrefs((p) => ({ ...p, local: { ...p.local, __shared: { ...(p.local.__shared ?? {}), [key]: value } } }));
      },
      provideCommands(commands) {
        const tagged = commands.map((c) => ({ ...c, id: `${experienceId}:${c.id}` }));
        ui.set((s) => ({ viewCommands: [...s.viewCommands.filter((c) => !c.id.startsWith(`${experienceId}:`)), ...tagged] }));
        return () => ui.set((s) => ({ viewCommands: s.viewCommands.filter((c) => !tagged.some((t) => t.id === c.id)) }));
      },
    }),
    [rt, experienceId],
  );
  return (
    <HostContext.Provider value={host}>
      <QualityContext.Provider value={quality}>
        <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>
      </QualityContext.Provider>
    </HostContext.Provider>
  );
}
