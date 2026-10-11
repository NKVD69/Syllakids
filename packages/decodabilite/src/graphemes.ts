/**
 * Inventaire des graphèmes du MVP (voyelles + 13 consonnes simples)
 * et ordre d'apprentissage de la progression adaptée (cahier des charges, section 2 bis).
 */

/** Ordre d'introduction des consonnes : consonnes longues d'abord, occlusives ensuite. */
export const ORDRE_CONSONNES = ["L", "M", "R", "S", "F", "N", "V", "J", "Z", "P", "T", "B", "D"] as const;
export type Consonne = (typeof ORDRE_CONSONNES)[number];

/** Voyelles du rang 0, avec leur phonème (API). Le E seul se lit [ə] en lecture syllabique. */
export const VOYELLES: Readonly<Record<string, string>> = {
  A: "a",
  E: "ə",
  I: "i",
  O: "o",
  U: "y",
  Y: "i",
  É: "e",
  È: "ɛ",
  Ê: "ɛ",
};

/** Consonnes simples, avec leur phonème (API). */
export const CONSONNES: Readonly<Record<Consonne, string>> = {
  L: "l",
  M: "m",
  R: "ʁ",
  S: "s",
  F: "f",
  N: "n",
  V: "v",
  J: "ʒ",
  Z: "z",
  P: "p",
  T: "t",
  B: "b",
  D: "d",
};

/** Consonnes qu'on peut prolonger (activité R2 « Le son qui dure »). */
export const CONSONNES_LONGUES: ReadonlySet<string> = new Set(["L", "M", "R", "S", "F", "N", "V", "J", "Z"]);

/** Mini-unités placées par les listes de mots. */
export const RANG_SYLLABE_FERMEE = 3; // « L ou R qui ferme la syllabe » (SUR, MUR, OMAR)
export const RANG_S_PLURIEL = 4; // « S muet du pluriel » (LES AMIS)

/** Rang maximal du MVP (D). */
export const RANG_MAX_MVP = ORDRE_CONSONNES.length;

export function estVoyelle(lettre: string | undefined): boolean {
  return lettre !== undefined && lettre in VOYELLES;
}

export function estConsonne(lettre: string | undefined): lettre is Consonne {
  return lettre !== undefined && (ORDRE_CONSONNES as readonly string[]).includes(lettre);
}

/** Rang auquel une lettre devient lisible : 0 pour les voyelles, 1 à 13 pour les consonnes. */
export function rangLettre(lettre: string): number | undefined {
  if (estVoyelle(lettre)) return 0;
  const i = (ORDRE_CONSONNES as readonly string[]).indexOf(lettre);
  return i === -1 ? undefined : i + 1;
}

export function phonemeLettre(lettre: string): string | undefined {
  return VOYELLES[lettre] ?? (estConsonne(lettre) ? CONSONNES[lettre] : undefined);
}
