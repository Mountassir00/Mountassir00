// EVENT LAB v0.4 — couche de données hors ligne d'abord (code pur, testé par Vitest).
// L'implémentation Supabase (remote-supabase.ts, account-supabase.ts) n'est chargée par
// l'interface que si un serveur est configuré (src/ui/backend.ts).
export * from './types';
export * from './util';
export * from './local-repository';
export * from './sync-engine';
export * from './migrate-v03';
export * from './copy';
