/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse du projet Supabase (production). */
  readonly VITE_SUPABASE_URL?: string;
  /** Clé publique (anon) du projet Supabase : elle peut figurer dans l'application. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Serveur local de développement (scripts/serveur-local.ts), par exemple http://localhost:54330. */
  readonly VITE_SERVEUR_LOCAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
