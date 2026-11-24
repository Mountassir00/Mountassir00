/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase (ex. https://abcd.supabase.co). Absente : mode local. */
  readonly VITE_SUPABASE_URL?: string;
  /** Clé publique (anon / publishable) du projet. Jamais la clé de service. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
