import type { EtatItem } from "./revisions";
import type { Profil } from "./types";

export interface Reglages { profil: Profil; dys: boolean }
export interface Progression {
  terminees: string[];
  /** Nombre de séances faites par unité. */
  seances: Record<string, number>;
  /** État de révision de chaque item lu ou écrit (boîtes de Leitner). */
  items: Record<string, EtatItem>;
  /** Meilleur score de chrono-lecture (mots lus en une minute). */
  fluence?: { meilleur: number; date: string };
  reglages: Reglages;
}

const CLE = "syllakids:progression:v1";
const DEFAUT: Progression = { terminees: [], seances: {}, items: {}, reglages: { profil: "6ans", dys: false } };

export function charger(): Progression {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return structuredClone(DEFAUT);
    const p = JSON.parse(brut) as Partial<Progression>;
    return { ...p, terminees: p.terminees ?? [], seances: p.seances ?? {}, items: p.items ?? {}, reglages: { ...DEFAUT.reglages, ...p.reglages } };
  } catch {
    return structuredClone(DEFAUT);
  }
}

export function enregistrer(p: Progression) {
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    /* stockage indisponible : la progression reste en mémoire */
  }
}

/** Une unité est ouverte si toutes les précédentes sont terminées. */
export function estOuverte(p: Progression, ordre: string[], id: string): boolean {
  const i = ordre.indexOf(id);
  return i <= 0 || ordre.slice(0, i).every((u) => p.terminees.includes(u));
}
