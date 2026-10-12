// Fonction Edge Supabase (Deno), lancée chaque nuit par pg_cron : voir docs/supabase.md.
// Secrets : CLE_PLANIFICATION (partagée avec la tâche planifiée), BREVO_API_KEY, EXPEDITEUR, ADRESSE_APPLICATION.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";
import { prevenir, type APrevenir, type Courriel } from "./prevenir.ts";

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Secret manquant : ${k}`);
  return v;
};

Deno.serve(async (req) => {
  // seule la tâche planifiée connaît cette clé
  if (req.headers.get("x-cle-planification") !== env("CLE_PLANIFICATION")) return new Response("Refusé", { status: 403 });
  const base = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  async function envoyer(c: Courriel) {
    // Brevo : service d'e-mails français, données hébergées dans l'UE
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env("BREVO_API_KEY"), "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: env("EXPEDITEUR"), name: "Syllakids" }, to: [{ email: c.a }], subject: c.sujet, textContent: c.texte }),
    });
    if (!r.ok) throw new Error(`Envoi refusé : ${r.status}`);
  }

  const resultat = await prevenir({
    adresse: env("ADRESSE_APPLICATION"),
    async lister() {
      const { data, error } = await base.rpc("a_prevenir");
      if (error) throw error;
      return data as APrevenir[];
    },
    envoyer,
    async marquer(adultes, enfants) {
      const { error } = await base.rpc("marquer_prevenus", { p_adultes: adultes, p_enfants: enfants });
      if (error) throw error;
    },
  });
  return Response.json(resultat);
});
