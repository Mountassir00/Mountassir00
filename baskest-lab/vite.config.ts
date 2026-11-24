import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

// Données EVENT LAB importées depuis ../event-lab (source unique, aucune copie).
const eventLab = fileURLToPath(new URL('../event-lab', import.meta.url));

/** Build de démo en fichier unique : retire les liens vers des fichiers annexes (icône iOS) qui n'existeraient pas. */
const stripPwaLinks = (): Plugin => ({
  name: 'eventlab-strip-pwa-links',
  transformIndexHtml: (html) => html.replace(/<!-- pwa:start[\s\S]*?<!-- pwa:end -->\s*/, ''),
});

// Application installable (PWA) : manifeste + service worker (cache hors ligne), uniquement pour le build normal.
const pwa = VitePWA({
  registerType: 'autoUpdate',
  injectRegister: false, // enregistrement explicite dans src/ui/main.tsx (http/https uniquement)
  includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
  manifest: {
    id: './',
    name: 'EVENT LAB',
    short_name: 'EVENT LAB',
    description: 'Laboratoire d’innovation événementielle : espace Basket (Bask’Est) et espace multisectoriel.',
    lang: 'fr',
    dir: 'ltr',
    start_url: './#/accueil',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#0b1a33',
    background_color: '#0b1a33',
    categories: ['productivity', 'business'],
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
    navigateFallback: 'index.html',
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // Polices Google facultatives : mises en cache à la première visite, l'interface fonctionne sans elles.
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: { cacheName: 'polices', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
      },
    ],
  },
});

// `npm run build:demo` produit un fichier HTML unique (démo partageable hors serveur, sans service worker).
export default defineConfig(({ mode }) => ({
  // Chemins relatifs : l'application fonctionne servie depuis un sous-dossier ou une enveloppe locale (WebView).
  base: './',
  plugins: mode === 'demo' ? [react(), viteSingleFile(), stripPwaLinks()] : [react(), pwa],
  publicDir: mode === 'demo' ? false : 'public',
  server: { fs: { allow: ['.', eventLab] } },
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist', chunkSizeWarningLimit: 4000 },
  test: { globals: true, include: ['tests/**/*.test.ts'] },
}));
