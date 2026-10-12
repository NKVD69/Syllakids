/**
 * Révisions espacées (boîtes de Leitner) et critère de maîtrise (cahier des charges, section 9).
 * Fonctions pures : aucune dépendance au navigateur.
 */
import type { Profil } from "./types";

export interface EtatItem {
  /** Boîte de 1 à 5. */
  boite: number;
  /** Date de la prochaine révision, AAAA-MM-JJ (heure locale). */
  prochaine: string;
  essais: number;
  reussites: number;
  /** Unité d'origine de l'item. */
  unite: string;
}

/** Délai avant la prochaine révision selon la boîte : 1, 2, 4, 8 puis 16 jours. */
export const INTERVALLES = [1, 2, 4, 8, 16] as const;

export function jour(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ajouterJours(j: string, n: number): string {
  const [a, m, d] = j.split("-").map(Number) as [number, number, number];
  return jour(new Date(a, m - 1, d + n));
}

/** Met à jour un item après une réponse : réussite = boîte suivante ; erreur = retour en boîte 1. */
export function noterItem(etat: EtatItem | undefined, reussi: boolean, unite: string, aujourdhui: string): EtatItem {
  const boite = reussi ? Math.min(5, (etat?.boite ?? 0) + 1) : 1;
  return {
    boite,
    prochaine: ajouterJours(aujourdhui, INTERVALLES[boite - 1]!),
    essais: (etat?.essais ?? 0) + 1,
    reussites: (etat?.reussites ?? 0) + (reussi ? 1 : 0),
    unite: etat?.unite ?? unite,
  };
}

/** Items à revoir aujourd'hui, les plus fragiles d'abord (boîte basse, retard le plus ancien). */
export function itemsDus(
  items: Readonly<Record<string, EtatItem>>,
  aujourdhui: string,
  options: { exclureUnite?: string; max?: number } = {},
): string[] {
  return Object.entries(items)
    .filter(([, e]) => e.prochaine <= aujourdhui && e.unite !== options.exclureUnite)
    .sort(([, a], [, b]) => a.boite - b.boite || a.prochaine.localeCompare(b.prochaine))
    .slice(0, options.max ?? 5)
    .map(([id]) => id);
}

export interface BilanSeance {
  essais: number;
  reussites: number;
}

/** Seuil de réussite de la séance 2 pour valider une unité : 85 % à 5 ans, 90 % à 6 ans. */
export function seuilMaitrise(profil: Profil): number {
  return profil === "5ans" ? 0.85 : 0.9;
}

export function estMaitrisee(bilan: BilanSeance, profil: Profil): boolean {
  if (bilan.essais === 0) return true;
  return bilan.reussites / bilan.essais >= seuilMaitrise(profil);
}
