import { describe, expect, it } from "vitest";
import traces from "../../../../content/traces-capitales.json";
import { evaluer, type Trait } from "./evaluer";

const lettres = traces.lettres as unknown as Record<string, { traits: [number, number][][] }>;
const modele = (l: string): Trait[] => lettres[l]!.traits.map((t) => t.map(([x, y]) => [x, y] as const));
const bruit = (t: Trait, a = 4): Trait => t.map(([x, y], i) => [x + Math.sin(i * 1.7) * a, y + Math.cos(i * 1.3) * a] as const);

describe("évaluation du tracé", () => {
  for (const l of ["A", "E", "L", "M", "O", "S", "B", "É"]) {
    it(`accepte un ${l} bien tracé, même tremblé`, () => {
      expect(evaluer(modele(l), modele(l).map((t) => bruit(t)), "libre")).toEqual({ ok: true, message: "CON-TR-13" });
    });
  }
  it("signale un trait vertical tracé de bas en haut", () => {
    const m = modele("L");
    const i = modele("I");
    expect(evaluer(i, [[...i[0]!].reverse()], "guide").message).toBe("CON-TR-03");
    expect(m).toBeDefined();
  });
  it("signale un rond tourné dans le mauvais sens", () => {
    const c = modele("C");
    expect(evaluer(c, [[...c[0]!].reverse()], "guide").message).toBe("CON-TR-06");
  });
  it("signale un V commencé par la fin", () => {
    const v = modele("V");
    expect(evaluer(v, [[...v[0]!].reverse()], "guide").message).toBe("CON-TR-02");
  });
  it("signale une barre horizontale tracée de droite à gauche", () => {
    const t = modele("T");
    expect(evaluer(t, [[...t[0]!].reverse(), t[1]!], "guide").message).toBe("CON-TR-05");
  });
  it("signale un trait oublié", () => {
    const e = modele("E");
    expect(evaluer(e, e.slice(0, 3), "guide").message).toBe("CON-TR-07");
  });
  it("signale des traits dans le désordre", () => {
    const h = modele("H");
    expect(evaluer(h, [h[1]!, h[0]!, h[2]!], "guide").message).toBe("CON-TR-08");
  });
  it("signale une lettre trop petite", () => {
    const i = modele("I");
    const petit = i.map((t) => t.map(([x, y]) => [x, 40 + y * 0.3] as const));
    expect(evaluer(i, petit, "libre").message).toBe("CON-TR-10");
  });
  it("accepte un L tracé en deux traits (variante)", () => {
    const l = modele("L")[0]!;
    expect(evaluer(modele("L"), [l.slice(0, 2), l.slice(1)], "libre").ok).toBe(true);
  });
});
