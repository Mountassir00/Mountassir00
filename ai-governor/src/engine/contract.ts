/**
 * The contract between the shell and an experience.
 * Experiences receive a `host` capability object and read data through SDK
 * hooks. They cannot reach the store, the data sources or the operations
 * backend directly — every change goes through `host.request()`.
 */
import type { Command, DispatchResult, Interaction } from '@core/commands';
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
}

export interface ExperienceProps {
  host: HostApi;
  /** Manifest defaults merged with the user's/variant's overrides. */
  config: Record<string, unknown>;
  quality: QualitySettings;
  device: DeviceClass;
  manifest: ExperienceManifest;
}
