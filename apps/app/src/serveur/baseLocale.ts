/**
 * Base Postgres locale (PGlite) chargée avec la même migration que Supabase.
 * Sert aux tests automatiques des droits d'accès et au mode démonstration hors ligne :
 * les appels passent par les mêmes fonctions SQL qu'en production, avec le rôle « authenticated ».
 */
import type { PGlite } from "@electric-sql/pglite";

export interface ErreurSql extends Error { code?: string }

export async function preparerBase(db: PGlite, sqlAuth: string, migrations: string[]): Promise<void> {
  await db.exec(sqlAuth);
  for (const m of migrations) await db.exec(m);
}

/**
 * Valeur passée à Postgres, comme le fait PostgREST : une liste de textes devient un tableau Postgres
 * (paramètres uuid[]), les autres objets et listes deviennent du JSON (paramètres jsonb).
 */
function valeur(v: unknown): unknown {
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v;
  return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
}

/**
 * Appelle une fonction SQL comme le ferait Supabase pour l'utilisateur `uid` (null = non connecté).
 * Renvoie les lignes ; pour une fonction qui renvoie une valeur simple, la valeur elle-même.
 */
export async function appelerLocal(db: PGlite, uid: string | null, fonction: string, args: Record<string, unknown> = {}): Promise<unknown> {
  if (!/^[a-z_]+$/.test(fonction)) throw new Error(`Fonction invalide : ${fonction}`);
  const noms = Object.keys(args);
  noms.forEach((n) => {
    if (!/^p_[a-z_]+$/.test(n)) throw new Error(`Argument invalide : ${n}`);
  });
  const sql = `select * from public.${fonction}(${noms.map((n, i) => `${n} => $${i + 1}`).join(", ")})`;
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
    await tx.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    const r = await tx.query<Record<string, unknown>>(sql, noms.map((n) => valeur(args[n])));
    const lignes = r.rows;
    const cols = r.fields.map((f) => f.name);
    if (cols.length === 1 && cols[0] === fonction) return lignes[0]?.[fonction] ?? null;
    return lignes;
  });
}

/** Lecture directe d'une table avec les droits de l'utilisateur (pour vérifier les règles par ligne). */
export async function lireTable(db: PGlite, uid: string, table: string): Promise<Record<string, unknown>[]> {
  if (!/^[a-z_]+$/.test(table)) throw new Error(`Table invalide : ${table}`);
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
    await tx.exec("set local role authenticated");
    return (await tx.query<Record<string, unknown>>(`select * from public.${table}`)).rows;
  });
}

/** Crée un utilisateur dans le schéma auth simulé (équivalent local de l'inscription Supabase). */
export async function creerUtilisateur(db: PGlite, email: string, empreinte: string): Promise<string> {
  const r = await db.query<{ id: string }>("insert into auth.users (email, empreinte) values ($1, $2) returning id", [email.toLowerCase(), empreinte]);
  return r.rows[0]!.id;
}
