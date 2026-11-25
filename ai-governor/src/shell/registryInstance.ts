import { ExperienceRegistry } from '@engine/registry';
import { BUILTIN_EXPERIENCES } from '../experiences';

/** The app-wide registry; built-ins are registered once at startup. */
export const registry = new ExperienceRegistry();
for (const def of BUILTIN_EXPERIENCES) registry.register(def, 'builtin');
