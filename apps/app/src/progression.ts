import type { EtatItem } from "./revisions";
import type { Profil } from "./types";

export interface Reglages {
  profil: Profil;
  dys: boolean;
  /** Durée maximale de lecture par jour, en minutes (0 ou absent : pas de limite). */
  dureeMax?: number;
  /** Syllabes en couleurs alternées (bleu, rouge). Absent : oui. */
  couleurs?: boolean;
  /** Arcs sous les syllabes. Absent : oui. */
  arcs?: boolean;
  /** Mots et phrases plus grands (un quart en plus). */
  grandTexte?: boolean;
  /** Activités au micro (répéter, faire durer un son). Absent : oui. */
  micro?: boolean;
  /** Tracé des lettres jugé avec plus de tolérance (difficultés motrices). */
  traceSouple?: boolean;
}

export interface Progression {
  terminees: string[];
  /** Nombre de séances faites par unité. */
  seances: Record<string, number>;
  /** État de révision de chaque item lu ou écrit (boîtes de Leitner). */
  items: Record<string, EtatItem>;
  /** Meilleur score de chrono-lecture (mots lus en une minute). */
  fluence?: { meilleur: number; date: string };
  reglages: Reglages;
  /** Date de la dernière modification des réglages (ISO 8601), pour la synchronisation. */
  reglagesMaj?: string;
  /** Temps de lecture en secondes, par appareil puis par jour (AAAA-MM-JJ). */
  temps?: Record<string, Record<string, number>>;
}

export const PROGRESSION_VIDE: Progression = { terminees: [], seances: {}, items: {}, reglages: { profil: "6ans", dys: false } };

/** Complète une progression lue (stockage, serveur) avec les valeurs par défaut. */
export function normaliser(brut: unknown): Progression {
  const p = (brut && typeof brut === "object" ? brut : {}) as Partial<Progression>;
  return {
    ...p,
    terminees: Array.isArray(p.terminees) ? p.terminees : [],
    seances: p.seances ?? {},
    items: p.items ?? {},
    reglages: { ...PROGRESSION_VIDE.reglages, ...p.reglages },
  };
}

/** Une unité est ouverte si toutes les précédentes sont terminées. */
export function estOuverte(p: Progression, ordre: string[], id: string): boolean {
  const i = ordre.indexOf(id);
  return i <= 0 || ordre.slice(0, i).every((u) => p.terminees.includes(u));
}

/** Secondes de lecture d'un jour, tous appareils confondus. */
export function tempsDuJour(p: Progression, j: string): number {
  return Object.values(p.temps ?? {}).reduce((s, parJour) => s + (parJour[j] ?? 0), 0);
}

/** Secondes de lecture sur une liste de jours. */
export function tempsSur(p: Progression, jours: string[]): number {
  return jours.reduce((s, j) => s + tempsDuJour(p, j), 0);
}

/** Ajoute du temps de lecture pour cet appareil. */
export function ajouterTemps(p: Progression, appareil: string, j: string, secondes: number): Progression {
  const temps = { ...(p.temps ?? {}) };
  temps[appareil] = { ...(temps[appareil] ?? {}), [j]: (temps[appareil]?.[j] ?? 0) + secondes };
  return { ...p, temps };
}

function plusRecentItem(a: EtatItem, b: EtatItem): EtatItem {
  if (a.vu && b.vu && a.vu !== b.vu) return a.vu > b.vu ? a : b;
  if (!!a.vu !== !!b.vu) return a.vu ? a : b;
  return b.essais > a.essais ? b : a;
}

/**
 * Fusionne deux progressions du même enfant (deux appareils, ou l'appareil et le serveur).
 * Rien de ce qui a été appris n'est perdu : unités terminées réunies, séances au maximum,
 * pour chaque item la réponse la plus récente, record de lecture le plus haut, temps de chaque appareil.
 * La fusion est commutative et idempotente, pour que tous les appareils convergent.
 */
export function fusionner(a: Progression, b: Progression): Progression {
  const terminees = [...new Set([...a.terminees, ...b.terminees])].sort();
  const seances: Record<string, number> = { ...a.seances };
  for (const [u, n] of Object.entries(b.seances)) seances[u] = Math.max(seances[u] ?? 0, n);
  const items: Record<string, EtatItem> = { ...a.items };
  for (const [id, e] of Object.entries(b.items)) items[id] = items[id] ? plusRecentItem(items[id]!, e) : e;
  const fluences = [a.fluence, b.fluence].filter((f): f is NonNullable<Progression["fluence"]> => !!f);
  const fluence = fluences.sort((x, y) => y.meilleur - x.meilleur || x.date.localeCompare(y.date))[0];
  const ra = a.reglagesMaj ?? "";
  const rb = b.reglagesMaj ?? "";
  const reglagesDe = rb > ra || (rb === ra && JSON.stringify(b.reglages) > JSON.stringify(a.reglages)) ? b : a;
  const temps: Record<string, Record<string, number>> = {};
  for (const src of [a.temps ?? {}, b.temps ?? {}]) {
    for (const [app, parJour] of Object.entries(src)) {
      temps[app] ??= {};
      for (const [j, s] of Object.entries(parJour)) temps[app]![j] = Math.max(temps[app]![j] ?? 0, s);
    }
  }
  const r: Progression = { terminees, seances, items, reglages: { ...reglagesDe.reglages } };
  if (fluence) r.fluence = fluence;
  if (reglagesDe.reglagesMaj) r.reglagesMaj = reglagesDe.reglagesMaj;
  if (Object.keys(temps).length) r.temps = temps;
  return r;
}

/** Égalité de contenu (indépendante de l'ordre des clés). */
export function memeProgression(a: Progression, b: Progression): boolean {
  const trier = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(trier) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)).map(([k, w]) => [k, trier(w)])) : v;
  return JSON.stringify(trier(a)) === JSON.stringify(trier(b));
}
