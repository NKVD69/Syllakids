import type { Profil } from "./types";

export interface Reglages { profil: Profil; dys: boolean }
export interface Progression { terminees: string[]; reglages: Reglages }

const CLE = "syllakids:progression:v1";
const DEFAUT: Progression = { terminees: [], reglages: { profil: "6ans", dys: false } };

export function charger(): Progression {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return structuredClone(DEFAUT);
    const p = JSON.parse(brut) as Partial<Progression>;
    return { terminees: p.terminees ?? [], reglages: { ...DEFAUT.reglages, ...p.reglages } };
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
