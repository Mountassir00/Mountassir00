import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Relative base so the build can be served from any sub-path (preview, artifact, static host).
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@engine': r('./src/engine'),
      '@sdk': r('./src/sdk/index.ts'),
      '@ds': r('./src/design-system'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 400,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/unit/**/*.test.ts'],
  },
} as any);
