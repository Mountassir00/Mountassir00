/**
 * User preferences layer (separate from data and from experiences).
 * Persisted in localStorage, versioned, and resilient: storage may be
 * unavailable (private mode, sandbox) — the app then runs on defaults.
 */
import type { DeviceClass } from './contract';
import type { QualityPreference } from './quality';
import type { Theme } from './themes';

export interface VariantRecord {
  id: string;
  baseId: string;
  name: string;
  description: string;
  overrides: Record<string, unknown>;
  themeId?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
}

export interface Prefs {
  v: 1;
  /** Default experience, with optional per-device and per-project overrides. */
  defaultExperience: string;
  perDevice: Partial<Record<DeviceClass, string>>;
  perProject: Record<string, string>;
  lastExperience?: string;
  themeId: string | 'auto';
  quality: QualityPreference;
  reducedMotion: 'system' | 'on' | 'off';
  favorites: string[];
  hidden: string[];
  disabled: string[];
  overrides: Record<string, Record<string, unknown>>;
  variants: VariantRecord[];
  customThemes: Theme[];
  local: Record<string, Record<string, unknown>>;
  perfHud: boolean;
  role: 'owner' | 'operator' | 'observer';
  liveDemo: boolean;
  /** Desktop sidebar state. */
  navCollapsed: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  v: 1,
  defaultExperience: 'control-center',
  perDevice: {},
  perProject: {},
  themeId: 'auto',
  quality: 'auto',
  reducedMotion: 'system',
  favorites: ['control-center', 'spatial-workspace', 'kanban', 'ai-office', 'system-map'],
  hidden: [],
  disabled: [],
  overrides: {},
  variants: [],
  customThemes: [],
  local: {},
  perfHud: false,
  role: 'owner',
  liveDemo: true,
  navCollapsed: false,
};

const KEY = 'mag.prefs.v1';

export function loadPrefs(): Prefs {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_PREFS);
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    if (parsed.v !== 1) return structuredClone(DEFAULT_PREFS);
    return { ...structuredClone(DEFAULT_PREFS), ...parsed };
  } catch {
    return structuredClone(DEFAULT_PREFS);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced save — preference changes never block interaction. */
export function savePrefs(p: Prefs) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable: keep in memory */
    }
  }, 250);
}

export function deviceClass(width: number): DeviceClass {
  if (width < 720) return 'mobile';
  if (width < 1100) return 'tablet';
  return 'desktop';
}
