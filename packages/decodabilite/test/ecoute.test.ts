import { describe, expect, it } from "vitest";
import { analyserMot, contientPhoneme, grouperParSyllabe, syllabesAvecPhoneme } from "../src";

const mot = (m: string) => {
  const a = analyserMot(m, { pluriel: true });
  if (!a.ok) throw new Error(m);
  return a;
};

describe("repérage des sons", () => {
  it("on entend [l] dans LUNE, pas dans MENU", () => {
    expect(contientPhoneme(mot("LUNE").segments, "l")).toBe(true);
    expect(contientPhoneme(mot("MENU").segments, "l")).toBe(false);
  });
  it("le S muet de AMIS ne compte pas", () => expect(contientPhoneme(mot("AMIS").segments, "s")).toBe(false));
  it("[m] est dans la 2e syllabe de TOMATE", () => {
    const m = mot("TOMATE");
    expect(syllabesAvecPhoneme(m.segments, m.syllabes, "m")).toEqual([1]);
  });
  it("[a] est dans deux syllabes de BANANE", () => {
    const m = mot("BANANE");
    expect(syllabesAvecPhoneme(m.segments, m.syllabes, "a")).toEqual([0, 1]);
  });
  it("groupe les segments par syllabe", () => {
    const m = mot("FORME");
    expect(grouperParSyllabe(m.segments, m.syllabes).map((g) => g.map((s) => s.g).join(""))).toEqual(["FOR", "ME"]);
  });
});
