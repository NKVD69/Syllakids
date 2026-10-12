import { describe, expect, it } from "vitest";
import traces from "../../../../content/traces-capitales.json";
import type { Trait } from "./evaluer";
import { estLaLettre, reconnaitre } from "./reconnaitre";

const lettres = traces.lettres as unknown as Record<string, { traits: [number, number][][] }>;
const MVP = ["A", "E", "I", "O", "U", "Y", "É", "È", "Ê", "L", "M", "R", "S", "F", "N", "V", "J", "Z", "P", "T", "B", "D"];
const modeles = Object.fromEntries(MVP.map((l) => [l, lettres[l]!.traits.map((t) => t.map(([x, y]) => [x, y] as const))])) as Record<string, Trait[]>;

/** Tracé d'enfant simulé : tremblement, décalage, taille et sens des traits modifiés. */
function enfant(l: string, graine: number): Trait[] {
  const ech = 0.6 + (graine % 5) * 0.12;
  const dx = (graine * 7) % 30;
  return modeles[l]!.map((t, k) => {
    const pts = t.map(([x, y], i) => [x * ech + dx + Math.sin(i * 1.9 + graine + k) * 3, y * ech + 10 + Math.cos(i * 1.3 + graine) * 3] as const);
    return graine % 2 ? [...pts].reverse() : pts;
  });
}

describe("reconnaissance des lettres dictées", () => {
  for (const l of MVP) {
    it(`reconnaît un ${l} tremblé, plus petit, décalé ou tracé à l'envers`, () => {
      for (let g = 0; g < 4; g++) expect(reconnaitre(enfant(l, g), modeles)?.lettre, `${l} essai ${g}`).toBe(l);
    });
  }
  it("distingue E, É, È et Ê", () => {
    for (const l of ["E", "É", "È", "Ê"]) expect(estLaLettre(enfant(l, 1), l, modeles)).toBe(true);
    expect(estLaLettre(enfant("E", 2), "É", modeles)).toBe(false);
  });
  it("refuse une autre lettre", () => expect(estLaLettre(enfant("L", 0), "T", modeles)).toBe(false));
  it("refuse un gribouillis", () => {
    const gribouillis: Trait[] = [Array.from({ length: 40 }, (_, i) => [50 + 40 * Math.sin(i * 2.3), 50 + 40 * Math.cos(i * 3.7)] as const)];
    expect(estLaLettre(gribouillis, "O", modeles)).toBe(false);
  });
});
