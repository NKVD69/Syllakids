import { describe, expect, it } from "vitest";
import { ajouterTemps, fusionner, memeProgression, normaliser, tempsDuJour, type Progression } from "./progression";
import { noterItem } from "./revisions";

const base = (): Progression => normaliser({});

describe("fusion de deux progressions", () => {
  const maison = (() => {
    let p = base();
    p = { ...p, terminees: ["U00", "U01"], seances: { U00: 2, U01: 2, U02: 1 } };
    p.items = { "U01-S-LA": noterItem(undefined, true, "U01", "2026-10-10", "2026-10-10T17:00:00Z") };
    p.fluence = { meilleur: 12, date: "2026-10-10" };
    p.reglages = { profil: "6ans", dys: true };
    p.reglagesMaj = "2026-10-10T18:00:00Z";
    return ajouterTemps(p, "tablette-maison", "2026-10-10", 600);
  })();
  const classe = (() => {
    let p = base();
    p = { ...p, terminees: ["U00", "U02"], seances: { U00: 2, U02: 2, U03: 1 } };
    p.items = {
      "U01-S-LA": noterItem(noterItem(undefined, true, "U01", "2026-10-09", "2026-10-09T09:00:00Z"), false, "U01", "2026-10-11", "2026-10-11T09:00:00Z"),
      "U02-S-MA": noterItem(undefined, true, "U02", "2026-10-11", "2026-10-11T09:05:00Z"),
    };
    p.fluence = { meilleur: 9, date: "2026-10-11" };
    p.reglages = { profil: "5ans", dys: false };
    p.reglagesMaj = "2026-10-01T08:00:00Z";
    return ajouterTemps(p, "tablette-classe", "2026-10-10", 900);
  })();

  it("réunit ce qui a été appris sur chaque appareil", () => {
    const f = fusionner(maison, classe);
    expect(f.terminees).toEqual(["U00", "U01", "U02"]);
    expect(f.seances).toEqual({ U00: 2, U01: 2, U02: 2, U03: 1 });
    expect(f.fluence).toEqual({ meilleur: 12, date: "2026-10-10" });
  });

  it("garde la réponse la plus récente pour chaque item", () => {
    const f = fusionner(maison, classe);
    expect(f.items["U01-S-LA"]).toMatchObject({ boite: 1, vu: "2026-10-11T09:00:00Z" });
    expect(f.items["U02-S-MA"]).toBeDefined();
  });

  it("garde les réglages modifiés en dernier", () => {
    expect(fusionner(maison, classe).reglages).toEqual({ profil: "6ans", dys: true });
  });

  it("additionne le temps des différents appareils", () => {
    const f = fusionner(maison, classe);
    expect(tempsDuJour(f, "2026-10-10")).toBe(1500);
    // refusionner la même chose ne double pas le temps
    expect(tempsDuJour(fusionner(f, maison), "2026-10-10")).toBe(1500);
  });

  it("est commutative et idempotente", () => {
    const ab = fusionner(maison, classe);
    expect(memeProgression(ab, fusionner(classe, maison))).toBe(true);
    expect(memeProgression(fusionner(ab, ab), ab)).toBe(true);
    expect(memeProgression(fusionner(ab, maison), ab)).toBe(true);
  });

  it("normalise une progression incomplète", () => {
    expect(normaliser({ terminees: "x" })).toMatchObject({ terminees: [], seances: {}, items: {}, reglages: { profil: "6ans", dys: false } });
  });
});
