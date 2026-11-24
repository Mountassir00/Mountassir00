/**
 * Built-in experiences. Each folder declares its own definitions in
 * `manifest.ts` (manifest data + lazy loader). Vite splits every renderer
 * into its own chunk and only the active one is downloaded. Adding an
 * experience = adding a folder and one import below; nothing in core/,
 * engine/ or shell/ changes (see docs/CREATING_AN_EXPERIENCE.md).
 */
import type { ExperienceDefinition } from '@engine/manifest';
import { definitions as d0 } from './control-center/manifest';
import { definitions as d1 } from './ai-office/manifest';
import { definitions as d2 } from './system-map/manifest';
import { definitions as d3 } from './modular-office/manifest';
import { definitions as d4 } from './ledger/manifest';
import { definitions as d5 } from './spatial-workspace/manifest';
import { definitions as d6 } from './office-3d/manifest';
import { definitions as d7 } from './kanban/manifest';
import { definitions as d8 } from './whiteboard/manifest';
import { definitions as d9 } from './spatial-editor/manifest';
import { definitions as d10 } from './tower/manifest';
import { definitions as d11 } from './vision/manifest';
import { definitions as d12 } from './loop/manifest';
import { definitions as d13 } from './brief/manifest';
import { definitions as d14 } from './constellation/manifest';
import { definitions as d15 } from './assistant/manifest';
import { definitions as d16 } from './hq-3d/manifest';
import { definitions as d17 } from './agents-board/manifest';
import { definitions as d18 } from './inbox/manifest';

export const BUILTIN_EXPERIENCES: ExperienceDefinition[] = [
  ...d0,
  ...d1,
  ...d2,
  ...d3,
  ...d4,
  ...d5,
  ...d6,
  ...d7,
  ...d8,
  ...d9,
  ...d10,
  ...d11,
  ...d12,
  ...d13,
  ...d14,
  ...d15,
  ...d16,
  ...d17,
  ...d18,
];
