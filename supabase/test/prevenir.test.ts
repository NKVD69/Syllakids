import { describe, expect, it } from "vitest";
import { composer, prevenir, type APrevenir } from "../functions/prevenir-inactifs/prevenir";

const lignes: APrevenir[] = [
  { adulte: "a1", email: "nadia@famille.fr", raison: "compte", enfant: null, prenom: null },
  { adulte: "a1", email: "nadia@famille.fr", raison: "profil", enfant: "e1", prenom: "Léo" },
  { adulte: "a1", email: "nadia@famille.fr", raison: "profil", enfant: "e2", prenom: "Inès" },
  { adulte: "a2", email: "karim@famille.fr", raison: "profil", enfant: "e1", prenom: "Léo" },
];

describe("avertissement avant suppression", () => {
  it("un e-mail par adresse, qui regroupe compte et profils", () => {
    const lots = composer(lignes, "https://app.syllakids.fr/");
    expect(lots).toHaveLength(2);
    const nadia = lots.find((l) => l.courriel.a === "nadia@famille.fr")!;
    expect(nadia.courriel.sujet).toMatch(/compte Syllakids sera supprimé/);
    expect(nadia.courriel.texte).toMatch(/Les profils de Léo et Inès n'ont pas été utilisés/);
    expect(nadia.courriel.texte).toContain("https://app.syllakids.fr/");
    expect(nadia).toMatchObject({ adultes: ["a1"], enfants: ["e1", "e2"] });
    const karim = lots.find((l) => l.courriel.a === "karim@famille.fr")!;
    expect(karim.courriel.sujet).toMatch(/Un profil Syllakids/);
    expect(karim.courriel.texte).toMatch(/Le profil de Léo n'a pas été utilisé depuis 11 mois/);
    expect(karim.adultes).toEqual([]);
  });

  it("seuls les avertissements envoyés sont notés", async () => {
    let notes: [string[], string[]] | null = null;
    const r = await prevenir({
      adresse: "https://app.syllakids.fr/",
      lister: async () => lignes,
      envoyer: async (c) => {
        if (c.a.startsWith("karim")) throw new Error("boîte pleine");
      },
      marquer: async (a, e) => {
        notes = [a, e];
      },
    });
    expect(r).toEqual({ envoyes: 1, echecs: 1 });
    expect(notes).toEqual([["a1"], ["e1", "e2"]]);
  });
});
