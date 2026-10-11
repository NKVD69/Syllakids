import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDRE_CONSONNES, VOYELLES, analyserMot, verifierPhrase } from "../packages/decodabilite/src";

const dossier = join(__dirname);
const lire = (f: string) => JSON.parse(readFileSync(join(dossier, f), "utf8"));
const index = lire("index.json");
const unites = index.unites.map((u: { fichier: string }) => lire(u.fichier));

describe("contenu des unités", () => {
  it("couvre les rangs 0 à 14 dans l'ordre", () => {
    expect(unites.map((u: any) => u.unite.rang)).toEqual([...Array(15).keys()]);
  });

  it("n'a aucun identifiant en double", () => {
    const ids = unites.flatMap((u: any) => u.items.map((i: any) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const u of unites) {
    const rang = Math.min(u.unite.rang, 13);
    it(`${u.unite.id} : chaque mot est lisible au rang ${rang}`, () => {
      for (const item of u.items.filter((i: any) => i.type === "mot")) {
        const a = analyserMot(item.texte);
        expect(a.ok, item.texte).toBe(true);
        if (a.ok) expect(a.rang, item.texte).toBeLessThanOrEqual(rang);
      }
    });
    it(`${u.unite.id} : chaque mot inventé est lisible et n'est pas un vrai mot de l'unité`, () => {
      const vrais = new Set(u.items.filter((i: any) => i.type === "mot").map((i: any) => i.texte));
      for (const item of u.items.filter((i: any) => i.type === "pseudo")) {
        const a = analyserMot(item.texte);
        expect(a.ok && a.rang <= rang, item.texte).toBe(true);
        expect(vrais.has(item.texte), item.texte).toBe(false);
      }
    });
    it(`${u.unite.id} : chaque phrase est lisible au rang ${rang}`, () => {
      for (const item of u.items.filter((i: any) => i.type === "phrase")) {
        const v = verifierPhrase(item.texte, rang);
        expect(v.problemes, item.texte).toEqual([]);
      }
    });
  }
});

describe("consignes", () => {
  const c = lire("consignes.json");
  it("a 178 messages audio et 15 conseils aux parents, sans doublon", () => {
    expect(c.messages).toHaveLength(178);
    expect(c.parents).toHaveLength(15);
    const ids = c.messages.map((m: any) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("donne une consigne à chacune des 17 activités", () => {
    expect(Object.keys(c.activites)).toHaveLength(17);
  });
});

describe("tracés", () => {
  const t = lire("traces-capitales.json");
  it("couvre toutes les lettres du MVP", () => {
    for (const l of [...Object.keys(VOYELLES), ...ORDRE_CONSONNES]) expect(t.lettres[l], l).toBeDefined();
  });
});
