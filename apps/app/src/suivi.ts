/**
 * Indicateurs de suivi pour les adultes, calculés à partir de la progression d'un enfant.
 * Pas de classement ni de comparaison entre enfants (cahier des charges § 11).
 */
import { ajouterJours, jour } from "./revisions";
import { normaliser, tempsSur, type Progression } from "./progression";

export interface UniteResumee { id: string; titre: string; bloc: string }

export interface Suivi {
  /** Unité en cours (la première ouverte non terminée), ou null si tout est fini. */
  courante: UniteResumee | null;
  /** Séances faites dans l'unité en cours. */
  seancesCourante: number;
  terminees: number;
  total: number;
  /** Minutes de lecture sur les 7 derniers jours, aujourd'hui compris. */
  minutesSemaine: number;
  /** Minutes par jour sur les 14 derniers jours (du plus ancien au plus récent). */
  minutesParJour: { jour: string; minutes: number }[];
  /** Réussite sur les réponses notées des 14 derniers jours (null si aucune). */
  reussiteRecente: number | null;
  /** Éléments à retravailler : réponses récentes fausses et peu de réussites. */
  difficultes: string[];
  /** Éléments à revoir aujourd'hui (révisions espacées). */
  aRevoir: number;
  fluence: number | null;
  /** Date de la dernière réponse (AAAA-MM-JJ), null si l'enfant n'a encore rien fait. */
  derniereActivite: string | null;
}

export function suivre(brut: unknown, unites: UniteResumee[], aujourdhui = jour()): Suivi {
  const p: Progression = normaliser(brut);
  const courante = unites.find((u) => !p.terminees.includes(u.id)) ?? null;
  const jours14 = Array.from({ length: 14 }, (_, k) => ajouterJours(aujourdhui, k - 13));
  const items = Object.entries(p.items);
  const debut14 = jours14[0]!;
  const recents = items.filter(([, e]) => (e.vu ?? "").slice(0, 10) >= debut14);
  const essais = recents.reduce((s, [, e]) => s + e.essais, 0);
  const reussites = recents.reduce((s, [, e]) => s + e.reussites, 0);
  const difficultes = items
    .filter(([, e]) => e.boite === 1 && e.essais >= 2 && e.reussites / e.essais < 0.6)
    .sort(([, a], [, b]) => (b.vu ?? "").localeCompare(a.vu ?? ""))
    .map(([id]) => id);
  const derniere = items.reduce((m, [, e]) => ((e.vu ?? "") > m ? e.vu ?? "" : m), "");
  return {
    courante,
    seancesCourante: courante ? p.seances[courante.id] ?? 0 : 0,
    terminees: unites.filter((u) => p.terminees.includes(u.id)).length,
    total: unites.length,
    minutesSemaine: Math.round(tempsSur(p, jours14.slice(7)) / 60),
    minutesParJour: jours14.map((j) => ({ jour: j, minutes: Math.round(tempsSur(p, [j]) / 60) })),
    reussiteRecente: essais ? reussites / essais : null,
    difficultes,
    aRevoir: items.filter(([, e]) => e.prochaine <= aujourdhui).length,
    fluence: p.fluence?.meilleur ?? null,
    derniereActivite: derniere ? derniere.slice(0, 10) : null,
  };
}

/** Échappe une valeur pour un fichier CSV (séparateur point-virgule, lu correctement par un tableur français). */
export function celluleCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[;"\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s;
}

export function csv(lignes: unknown[][]): string {
  return "﻿" + lignes.map((l) => l.map(celluleCsv).join(";")).join("\r\n") + "\r\n";
}
