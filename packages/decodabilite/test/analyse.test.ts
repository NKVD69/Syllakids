import { describe, expect, it } from "vitest";
import { analyserMot, rangMinimal, syllaber, verifierPhrase } from "../src";

describe("rang minimal des mots", () => {
  const attendus: Record<string, number> = {
    LÉA: 1, LOLA: 1, ÉLU: 1,
    AMI: 2, MÉMÉ: 2, LIME: 2,
    MÈRE: 3, MUR: 3, OMAR: 3,
    SALÉ: 4, SOLO: 4, SAMIR: 4,
    RAFALE: 5, FORME: 5, FÉMUR: 5,
    LUNE: 6, ANIMAL: 6, ÉNORME: 6,
    VÉLO: 7, RAVIOLI: 7,
    JOLI: 8, JUNIOR: 8,
    ZÉRO: 9, AZUR: 9,
    PYJAMA: 10, PIANO: 10,
    TOMATE: 11, TIRELIRE: 11,
    BANANE: 12, BARBE: 12,
    SALADE: 13, LIMONADE: 13,
  };
  for (const [mot, rang] of Object.entries(attendus)) {
    it(`${mot} est lisible au rang ${rang}`, () => expect(rangMinimal(mot)).toBe(rang));
  }
});

describe("mots qui demandent de deviner", () => {
  const refuses = ["MAMIE", "ROSE", "CHAT", "SALLE", "LAPIN", "MAISON", "FLEUR", "SEL", "RADIS", "TÉLÉE", "MOUTON", "AVION"];
  for (const mot of refuses) {
    it(`${mot} est refusé`, () => expect(analyserMot(mot).ok).toBe(false));
  }
  it("explique pourquoi ROSE est refusé", () => {
    const r = analyserMot("ROSE");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problemes.join()).toMatch(/\[z\]/);
  });
});

describe("syllabes", () => {
  it.each([
    ["TOMATE", ["TO", "MA", "TE"]],
    ["FORME", ["FOR", "ME"]],
    ["ÉNORME", ["É", "NOR", "ME"]],
    ["PIANO", ["PI", "A", "NO"]],
    ["LÉA", ["LÉ", "A"]],
    ["ANIMAL", ["A", "NI", "MAL"]],
    ["MUR", ["MUR"]],
  ])("%s → %j", (mot, attendu) => expect(syllaber([...mot])).toEqual(attendu));
});

describe("S muet du pluriel", () => {
  it("AMIS est lisible au rang 4 avec un S muet", () => {
    const r = analyserMot("AMIS", { pluriel: true });
    expect(r.ok && r.rang).toBe(4);
    expect(r.ok && r.segments.at(-1)).toEqual({ g: "S", p: "", muet: true });
  });
});

describe("mots-outils", () => {
  it("EST a deux lettres muettes", () => {
    const r = analyserMot("EST");
    expect(r.ok && r.segments.filter((s) => s.muet).map((s) => s.g)).toEqual(["S", "T"]);
  });
  it("UN arrive au rang 6", () => expect(rangMinimal("UN")).toBe(6));
});

describe("phrases", () => {
  it("accepte une phrase lisible", () => expect(verifierPhrase("LA MULE A VOLÉ UNE OLIVE.", 7).ok).toBe(true));
  it("refuse une phrase trop tôt", () => {
    const v = verifierPhrase("LE VÉLO EST RAPIDE.", 7);
    expect(v.ok).toBe(false);
    expect(v.rang).toBe(13);
  });
  it("ignore les emplacements de personnage", () => expect(verifierPhrase("{P1} A FINI LE MENU.", 6).ok).toBe(true));
});
