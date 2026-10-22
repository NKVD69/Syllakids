/**
 * Évaluation d'un tracé de lettre capitale (cahier des charges, section 7).
 * Coordonnées dans le repère des modèles : x de 0 à 100, y de 0 (haut) à 100 (ligne de base),
 * y négatif pour les accents.
 */
export type Point = readonly [number, number];
export type Trait = readonly Point[];

export type Etape = "repasser" | "guide" | "libre";

export interface Resultat {
  ok: boolean;
  /** Identifiant du message à dire à l'enfant (onglet « Consignes et messages »). */
  message: string;
  /** Index du trait du modèle concerné par l'erreur. */
  trait?: number;
}

const N = 32;
/** Distance moyenne maximale (en unités du modèle) pour accepter la forme d'un trait. */
export const SEUILS: Record<Etape, number> = { repasser: 16, guide: 20, libre: 24 };
/** Distance maximale entre le point de départ de l'enfant et celui du modèle. */
const SEUIL_DEPART = 25;
/** Écart maximal entre deux traits de l'enfant pour les considérer comme un seul geste. */
const SEUIL_RACCORD = 22;

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function longueur(t: Trait): number {
  let l = 0;
  for (let i = 1; i < t.length; i++) l += dist(t[i - 1]!, t[i]!);
  return l;
}

/** Ré-échantillonne un trait en N points également espacés. */
export function reechantillonner(t: Trait, n = N): Point[] {
  if (t.length === 0) return [];
  if (t.length === 1) return Array.from({ length: n }, () => t[0]!);
  const total = longueur(t);
  if (total === 0) return Array.from({ length: n }, () => t[0]!);
  const pas = total / (n - 1);
  const res: Point[] = [t[0]!];
  let reste = pas;
  for (let i = 1; i < t.length && res.length < n; i++) {
    let a = t[i - 1]!;
    const b = t[i]!;
    let d = dist(a, b);
    while (d >= reste && res.length < n) {
      const r = reste / d;
      const p: Point = [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
      res.push(p);
      a = p;
      d = dist(a, b);
      reste = pas;
    }
    reste -= d;
  }
  while (res.length < n) res.push(t[t.length - 1]!);
  return res;
}

export function ecartMoyen(a: Trait, b: Trait): number {
  const ra = reechantillonner(a);
  const rb = reechantillonner(b);
  let s = 0;
  for (let i = 0; i < N; i++) s += dist(ra[i]!, rb[i]!);
  return s / N;
}

/** Regroupe les traits de l'enfant qui se suivent sans vrai lever de doigt. */
function raccorder(traits: Trait[], cible: number): Trait[] {
  const t = traits.map((x) => [...x]);
  while (t.length > cible) {
    let meilleur = -1;
    let ecart = Infinity;
    for (let i = 0; i < t.length - 1; i++) {
      const e = dist(t[i]!.at(-1)!, t[i + 1]![0]!);
      if (e < ecart) {
        ecart = e;
        meilleur = i;
      }
    }
    if (meilleur === -1 || ecart > SEUIL_RACCORD) break;
    t.splice(meilleur, 2, [...t[meilleur]!, ...t[meilleur + 1]!]);
  }
  return t;
}

function messageSens(modele: Trait): string {
  if (modele.length > 6) return "CON-TR-06"; // rond ou pont : il tourne de l'autre côté
  if (modele.length > 2) return "CON-TR-02"; // trait brisé (M, N, V, Z…) commencé par la fin
  const [x0, y0] = modele[0]!;
  const [x1, y1] = modele.at(-1)!;
  if (y1 - y0 > 10) return "CON-TR-03"; // trait qui descend, commencé en bas
  if (Math.abs(y1 - y0) <= 10 && x1 > x0) return "CON-TR-05"; // trait horizontal, commencé à droite
  return "CON-TR-02";
}

function hauteur(traits: readonly Trait[]): number {
  const ys = traits.flat().map((p) => p[1]);
  return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
}

/** Tolérance du tracé « souple » (réglage pour les enfants qui ont des difficultés motrices). */
export const SOUPLESSE = 1.35;

export function evaluer(modele: readonly Trait[], enfant: readonly Trait[], etape: Etape, souplesse = 1): Resultat {
  const traits = enfant.filter((t) => t.length > 1);
  if (traits.length === 0) return { ok: false, message: "CON-E1-RELANCE" };

  const seuil = SEUILS[etape] * souplesse;
  const groupes = raccorder(traits, modele.length);
  if (groupes.length < modele.length) return { ok: false, message: "CON-TR-07", trait: groupes.length };
  if (groupes.length > modele.length) return { ok: false, message: "CON-TR-12" };

  if (hauteur(groupes) < (souplesse > 1 ? 0.5 : 0.6) * hauteur(modele)) return { ok: false, message: "CON-TR-10" };

  for (let i = 0; i < modele.length; i++) {
    const m = modele[i]!;
    const e = groupes[i]!;
    const direct = ecartMoyen(e, m);
    if (direct <= seuil) {
      if (dist(e[0]!, m[0]!) > SEUIL_DEPART * souplesse) return { ok: false, message: "CON-TR-02", trait: i };
      continue;
    }
    const inverse = ecartMoyen(e, [...m].reverse());
    if (inverse <= seuil) return { ok: false, message: messageSens(m), trait: i };
    const autre = modele.findIndex((mj, j) => j !== i && ecartMoyen(e, mj) <= seuil);
    if (autre !== -1) return { ok: false, message: "CON-TR-08", trait: i };
    return { ok: false, message: etape === "repasser" ? "CON-TR-09" : "CON-TR-12", trait: i };
  }
  return { ok: true, message: "CON-TR-13" };
}
