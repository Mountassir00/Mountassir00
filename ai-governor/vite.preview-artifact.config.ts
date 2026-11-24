/**
 * Single-file preview build (for a shareable, sandboxed preview page):
 * JS and CSS inlined, fonts from Google Fonts, no document skeleton.
 * The regular build (vite.config.ts) keeps one chunk per experience.
 */
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

function inlineAll(): Plugin {
  return {
    name: 'inline-all',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') return;
      let css = '';
      let js = '';
      for (const [name, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'asset' && name.endsWith('.css')) {
          css += String(chunk.source);
          delete bundle[name];
        } else if (chunk.type === 'chunk' && chunk.isEntry) {
          js += chunk.code.replace(/__VITE_PRELOAD__/g, "void 0");
          delete bundle[name];
        }
      }
      const fonts =
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono&display=swap">';
      html.source =
        `<title>AI Governor</title>\n<meta name="description" content="MOUNTASSIR AI GOVERNOR — supervision visuelle de l'écosystème IA (prototype, données de démonstration)">\n` +
        `${fonts}\n<style>${css.replace(/<\/style/gi, '<\\/style')}</style>\n<div id="root"></div>\n` +
        `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>\n`;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), inlineAll()],
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@engine': r('./src/engine'),
      '@sdk': r('./src/sdk/index.ts'),
      '@ds': r('./src/design-system'),
      '@fontsource-variable/archivo/wdth.css': r('./tools/empty.css'),
      '@fontsource/ibm-plex-mono/400.css': r('./tools/empty.css'),
    },
  },
  build: {
    outDir: 'dist-preview',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
