import { describe, expect, it } from "vitest";
import { estOuvert, fermer, ouvrir, questionCE1 } from "./verrou";

/** Générateur pseudo-aléatoire reproductible. */
function graine(n: number) {
  let s = n;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("question de calcul CE1", () => {
  const questions = Array.from({ length: 500 }, (_, k) => questionCE1(graine((k + 1) * 104729)));

  it("les trois sortes de calcul sont proposées", () => {
    expect(questions.some((q) => q.texte.includes("+"))).toBe(true);
    expect(questions.some((q) => q.texte.includes("−"))).toBe(true);
    expect(questions.some((q) => q.texte.includes("×"))).toBe(true);
  });

  it("additions et soustractions demandent une retenue, résultats entre 11 et 99", () => {
    for (const q of questions) {
      const [a, op, b] = q.texte.split(" ");
      const x = Number(a), y = Number(b);
      if (op === "+") {
        expect((x % 10) + (y % 10)).toBeGreaterThanOrEqual(10);
        expect(q.reponse).toBe(x + y);
      } else if (op === "−") {
        expect(x % 10).toBeLessThan(y % 10);
        expect(q.reponse).toBe(x - y);
      } else {
        expect(x).toBeGreaterThanOrEqual(2);
        expect(x).toBeLessThanOrEqual(5);
        expect(q.reponse).toBe(x * y);
      }
      expect(q.reponse).toBeGreaterThanOrEqual(6);
      expect(q.reponse).toBeLessThan(100);
    }
  });
});

describe("ouverture des écrans adultes", () => {
  it("reste ouvert 10 minutes, puis se referme", () => {
    fermer();
    expect(estOuvert(1000)).toBe(false);
    ouvrir(1000);
    expect(estOuvert(1000 + 9 * 60_000)).toBe(true);
    expect(estOuvert(1000 + 11 * 60_000)).toBe(false);
    ouvrir(1000);
    fermer();
    expect(estOuvert(2000)).toBe(false);
  });
});
