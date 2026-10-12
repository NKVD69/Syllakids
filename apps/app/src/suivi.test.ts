import { describe, expect, it } from "vitest";
import { ajouterTemps, normaliser } from "./progression";
import { noterItem } from "./revisions";
import { csv, suivre } from "./suivi";

const UNITES = [
  { id: "U00", titre: "Voyelles", bloc: "voyelles" },
  { id: "U01", titre: "L", bloc: "sons-simples" },
  { id: "U02", titre: "M", bloc: "sons-simples" },
];

describe("suivi d'un enfant", () => {
  it("profil vide", () => {
    const s = suivre({}, UNITES, "2026-10-12");
    expect(s).toMatchObject({ courante: UNITES[0], terminees: 0, total: 3, minutesSemaine: 0, reussiteRecente: null, derniereActivite: null });
  });

  it("unité en cours, temps de la semaine, réussite et difficultés", () => {
    let p = normaliser({ terminees: ["U00"], seances: { U00: 2, U01: 1 } });
    p = ajouterTemps(ajouterTemps(p, "a", "2026-10-12", 600), "b", "2026-10-12", 300);
    p = ajouterTemps(p, "a", "2026-10-01", 1200); // hors de la semaine
    let la = noterItem(undefined, false, "U01", "2026-10-11", "2026-10-11T09:00:00Z");
    la = noterItem(la, false, "U01", "2026-10-12", "2026-10-12T09:00:00Z");
    p.items = { "U01-S-LA": la, "U01-S-LI": noterItem(undefined, true, "U01", "2026-10-12", "2026-10-12T09:01:00Z") };
    const s = suivre(p, UNITES, "2026-10-12");
    expect(s.courante?.id).toBe("U01");
    expect(s.seancesCourante).toBe(1);
    expect(s.minutesSemaine).toBe(15);
    expect(s.minutesParJour.at(-1)).toEqual({ jour: "2026-10-12", minutes: 15 });
    expect(s.reussiteRecente).toBeCloseTo(1 / 3);
    expect(s.difficultes).toEqual(["U01-S-LA"]);
    expect(s.derniereActivite).toBe("2026-10-12");
  });
});

describe("export CSV", () => {
  it("échappe les séparateurs et neutralise les formules", () => {
    expect(csv([["a;b", '"x"', "=1+1", 3]])).toBe('﻿"a;b";"""x""";"\'=1+1";3\r\n');
  });
});
