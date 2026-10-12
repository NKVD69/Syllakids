import { describe, expect, it } from "vitest";
import { ajouterJours, estMaitrisee, itemsDus, noterItem } from "./revisions";

describe("boîtes de Leitner", () => {
  it("une réussite fait monter d'une boîte et espace la révision", () => {
    const a = noterItem(undefined, true, "U03", "2026-10-12");
    expect(a).toMatchObject({ boite: 1, prochaine: "2026-10-13", essais: 1, reussites: 1 });
    const b = noterItem(a, true, "U03", "2026-10-13");
    expect(b).toMatchObject({ boite: 2, prochaine: "2026-10-15" });
    const c = noterItem({ ...b, boite: 5 }, true, "U03", "2026-10-15");
    expect(c).toMatchObject({ boite: 5, prochaine: "2026-10-31" });
  });
  it("une erreur renvoie en boîte 1, à revoir le lendemain", () => {
    const e = noterItem({ boite: 4, prochaine: "2026-10-12", essais: 5, reussites: 5, unite: "U02" }, false, "U02", "2026-10-12");
    expect(e).toMatchObject({ boite: 1, prochaine: "2026-10-13", essais: 6, reussites: 5, unite: "U02" });
  });
  it("passe correctement les fins de mois", () => expect(ajouterJours("2026-10-30", 4)).toBe("2026-11-03"));
  it("choisit les items dus, les plus fragiles d'abord, hors unité en cours", () => {
    const items = {
      a: { boite: 3, prochaine: "2026-10-10", essais: 3, reussites: 3, unite: "U01" },
      b: { boite: 1, prochaine: "2026-10-12", essais: 2, reussites: 1, unite: "U02" },
      c: { boite: 1, prochaine: "2026-10-20", essais: 1, reussites: 0, unite: "U02" },
      d: { boite: 1, prochaine: "2026-10-01", essais: 1, reussites: 0, unite: "U05" },
    };
    expect(itemsDus(items, "2026-10-12", { exclureUnite: "U05" })).toEqual(["b", "a"]);
  });
});

describe("critère de maîtrise", () => {
  it("90 % à 6 ans, 85 % à 5 ans", () => {
    expect(estMaitrisee({ essais: 20, reussites: 18 }, "6ans")).toBe(true);
    expect(estMaitrisee({ essais: 20, reussites: 17 }, "6ans")).toBe(false);
    expect(estMaitrisee({ essais: 20, reussites: 17 }, "5ans")).toBe(true);
  });
});
