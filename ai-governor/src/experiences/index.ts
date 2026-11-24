/**
 * Built-in experiences, discovered automatically: every folder that contains a
 * `manifest.ts` exporting `definitions` is installed. Vite splits each renderer
 * into its own chunk and only the active one is downloaded.
 *
 * Add a view   = add a folder with `manifest.ts` (see docs/CREATING_AN_EXPERIENCE.md).
 * Remove a view = delete its folder (or just disable it in the Gallery).
 * Nothing in core/, engine/ or shell/ changes either way.
 */
import type { ExperienceDefinition } from '@engine/manifest';

const modules = import.meta.glob<{ definitions: ExperienceDefinition[] }>('./*/manifest.ts', { eager: true });

/** Preferred order (registry order, Gallery order). Unknown folders follow alphabetically. */
const ORDER = [
  'control-center', 'ai-office', 'system-map', 'modular-office', 'ledger',
  'spatial-workspace', 'kanban', 'whiteboard', 'agents-board', 'inbox',
  'office-3d', 'hq-3d', 'tower', 'spatial-editor', 'vision',
  'loop', 'brief', 'constellation', 'assistant',
];
const folderOf = (path: string) => path.split('/')[1];
const rank = (path: string) => {
  const i = ORDER.indexOf(folderOf(path));
  return i === -1 ? ORDER.length : i;
};

export const BUILTIN_EXPERIENCES: ExperienceDefinition[] = Object.keys(modules)
  .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  .flatMap((path) => modules[path].definitions ?? []);
