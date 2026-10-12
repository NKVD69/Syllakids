import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { appelerLocal, creerUtilisateur, lireTable, preparerBase } from "../../apps/app/src/serveur/baseLocale";

const racine = new URL("../", import.meta.url);
const migrations = readdirSync(new URL("migrations/", racine)).sort().map((f) => readFileSync(new URL(`migrations/${f}`, racine), "utf8"));
const auth = readFileSync(new URL("test/auth-local.sql", racine), "utf8");

const ACCORD = { version: "2026-10", utilisation: true, voix_appareil: false, voix_partage: false, tests_classe: false };

let db: PGlite;
const ids: Record<string, string> = {};
const comme = (qui: string | null) => (f: string, args: Record<string, unknown> = {}) => appelerLocal(db, qui ? ids[qui]! : null, f, args);
type Ligne = Record<string, unknown>;
const lignes = (x: unknown) => x as Ligne[];

async function echoue(p: Promise<unknown>, motif: RegExp) {
  await expect(p).rejects.toThrow(motif);
}

beforeAll(async () => {
  db = new PGlite();
  await preparerBase(db, auth, migrations);
  for (const qui of ["prof", "prof2", "maman", "papa", "voisin"]) ids[qui] = await creerUtilisateur(db, `${qui}@exemple.fr`, "x");
  await comme("prof")("creer_compte", { p_role: "enseignant", p_nom: "Mme Durand" });
  await comme("prof2")("creer_compte", { p_role: "enseignant", p_nom: "M. Martin" });
  for (const qui of ["maman", "papa", "voisin"]) await comme(qui)("creer_compte", { p_role: "parent", p_nom: qui });
}, 60000);

describe("comptes", () => {
  it("un utilisateur non connecté n'appelle aucune fonction", async () => {
    await echoue(comme(null)("mes_classes"), /permission denied/);
  });
  it("mon_compte renvoie le rôle et met à jour la dernière visite", async () => {
    const r = lignes(await comme("prof")("mon_compte"));
    expect(r[0]).toMatchObject({ role: "enseignant", nom: "Mme Durand" });
  });
  it("aucune écriture directe dans les tables", async () => {
    await echoue(
      db.transaction(async (tx) => {
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [ids.maman]);
        await tx.exec("set local role authenticated");
        await tx.query("insert into public.enfants (prenom, avatar) values ('Pirate', 'chat')");
      }),
      /permission denied/,
    );
  });
});

describe("classe et rattachement des familles", () => {
  let classe: Ligne;
  let leo: Ligne;
  let ines: Ligne;

  it("seul un enseignant crée une classe", async () => {
    await echoue(comme("maman")("creer_classe", { p_nom: "GS", p_annee: "2026-2027" }), /Réservé aux enseignants/);
    classe = lignes(await comme("prof")("creer_classe", { p_nom: "GS Les Lilas", p_annee: "2026-2027" }))[0]!;
    expect(classe.code).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
  });

  it("l'enseignant crée des élèves avec un code famille et des images secrètes", async () => {
    leo = lignes(await comme("prof")("creer_eleve", { p_classe: classe.id, p_prenom: " Léo ", p_avatar: "chat", p_profil: "5ans" }))[0]!;
    ines = lignes(await comme("prof")("creer_eleve", { p_classe: classe.id, p_prenom: "Inès", p_avatar: "lune", p_profil: "5ans" }))[0]!;
    expect(leo.prenom).toBe("Léo");
    expect(leo.code_famille).toMatch(/^[A-Z2-9]{8}$/);
    expect(leo.code_images).toMatch(/^\d-\d-\d$/);
    // trois images différentes, plus faciles à retenir pour un enfant de 5 ans
    expect(new Set(String(leo.code_images).split("-")).size).toBe(3);
    const tableau = lignes(await comme("prof")("tableau_classe", { p_classe: classe.id }));
    expect(tableau.map((e) => e.prenom)).toEqual(["Inès", "Léo"]);
    expect(tableau.every((e) => e.famille === false && e.version === 0)).toBe(true);
  });

  it("un autre enseignant ne voit ni la classe ni ses élèves", async () => {
    await echoue(comme("prof2")("tableau_classe", { p_classe: classe.id }), /Classe introuvable/);
    await echoue(comme("prof2")("lire_progression", { p_enfant: leo.id }), /Profil introuvable/);
    expect(await lireTable(db, ids.prof2!, "enfants")).toHaveLength(0);
    expect(await lireTable(db, ids.prof!, "enfants")).toHaveLength(2);
  });

  it("le rattachement exige le bon code et l'accord d'utilisation", async () => {
    await echoue(comme("maman")("rattacher_par_code", { p_code: "AAAAAAAA", p_consentement: ACCORD }), /Code inconnu/);
    await echoue(comme("maman")("rattacher_par_code", { p_code: leo.code_famille, p_consentement: { ...ACCORD, utilisation: false } }), /doit être acceptée/);
    await echoue(comme("maman")("rattacher_par_code", { p_code: leo.code_famille, p_consentement: { version: "x" } }), /Accord incomplet/);
    await echoue(comme("maman")("rattacher_par_code", { p_code: leo.code_famille, p_consentement: { ...ACCORD, voix_partage: true } }), /check/);
    expect(lignes(await comme("maman")("mes_enfants"))).toHaveLength(0);
  });

  it("avec le code (saisi en minuscules, avec espaces), la famille retrouve le profil de classe", async () => {
    const code = String(leo.code_famille).toLowerCase().replace(/(....)/, "$1 ");
    await comme("maman")("rattacher_par_code", { p_code: code, p_consentement: { ...ACCORD, voix_appareil: true } });
    const enfants = lignes(await comme("maman")("mes_enfants"));
    expect(enfants).toHaveLength(1);
    expect(enfants[0]).toMatchObject({ prenom: "Léo", classe: "GS Les Lilas" });
    expect(enfants[0]!.consentement).toMatchObject({ voix_appareil: true, voix_partage: false });
    const tableau = lignes(await comme("prof")("tableau_classe", { p_classe: classe.id }));
    expect(tableau.find((e) => e.prenom === "Léo")!.famille).toBe(true);
    // la famille ne voit pas les autres élèves de la classe
    expect((await lireTable(db, ids.maman!, "enfants")).map((e) => e.prenom)).toEqual(["Léo"]);
    expect(await lireTable(db, ids.maman!, "classes")).toHaveLength(0);
  });

  it("le parent voit qui a consulté les données de son enfant", async () => {
    const j = lignes(await comme("maman")("journal_enfant", { p_enfant: leo.id }));
    expect(j.some((l) => l.action === "tableau de classe" && String(l.qui).includes("Mme Durand"))).toBe(true);
    expect(j.some((l) => l.action === "rattachement de la famille" && l.qui === "vous")).toBe(true);
    await echoue(comme("voisin")("journal_enfant", { p_enfant: leo.id }), /Profil introuvable/);
  });

  it("progression : écriture optimiste, conflit puis reprise", async () => {
    const p = comme("maman");
    const r1 = lignes(await p("ecrire_progression", { p_enfant: leo.id, p_donnees: { terminees: ["U00"] }, p_version: 0 }))[0]!;
    expect(r1).toMatchObject({ ok: true, version: 1 });
    // la tablette de classe écrit avec la bonne version
    const r2 = lignes(await comme("prof")("ecrire_progression", { p_enfant: leo.id, p_donnees: { terminees: ["U00", "U01"] }, p_version: 1 }))[0]!;
    expect(r2).toMatchObject({ ok: true, version: 2 });
    // la maison écrit avec une version dépassée : refus et renvoi de la version du serveur
    const r3 = lignes(await p("ecrire_progression", { p_enfant: leo.id, p_donnees: { terminees: ["U00"] }, p_version: 1 }))[0]!;
    expect(r3).toMatchObject({ ok: false, version: 2, donnees: { terminees: ["U00", "U01"] } });
    const r4 = lignes(await p("ecrire_progression", { p_enfant: leo.id, p_donnees: { terminees: ["U00", "U01", "U02"] }, p_version: 2 }))[0]!;
    expect(r4).toMatchObject({ ok: true, version: 3 });
    expect(lignes(await p("lire_progression", { p_enfant: leo.id }))[0]).toMatchObject({ version: 3 });
    await echoue(comme("voisin")("ecrire_progression", { p_enfant: leo.id, p_donnees: {}, p_version: 3 }), /Profil introuvable/);
    await echoue(p("ecrire_progression", { p_enfant: leo.id, p_donnees: [], p_version: 3 }), /Progression invalide/);
  });

  it("export des données de l'enfant", async () => {
    const x = (await comme("maman")("exporter_enfant", { p_enfant: leo.id })) as Ligne;
    expect(x).toMatchObject({ classe: "GS Les Lilas", progression: { version: 3 } });
    expect((x.profil as Ligne).code_famille).toBeUndefined();
    expect((x.accords as Ligne[])).toHaveLength(1);
  });

  it("retrait de l'accord sur un profil de classe : la famille est détachée, l'école garde le profil", async () => {
    expect(await comme("maman")("donner_consentement", { p_enfant: leo.id, p_consentement: { ...ACCORD, utilisation: false } })).toBe("detache");
    expect(lignes(await comme("maman")("mes_enfants"))).toHaveLength(0);
    expect(lignes(await comme("prof")("tableau_classe", { p_classe: classe.id })).find((e) => e.prenom === "Léo")).toMatchObject({ famille: false, version: 3 });
  });

  it("retirer un élève : supprimé sans famille, rendu à la famille sinon", async () => {
    await comme("papa")("rattacher_par_code", { p_code: leo.code_famille, p_consentement: ACCORD });
    expect(await comme("prof")("retirer_eleve", { p_enfant: leo.id })).toBe("rendu");
    expect(lignes(await comme("papa")("mes_enfants"))[0]).toMatchObject({ prenom: "Léo", classe: null });
    await echoue(comme("prof")("lire_progression", { p_enfant: leo.id }), /Profil introuvable/);
    expect(await comme("prof")("retirer_eleve", { p_enfant: ines.id })).toBe("supprime");
    expect(lignes(await comme("prof")("mes_classes"))[0]).toMatchObject({ nb_eleves: 0 });
  });

  it("un profil créé à la maison rejoint la classe avec le code de classe", async () => {
    const id = crypto.randomUUID();
    await comme("voisin")("creer_enfant", { p_id: id, p_prenom: "Sami", p_avatar: "poisson", p_profil: "6ans", p_dys: true, p_consentement: ACCORD });
    await echoue(comme("voisin")("rejoindre_classe", { p_enfant: id, p_code_classe: "ZZZZZZ" }), /Code de classe inconnu/);
    expect(await comme("voisin")("rejoindre_classe", { p_enfant: id, p_code_classe: String(classe.code).toLowerCase() })).toBe("GS Les Lilas");
    const tableau = lignes(await comme("prof")("tableau_classe", { p_classe: classe.id }));
    expect(tableau.map((e) => e.prenom)).toEqual(["Sami"]);
    expect(tableau[0]).toMatchObject({ famille: true, dys: true });
    ids.sami = id;
  });

  it("supprimer la classe rend les élèves aux familles", async () => {
    await comme("prof")("supprimer_classe", { p_classe: classe.id });
    expect(lignes(await comme("voisin")("mes_enfants"))[0]).toMatchObject({ prenom: "Sami", classe: null });
  });
});

describe("profils créés à la maison", () => {
  it("un parent ne crée un profil qu'avec l'accord d'utilisation", async () => {
    await echoue(
      comme("maman")("creer_enfant", { p_id: null, p_prenom: "Nour", p_avatar: "etoile", p_profil: "6ans", p_dys: false, p_consentement: { ...ACCORD, utilisation: false } }),
      /doit être acceptée/,
    );
    await echoue(comme("prof")("creer_enfant", { p_id: null, p_prenom: "X", p_avatar: "etoile", p_profil: "6ans", p_dys: false, p_consentement: ACCORD }), /Réservé aux parents/);
    expect(lignes(await comme("maman")("mes_enfants"))).toHaveLength(0);
  });

  it("le retrait de l'accord supprime un profil familial et sa progression", async () => {
    const e = lignes(await comme("maman")("creer_enfant", { p_id: null, p_prenom: "Nour", p_avatar: "etoile", p_profil: "6ans", p_dys: false, p_consentement: ACCORD }))[0]!;
    await comme("maman")("ecrire_progression", { p_enfant: e.id, p_donnees: { terminees: [] }, p_version: 0 });
    expect(await comme("maman")("donner_consentement", { p_enfant: e.id, p_consentement: { ...ACCORD, utilisation: false } })).toBe("supprime");
    const restant = await db.query("select count(*)::int as n from public.progressions where enfant_id = $1", [e.id]);
    expect(restant.rows[0]).toEqual({ n: 0 });
  });

  it("modifier le profil (prénom, avatar, âge, mode Dys)", async () => {
    const e = lignes(await comme("maman")("modifier_enfant", { p_enfant: ids.sami, p_prenom: "S", p_avatar: "chat", p_profil: "5ans", p_dys: false }).catch(() => []));
    expect(e).toHaveLength(0); // ce n'est pas son enfant
    const m = lignes(await comme("voisin")("modifier_enfant", { p_enfant: ids.sami, p_prenom: "Samy", p_avatar: "chat", p_profil: "5ans", p_dys: false }))[0]!;
    expect(m).toMatchObject({ prenom: "Samy", profil: "5ans" });
  });

  it("supprimer son compte supprime les profils qui ne sont plus rattachés à personne", async () => {
    await comme("voisin")("supprimer_mon_compte");
    const n = await db.query("select count(*)::int as n from public.enfants where id = $1", [ids.sami]);
    expect(n.rows[0]).toEqual({ n: 0 });
    const u = await db.query("select count(*)::int as n from auth.users where id = $1", [ids.voisin]);
    expect(u.rows[0]).toEqual({ n: 0 });
  });
});

describe("durées de conservation", () => {
  it("purge des journaux de plus de 6 mois et des comptes inactifs depuis 12 mois", async () => {
    const e = lignes(await comme("papa")("mes_enfants"))[0]!;
    await db.query("update public.journal_acces set le = now() - interval '7 months' where enfant_id = $1", [e.id]);
    await db.query("update public.adultes set vu_le = now() - interval '13 months' where id = $1", [ids.papa]);
    const r = (await db.query<{ r: Ligne }>("select public.purger_donnees() as r")).rows[0]!.r;
    expect(r).toMatchObject({ comptes: 1, profils: 1 });
    expect(Number(r.journaux)).toBeGreaterThan(0);
  });
  it("la purge et les fonctions internes ne sont pas accessibles aux comptes connectés", async () => {
    await echoue(comme("prof")("purger_donnees"), /permission denied/);
    await echoue(comme("maman")("_nettoyer", { p_enfant: crypto.randomUUID() }), /permission denied|does not exist/);
    await echoue(
      db.transaction(async (tx) => {
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [ids.maman]);
        await tx.exec("set local role authenticated");
        await tx.query("select public._consentement($1::uuid, '{}'::jsonb)", [crypto.randomUUID()]);
      }),
      /permission denied/,
    );
    for (const f of ["nouveau_code(6)", "nouvelles_images()", "_moi()"]) {
      await echoue(
        db.transaction(async (tx) => {
          await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [ids.prof]);
          await tx.exec("set local role authenticated");
          await tx.query(`select public.${f}`);
        }),
        /permission denied/,
      );
    }
  });
});
