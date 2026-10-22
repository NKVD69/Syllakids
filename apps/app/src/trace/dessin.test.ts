import { describe, expect, it } from "vitest";
import traces from "../../../../content/traces-capitales.json";
import { positionsNumeros } from "./dessin";
import type { Trait } from "./evaluer";

const modele = (l: string): Trait[] =>
  ((traces.lettres as unknown as Record<string, { traits: [number, number][][] }>)[l]?.traits ?? []).map((t) => t.map(([x, y]) => [x, y] as const));

describe("numéros des traits", () => {
  it("deux traits qui partent du même point ont des numéros séparés", () => {
    for (const l of ["A", "B", "D", "E", "F", "M", "N", "P", "R", "É", "È", "Ê"]) {
      const p = positionsNumeros(modele(l));
      for (let i = 0; i < p.length; i++)
        for (let j = 0; j < i; j++) expect(Math.hypot(p[i]![0] - p[j]![0], p[i]![1] - p[j]![1]), `${l} : traits ${j + 1} et ${i + 1}`).toBeGreaterThanOrEqual(15.9);
    }
  });
  it("le premier numéro reste au point de départ, sur le trait", () => {
    const a = modele("A");
    const p = positionsNumeros(a);
    expect(p[0]).toEqual(a[0]![0]);
    // le « 2 » du A est descendu le long du second trait (vers la droite et vers le bas)
    expect(p[1]![0]).toBeGreaterThan(50);
    expect(p[1]![1]).toBeGreaterThan(0);
  });
  it("une lettre d'un seul trait garde son point de départ", () => {
    expect(positionsNumeros(modele("O"))[0]).toEqual(modele("O")[0]![0]);
  });
});
