import { createClient, type Session as SessionSupabase } from "@supabase/supabase-js";
import { ErreurServeur, type Backend, type Session } from "./backend";

function versSession(s: SessionSupabase | null): Session | null {
  return s ? { uid: s.user.id, email: s.user.email ?? "" } : null;
}

export function backendSupabase(url: string, cle: string): Backend {
  const client = createClient(url, cle, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "syllakids:auth" },
  });
  return {
    type: "supabase",
    async session() {
      const { data } = await client.auth.getSession();
      return versSession(data.session);
    },
    async inscrire(email, motDePasse) {
      const { data, error } = await client.auth.signUp({ email, password: motDePasse, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
      if (error) throw new ErreurServeur(error.message, error.code);
      return { session: versSession(data.session), confirmation: !data.session };
    },
    async connecter(email, motDePasse) {
      const { data, error } = await client.auth.signInWithPassword({ email, password: motDePasse });
      if (error) throw new ErreurServeur(error.message, error.code);
      return versSession(data.session)!;
    },
    async deconnecter() {
      await client.auth.signOut({ scope: "local" });
    },
    async oubli(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
      if (error) throw new ErreurServeur(error.message, error.code);
    },
    async appeler(fonction, args = {}) {
      const { data, error } = await client.rpc(fonction, args);
      if (error) throw new ErreurServeur(error.message, error.code);
      return data;
    },
    surSession(rappel) {
      const { data } = client.auth.onAuthStateChange((_e, s) => rappel(versSession(s)));
      return () => data.subscription.unsubscribe();
    },
  };
}
