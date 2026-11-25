/**
 * Render quality levels. The interface follows the same philosophy as the
 * governor: spend resources only where they add understanding.
 */
export type QualityLevel = 'minimal' | 'eco' | 'standard' | 'high';
export type QualityPreference = QualityLevel | 'auto';

export interface QualitySettings {
  level: QualityLevel;
  /**
   * none: static · state: one-shot cues on real state changes · subtle: status
   * pictograms and active flows only · ambient: full scene motion (figures, LEDs, equipment).
   */
  motion: 'none' | 'state' | 'subtle' | 'ambient';
  fpsCap: number;
  shadows: boolean;
  textures: boolean;
  flowParticles: boolean;
  /** Animations currently suspended (tab hidden, user idle). */
  suspended: boolean;
  reducedMotion: boolean;
}

export const QUALITY_LABEL: Record<QualityLevel, string> = {
  minimal: 'Minimaliste',
  eco: 'Économique',
  standard: 'Standard',
  high: 'Haute qualité',
};

export const QUALITY_HINT: Record<QualityLevel, string> = {
  minimal: 'Aucune animation, formes simplifiées. Idéal sur batterie ou pour la lecture.',
  eco: 'Repères ponctuels sur changement d’état uniquement, aucune boucle d’animation.',
  standard: 'Pictogrammes de statut et flux actifs animés ; personnages et équipements immobiles.',
  high: 'Personnages, voyants et équipements animés, ombres, textures et flux.',
};

export function resolveQuality(pref: QualityPreference, env: { reducedMotion: boolean; saveData: boolean; lowEnd: boolean; suspended: boolean }): QualitySettings {
  const level: QualityLevel = pref !== 'auto' ? pref : env.saveData ? 'eco' : env.lowEnd ? 'eco' : 'standard';
  const base: Record<QualityLevel, Omit<QualitySettings, 'level' | 'suspended' | 'reducedMotion'>> = {
    minimal: { motion: 'none', fpsCap: 0, shadows: false, textures: false, flowParticles: false },
    eco: { motion: 'state', fpsCap: 15, shadows: false, textures: false, flowParticles: false },
    standard: { motion: 'subtle', fpsCap: 30, shadows: true, textures: false, flowParticles: true },
    high: { motion: 'ambient', fpsCap: 60, shadows: true, textures: true, flowParticles: true },
  };
  const s = { level, ...base[level], suspended: env.suspended, reducedMotion: env.reducedMotion };
  if (env.reducedMotion) {
    s.motion = s.motion === 'none' ? 'none' : 'state';
    s.flowParticles = false;
  }
  return s;
}

export function detectEnvironment(): { reducedMotion: boolean; saveData: boolean; lowEnd: boolean } {
  if (typeof window === 'undefined') return { reducedMotion: false, saveData: false, lowEnd: false };
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return {
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    saveData: nav.connection?.saveData === true,
    lowEnd: (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2,
  };
}
