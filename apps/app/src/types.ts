import type { Segment } from "@syllakids/decodabilite";

export interface ItemSyllabe { id: string; type: "syllabe"; texte: string; api: string }
export interface ItemMot {
  id: string; type: "mot"; texte: string; rangMin: number; syllabes: string[]; segments: Segment[]; api: string; image: string; motOutil?: boolean;
}
export interface ItemPhrase { id: string; type: "phrase"; texte: string; rangMin: number; image: string }
export type Item = ItemSyllabe | ItemMot | ItemPhrase;

export interface Unite {
  id: string; rang: number; titre: string; bloc: "voyelles" | "sons-simples" | "bilan";
  graphemes: { g: string; p: string; type: "voyelle" | "consonne-longue" | "occlusive" }[];
  motsOutils: string[];
  revision?: string[][];
}
export interface FichierUnite { version: string; unite: Unite; items: Item[] }

export type Profil = "5ans" | "6ans";
