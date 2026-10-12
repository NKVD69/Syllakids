/**
 * Client du serveur local de développement (scripts/serveur-local.ts) :
 * même base SQL que Supabase, sans compte Supabase. Pour essayer l'application et pour les tests.
 */
import { ErreurServeur, type Backend, type Session } from "./backend";

const CLE = "syllakids:local:session";

export function backendLocal(base: string): Backend {
  const abonnes = new Set<(s: Session | null) => void>();
  let courante: (Session & { jeton: string }) | null = (() => {
    try {
      return JSON.parse(localStorage.getItem(CLE) ?? "null");
    } catch {
      return null;
    }
  })();
  const changer = (s: (Session & { jeton: string }) | null) => {
    courante = s;
    try {
      if (s) localStorage.setItem(CLE, JSON.stringify(s));
      else localStorage.removeItem(CLE);
    } catch {
      /* rien */
    }
    abonnes.forEach((f) => f(s ? { uid: s.uid, email: s.email } : null));
  };
  async function post(chemin: string, corps: unknown, jeton?: string): Promise<unknown> {
    const r = await fetch(base.replace(/\/$/, "") + chemin, {
      method: "POST",
      headers: { "content-type": "application/json", ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
      body: JSON.stringify(corps),
    });
    const json = (await r.json().catch(() => ({}))) as { message?: string; code?: string; resultat?: unknown };
    if (!r.ok) {
      if (r.status === 401 && jeton) changer(null);
      throw new ErreurServeur(json.message ?? `Erreur ${r.status}`, json.code);
    }
    return json.resultat;
  }
  return {
    type: "local",
    async session() {
      return courante ? { uid: courante.uid, email: courante.email } : null;
    },
    async inscrire(email, motDePasse) {
      const s = (await post("/auth/inscription", { email, motDePasse })) as Session & { jeton: string };
      changer(s);
      return { session: { uid: s.uid, email: s.email }, confirmation: false };
    },
    async connecter(email, motDePasse) {
      const s = (await post("/auth/connexion", { email, motDePasse })) as Session & { jeton: string };
      changer(s);
      return { uid: s.uid, email: s.email };
    },
    async deconnecter() {
      changer(null);
    },
    async oubli() {
      throw new ErreurServeur("Le serveur local n'envoie pas d'e-mails.");
    },
    async appeler(fonction, args = {}) {
      if (!courante) throw new ErreurServeur("Connexion nécessaire", "28000");
      return post(`/rpc/${fonction}`, args, courante.jeton);
    },
    surSession(rappel) {
      abonnes.add(rappel);
      return () => abonnes.delete(rappel);
    },
  };
}
