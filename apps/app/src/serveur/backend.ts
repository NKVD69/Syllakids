/**
 * Accès au serveur. Deux possibilités, choisies à la compilation :
 * - Supabase (production) : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ;
 * - serveur local de développement (même base SQL sur PGlite) : VITE_SERVEUR_LOCAL=http://localhost:54330.
 * Sans configuration, l'application fonctionne seule sur l'appareil, sans compte ni synchronisation.
 */

export interface Session {
  uid: string;
  email: string;
}

export class ErreurServeur extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

export interface Backend {
  type: "supabase" | "local";
  session(): Promise<Session | null>;
  /** Inscription ; `confirmation` vaut vrai quand un e-mail de confirmation a été envoyé. */
  inscrire(email: string, motDePasse: string): Promise<{ session: Session | null; confirmation: boolean }>;
  connecter(email: string, motDePasse: string): Promise<Session>;
  deconnecter(): Promise<void>;
  /** Envoie un e-mail pour choisir un nouveau mot de passe. */
  oubli(email: string): Promise<void>;
  /** Appelle une fonction SQL (voir supabase/migrations). */
  appeler(fonction: string, args?: Record<string, unknown>): Promise<unknown>;
  /** Prévient quand la session change (connexion, déconnexion, expiration). */
  surSession(rappel: (s: Session | null) => void): () => void;
}

let instance: Promise<Backend | null> | null = null;

export function backend(): Promise<Backend | null> {
  instance ??= (async () => {
    const env = import.meta.env;
    if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
      const { backendSupabase } = await import("./supabase");
      return backendSupabase(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    }
    if (env.VITE_SERVEUR_LOCAL) {
      const { backendLocal } = await import("./local");
      return backendLocal(env.VITE_SERVEUR_LOCAL);
    }
    return null;
  })();
  return instance;
}

/** Messages compréhensibles pour un parent ou un enseignant. */
export function messageErreur(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError|fetch failed|Load failed/i.test(m)) return "Pas de connexion à internet. Vos changements seront envoyés plus tard.";
  if (/Invalid login credentials|identifiants/i.test(m)) return "Adresse e-mail ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(m)) return "Confirmez d'abord votre adresse e-mail grâce au lien reçu.";
  if (/already registered|déjà utilisée/i.test(m)) return "Un compte existe déjà avec cette adresse e-mail.";
  if (/Password should|mot de passe trop court/i.test(m)) return "Le mot de passe doit contenir au moins 10 caractères.";
  return m;
}
