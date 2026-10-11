import type { Segment } from "./types";

export interface MotOutil {
  mot: string;
  /** Rang d'introduction (section 2 bis du cahier des charges). */
  rang: number;
  segments: Segment[];
  syllabes: string[];
  /** Identifiant de la consigne qui explique la particularité (onglet « Consignes et messages »). */
  explication?: string;
}

const s = (g: string, p: string, muet = false): Segment => (muet ? { g, p, muet } : { g, p });

/**
 * Mots-outils introduits explicitement. Ceux qui sont déjà déchiffrables (LE, UNE, JE…) figurent
 * aussi ici pour fixer leur rang d'introduction et leur explication éventuelle.
 */
export const MOTS_OUTILS: readonly MotOutil[] = [
  { mot: "LE", rang: 1, segments: [s("L", "l"), s("E", "ə")], syllabes: ["LE"], explication: "CON-MO-01" },
  { mot: "LA", rang: 1, segments: [s("L", "l"), s("A", "a")], syllabes: ["LA"], explication: "CON-MO-01" },
  { mot: "A", rang: 1, segments: [s("A", "a")], syllabes: ["A"] },
  { mot: "À", rang: 1, segments: [s("À", "a")], syllabes: ["À"], explication: "CON-MO-02" },
  { mot: "LÀ", rang: 1, segments: [s("L", "l"), s("À", "a")], syllabes: ["LÀ"], explication: "CON-MO-02" },
  { mot: "IL", rang: 1, segments: [s("I", "i"), s("L", "l")], syllabes: ["IL"], explication: "CON-MO-03" },
  { mot: "Y", rang: 1, segments: [s("Y", "i")], syllabes: ["Y"], explication: "CON-MO-04" },
  { mot: "ELLE", rang: 1, segments: [s("E", "ɛ"), s("LL", "l"), s("E", "", true)], syllabes: ["EL", "LE"], explication: "CON-MO-05" },
  { mot: "LES", rang: 4, segments: [s("L", "l"), s("ES", "e")], syllabes: ["LES"], explication: "CON-MO-06" },
  { mot: "MES", rang: 4, segments: [s("M", "m"), s("ES", "e")], syllabes: ["MES"], explication: "CON-MO-06" },
  { mot: "SUR", rang: 4, segments: [s("S", "s"), s("U", "y"), s("R", "ʁ")], syllabes: ["SUR"], explication: "CON-MO-07" },
  { mot: "SES", rang: 4, segments: [s("S", "s"), s("ES", "e")], syllabes: ["SES"], explication: "CON-MO-08" },
  { mot: "EST", rang: 4, segments: [s("E", "ɛ"), s("S", "", true), s("T", "", true)], syllabes: ["EST"], explication: "CON-MO-09" },
  { mot: "UNE", rang: 6, segments: [s("U", "y"), s("N", "n"), s("E", "ə")], syllabes: ["U", "NE"] },
  { mot: "UN", rang: 6, segments: [s("UN", "œ̃")], syllabes: ["UN"], explication: "CON-MO-10" },
  { mot: "ET", rang: 6, segments: [s("E", "e"), s("T", "", true)], syllabes: ["ET"], explication: "CON-MO-11" },
  { mot: "JE", rang: 8, segments: [s("J", "ʒ"), s("E", "ə")], syllabes: ["JE"] },
  { mot: "NE", rang: 10, segments: [s("N", "n"), s("E", "ə")], syllabes: ["NE"], explication: "CON-MO-13" },
  { mot: "PAS", rang: 10, segments: [s("P", "p"), s("A", "a"), s("S", "", true)], syllabes: ["PAS"], explication: "CON-MO-12" },
  { mot: "TU", rang: 11, segments: [s("T", "t"), s("U", "y")], syllabes: ["TU"] },
  { mot: "TES", rang: 11, segments: [s("T", "t"), s("ES", "e")], syllabes: ["TES"], explication: "CON-MO-14" },
  { mot: "AS", rang: 11, segments: [s("A", "a"), s("S", "", true)], syllabes: ["AS"], explication: "CON-MO-15" },
  { mot: "DE", rang: 13, segments: [s("D", "d"), s("E", "ə")], syllabes: ["DE"] },
  { mot: "DU", rang: 13, segments: [s("D", "d"), s("U", "y")], syllabes: ["DU"] },
  { mot: "DES", rang: 13, segments: [s("D", "d"), s("ES", "e")], syllabes: ["DES"], explication: "CON-MO-16" },
];

const INDEX = new Map(MOTS_OUTILS.map((m) => [m.mot, m]));

export function trouverMotOutil(mot: string): MotOutil | undefined {
  return INDEX.get(mot);
}

/** Mots-outils disponibles à un rang donné. */
export function motsOutilsDisponibles(rang: number): MotOutil[] {
  return MOTS_OUTILS.filter((m) => m.rang <= rang);
}
