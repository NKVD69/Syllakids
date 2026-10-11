export interface Segment {
  /** Graphème écrit (une ou plusieurs lettres). */
  g: string;
  /** Phonème en API ; chaîne vide pour une lettre muette. */
  p: string;
  /** Lettre écrite mais non prononcée (affichée en gris). */
  muet?: boolean;
}

export interface AnalyseMot {
  ok: true;
  mot: string;
  segments: Segment[];
  /** Découpage syllabique pour l'affichage (arcs sous les syllabes). */
  syllabes: string[];
  /** Rang minimal à partir duquel le mot est lisible sans deviner. */
  rang: number;
  /** Mot-outil enseigné explicitement (section 2 bis). */
  motOutil?: { explication?: string };
}

export interface EchecMot {
  ok: false;
  mot: string;
  problemes: string[];
}

export type ResultatMot = AnalyseMot | EchecMot;
