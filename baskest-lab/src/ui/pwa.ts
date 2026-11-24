// Application installable (PWA) : enregistrement du service worker et capture de l'invite d'installation.
// Le service worker n'existe que dans le build normal (`vite build`) servi en http(s) ; il est absent du build
// de démo en fichier unique et ignoré en file:// ou dans une enveloppe locale qui ne le prend pas en charge.

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type SwState = 'non_pris_en_charge' | 'desactive_demo' | 'desactive_protocole' | 'desactive_dev' | 'enregistrement' | 'actif' | 'erreur';

export const pwaState: { sw: SwState; swError?: string; installPrompt: InstallPromptEvent | null; installed: boolean; listeners: Set<() => void> } = {
  sw: 'non_pris_en_charge',
  installPrompt: null,
  installed: false,
  listeners: new Set(),
};

const notify = () => pwaState.listeners.forEach((l) => l());

export function setupPwa() {
  try {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      pwaState.installPrompt = e as InstallPromptEvent;
      notify();
    });
    window.addEventListener('appinstalled', () => {
      pwaState.installed = true;
      pwaState.installPrompt = null;
      notify();
    });
    if (!('serviceWorker' in navigator)) return;
    if (import.meta.env.MODE === 'demo') {
      pwaState.sw = 'desactive_demo';
      return;
    }
    if (!import.meta.env.PROD) {
      pwaState.sw = 'desactive_dev';
      return;
    }
    if (!/^https?:$/.test(location.protocol)) {
      pwaState.sw = 'desactive_protocole';
      return;
    }
    pwaState.sw = 'enregistrement';
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js', { scope: './' })
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          pwaState.sw = 'actif';
          notify();
        })
        .catch((err: unknown) => {
          pwaState.sw = 'erreur';
          pwaState.swError = err instanceof Error ? err.message : String(err);
          notify();
        });
    });
  } catch {
    /* environnement sans API navigateur complète : l'application reste utilisable */
  }
}

export function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}
