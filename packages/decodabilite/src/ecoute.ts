import type { Segment } from "./types";

/** Répartit les segments (graphèmes) d'un mot dans ses syllabes affichées. */
export function grouperParSyllabe(segments: readonly Segment[], syllabes: readonly string[]): Segment[][] {
  const groupes: Segment[][] = [];
  let i = 0;
  for (const syl of syllabes) {
    const g: Segment[] = [];
    let longueur = 0;
    while (i < segments.length && longueur < syl.length) {
      g.push(segments[i]!);
      longueur += segments[i]!.g.length;
      i++;
    }
    groupes.push(g);
  }
  if (i < segments.length) groupes.at(-1)?.push(...segments.slice(i));
  return groupes;
}

/** Vrai si on entend le phonème dans le mot (les lettres muettes ne comptent pas). */
export function contientPhoneme(segments: readonly Segment[], phoneme: string): boolean {
  return segments.some((s) => !s.muet && s.p === phoneme);
}

/** Index des syllabes dans lesquelles on entend le phonème (activité A2 « Où est le son ? »). */
export function syllabesAvecPhoneme(segments: readonly Segment[], syllabes: readonly string[], phoneme: string): number[] {
  return grouperParSyllabe(segments, syllabes)
    .map((g, i) => (contientPhoneme(g, phoneme) ? i : -1))
    .filter((i) => i !== -1);
}
