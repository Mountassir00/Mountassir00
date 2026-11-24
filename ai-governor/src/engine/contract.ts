/**
 * The contract between the shell and an experience.
 * Experiences receive a `host` capability object and read data through SDK
 * hooks. They cannot reach the store, the data sources or the operations
 * backend directly — every change goes through `host.request()`.
 */
import type { Command, DispatchResult, Interaction } from '@core/commands';
import type { PeriodPreset } from '@core/selectors';
import type { ExperienceManifest } from './manifest';
import type { QualitySettings } from './quality';

export type SelectionKind = 'agent' | 'department' | 'node' | 'flow' | 'task' | 'decision';

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export type DeviceClass = 'desktop' | 'tablet' | 'mobile';

export interface HostApi {
  /** Shared selection: drives the Inspector and survives view switches. */
  select(sel: Selection | null): void;
  /** Ask for a change. Goes through permissions, mode checks and confirmation. */
  request(cmd: Command, interaction: Interaction): Promise<DispatchResult>;
  openDecisions(): void;
  /** Experience-scoped persisted preferences (e.g. a custom department layout). */
  getLocal<T>(key: string, fallback: T): T;
  setLocal<T>(key: string, value: T): void;
  /** Polite screen-reader announcement. */
  announce(message: string): void;
  /* UI navigation only — never an operational change, never a model call. */
  navigate(target: 'sources' | 'gallery' | 'studio' | 'builder' | 'settings'): void;
  setPeriod(preset: Exclude<PeriodPreset, 'custom'>): void;
  /** Replays the current period from its start (read-only). */
  startReplay(): void;
  openFilters(): void;
  openSearch(): void;
  /**
   * Presentation data shared between views (e.g. the spatial layout edited in
   * the spatial editor and shown by the 3D views). Never operational data.
   */
  getShared<T>(key: string, fallback: T): T;
  setShared<T>(key: string, value: T): void;
  /** Adds view-specific entries to the command palette (Ctrl+K). Returns a remover. */
  provideCommands(commands: ViewCommand[]): () => void;
}

export interface ViewCommand {
  id: string;
  label: string;
  hint?: string;
  /** Short keyword shown on the right, e.g. "grid:snap". */
  keyword?: string;
  run: () => void;
}

export interface ExperienceProps {
  host: HostApi;
  /** Manifest defaults merged with the user's/variant's overrides. */
  config: Record<string, unknown>;
  quality: QualitySettings;
  device: DeviceClass;
  manifest: ExperienceManifest;
}
