import { describe, expect, it } from "vitest";
import { normaliser, type Progression } from "./progression";
import { synchroniser, type PortProgression } from "./synchro";

/** Serveur simulé : même règle d'écriture optimiste que la fonction SQL ecrire_progression. */
function serveur() {
  const lignes = new Map<string, { donnees: Progression; version: number }>();
  let ecritures = 0;
  const port: PortProgression = {
    async lire(id) {
      const l = lignes.get(id);
      return l ? structuredClone(l) : null;
    },
    async ecrire(id, donnees, version) {
      ecritures++;
      const l = lignes.get(id);
      if (!l) {
        if (version !== 0) return { ok: false, version: 0, donnees: null };
        lignes.set(id, { donnees: structuredClone(donnees), version: 1 });
        return { ok: true, version: 1, donnees: null };
      }
      if (l.version !== version) return { ok: false, version: l.version, donnees: structuredClone(l.donnees) };
      lignes.set(id, { donnees: structuredClone(donnees), version: l.version + 1 });
      return { ok: true, version: l.version + 1, donnees: null };
    },
  };
  return { port, lignes, ecritures: () => ecritures };
}

const avec = (terminees: string[]): Progression => ({ ...normaliser({}), terminees });

describe("synchronisation", () => {
  it("premier envoi d'un profil", async () => {
    const s = serveur();
    const r = await synchroniser(s.port, "e1", avec(["U00"]), 0, true);
    expect(r.version).toBe(1);
    expect(s.lignes.get("e1")!.donnees.terminees).toEqual(["U00"]);
  });

  it("n'envoie rien pour un profil vide jamais synchronisé", async () => {
    const s = serveur();
    await synchroniser(s.port, "e1", normaliser({}), 0, false);
    expect(s.ecritures()).toBe(0);
  });

  it("deux appareils hors ligne : les deux progressions sont réunies", async () => {
    const s = serveur();
    const depart = await synchroniser(s.port, "e1", avec(["U00"]), 0, true);
    // la classe et la maison avancent chacune de leur côté
    const classe = await synchroniser(s.port, "e1", avec(["U00", "U01"]), depart.version, true);
    const maison = await synchroniser(s.port, "e1", avec(["U00", "U02"]), depart.version, true);
    expect(maison.progression.terminees).toEqual(["U00", "U01", "U02"]);
    expect(maison.version).toBe(classe.version + 1);
    // la classe récupère ensuite le travail de la maison
    const retour = await synchroniser(s.port, "e1", classe.progression, classe.version, false);
    expect(retour.progression.terminees).toEqual(["U00", "U01", "U02"]);
    expect(retour.version).toBe(maison.version);
  });

  it("appareil à jour : une simple lecture", async () => {
    const s = serveur();
    const r = await synchroniser(s.port, "e1", avec(["U00"]), 0, true);
    const n = s.ecritures();
    await synchroniser(s.port, "e1", r.progression, r.version, false);
    expect(s.ecritures()).toBe(n);
  });

  it("profil supprimé du serveur : il est recréé à partir de l'appareil", async () => {
    const s = serveur();
    const r = await synchroniser(s.port, "e1", avec(["U00"]), 0, true);
    s.lignes.clear();
    const r2 = await synchroniser(s.port, "e1", r.progression, r.version, true);
    expect(r2.version).toBe(1);
  });
});
