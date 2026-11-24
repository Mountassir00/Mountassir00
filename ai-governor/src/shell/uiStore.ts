/**
 * Shell UI state (navigation context, selection, time cursor, dialogs).
 * Kept outside experiences so it survives every view switch: period,
 * filters, selection, department, pending confirmations, replay position.
 */
import { useSyncExternalStore } from 'react';
import type { Command, CommandPolicy } from '@core/commands';
import { EMPTY_FILTERS, type Filters, type Period } from '@core/selectors';
import type { DeviceClass, Selection } from '@engine/contract';
import { deviceClass, loadPrefs, savePrefs, type Prefs } from '@engine/prefs';

export type Route = 'stage' | 'gallery' | 'studio' | 'builder' | 'sources' | 'settings';

export interface TimeState {
  mode: 'live' | 'replay';
  t: number;
  playing: boolean;
  /** Simulated ms per real ms. */
  speed: number;
  /** Frozen timeline domain while replaying. */
  domain: { from: number; to: number } | null;
}

export interface PendingConfirm {
  id: number;
  cmd: Command;
  policy: CommandPolicy;
  expectedTyped?: string;
  context: string;
  resolve: (r: { acknowledged: boolean; typed?: string } | null) => void;
}

export interface Toast {
  id: number;
  tone: 'ok' | 'denied' | 'info';
  text: string;
}

export interface UiState {
  prefs: Prefs;
  route: Route;
  active: string;
  selection: Selection | null;
  drawer: 'inspector' | 'decisions' | null;
  filtersOpen: boolean;
  searchOpen: boolean;
  period: Period;
  filters: Filters;
  time: TimeState;
  confirm: PendingConfirm | null;
  toasts: Toast[];
  presentation: boolean;
  device: DeviceClass;
  studioTarget: string | null;
  announce: string;
}

type Listener = () => void;

function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(patch: Partial<T> | ((s: T) => Partial<T>)) {
      const p = typeof patch === 'function' ? (patch as (s: T) => Partial<T>)(state) : patch;
      state = { ...state, ...p };
      for (const l of listeners) l();
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

const prefs = loadPrefs();

export const ui = createStore<UiState>({
  prefs,
  route: 'stage',
  active: prefs.lastExperience ?? prefs.defaultExperience,
  selection: null,
  drawer: null,
  filtersOpen: false,
  searchOpen: false,
  period: { preset: '24h' },
  filters: EMPTY_FILTERS,
  time: { mode: 'live', t: Date.now(), playing: false, speed: 600, domain: null },
  confirm: null,
  toasts: [],
  presentation: false,
  device: typeof window !== 'undefined' ? deviceClass(window.innerWidth) : 'desktop',
  studioTarget: null,
  announce: '',
});

export function useUi<S>(selector: (s: UiState) => S): S {
  return useSyncExternalStore(ui.subscribe, () => selector(ui.get()), () => selector(ui.get()));
}

export function setPrefs(update: (p: Prefs) => Prefs) {
  const next = update(ui.get().prefs);
  ui.set({ prefs: next });
  savePrefs(next);
}

let toastId = 0;
export function toast(text: string, tone: Toast['tone'] = 'ok') {
  const id = ++toastId;
  ui.set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tone, text }] }));
  setTimeout(() => ui.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), tone === 'denied' ? 6000 : 3500);
}

export function announce(text: string) {
  ui.set({ announce: text });
}
