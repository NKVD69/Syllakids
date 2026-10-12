/**
 * Serveur local de développement : la base de Syllakids (migration Supabase) sur PGlite, avec une
 * authentification simplifiée. Permet d'essayer les comptes et la synchronisation sans projet Supabase.
 *
 *   npm run serveur:local            (port 54330, données en mémoire)
 *   PORT=54330 DONNEES=.serveur-local npm run serveur:local   (données conservées dans un dossier)
 *
 * Puis compiler l'application avec VITE_SERVEUR_LOCAL=http://localhost:54330.
 * Réservé au développement : mots de passe hachés sans sel coûteux, jetons en mémoire, aucun e-mail.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { appelerLocal, creerUtilisateur, preparerBase } from "../apps/app/src/serveur/baseLocale";

const racine = new URL("../supabase/", import.meta.url);
const port = Number(process.env.PORT ?? 54330);
const db = new PGlite(process.env.DONNEES);
const dejaPrete = await db
  .query("select 1 from information_schema.tables where table_schema = 'public' and table_name = 'adultes'")
  .then((r) => r.rows.length > 0)
  .catch(() => false);
if (!dejaPrete) {
  const migrations = readdirSync(new URL("migrations/", racine)).sort().map((f) => readFileSync(new URL(`migrations/${f}`, racine), "utf8"));
  await preparerBase(db, readFileSync(new URL("test/auth-local.sql", racine), "utf8"), migrations);
}

const jetons = new Map<string, { uid: string; email: string }>();
const empreinte = (email: string, mdp: string) => createHash("sha256").update(`syllakids:${email.toLowerCase()}:${mdp}`).digest("hex");

function lireCorps(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((ok, ko) => {
    let s = "";
    req.on("data", (c) => {
      s += c;
      if (s.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        ok(s ? JSON.parse(s) : {});
      } catch (e) {
        ko(e);
      }
    });
  });
}

createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type, authorization");
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return void res.writeHead(204).end();
  const repondre = (statut: number, corps: unknown) => {
    res.writeHead(statut, { "content-type": "application/json" });
    res.end(JSON.stringify(corps));
  };
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const corps = await lireCorps(req);
    if (url.pathname === "/auth/inscription" || url.pathname === "/auth/connexion") {
      const email = String(corps.email ?? "").trim().toLowerCase();
      const mdp = String(corps.motDePasse ?? "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return repondre(400, { message: "Adresse e-mail invalide" });
      let uid: string;
      if (url.pathname === "/auth/inscription") {
        if (mdp.length < 10) return repondre(400, { message: "mot de passe trop court" });
        const existe = await db.query("select 1 from auth.users where email = $1", [email]);
        if (existe.rows.length) return repondre(400, { message: "Adresse e-mail déjà utilisée" });
        uid = await creerUtilisateur(db, email, empreinte(email, mdp));
      } else {
        const r = await db.query<{ id: string }>("select id from auth.users where email = $1 and empreinte = $2", [email, empreinte(email, mdp)]);
        if (!r.rows[0]) return repondre(400, { message: "Invalid login credentials" });
        uid = r.rows[0].id;
      }
      const jeton = randomBytes(24).toString("hex");
      jetons.set(jeton, { uid, email });
      return repondre(200, { resultat: { uid, email, jeton } });
    }
    const rpc = url.pathname.match(/^\/rpc\/([a-z_]+)$/);
    if (rpc) {
      const qui = jetons.get((req.headers.authorization ?? "").replace(/^Bearer /, ""));
      if (!qui) return repondre(401, { message: "Session expirée" });
      const resultat = await appelerLocal(db, qui.uid, rpc[1]!, corps);
      if (rpc[1] === "supprimer_mon_compte") for (const [j, s] of jetons) if (s.uid === qui.uid) jetons.delete(j);
      return repondre(200, { resultat });
    }
    repondre(404, { message: "Inconnu" });
  } catch (e) {
    const err = e as { message?: string; code?: string };
    repondre(400, { message: err.message ?? String(e), code: err.code });
  }
}).listen(port, () => console.log(`Serveur local Syllakids : http://localhost:${port}`));
