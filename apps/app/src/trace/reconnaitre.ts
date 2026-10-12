/**
 * Reconnaissance d'une lettre dictée (activité E2), par comparaison de nuages de points
 * (méthode $P de Vatavu, Anthony et Wobbrock, 2012). L'application connaît la réponse attendue :
 * elle vérifie que la lettre la plus proche, parmi les lettres déjà apprises, est bien celle-là.
 * L'ordre et le sens des traits ne comptent pas ici (ils sont travaillés dans l'activité E1).
 */
import type { Point, Trait } from "./evaluer";

const N = 48;
type Nuage = Point[];

function longueur(t: Trait): number {
  let l = 0;
  for (let i = 1; i < t.length; i++) l += Math.hypot(t[i]![0] - t[i - 1]![0], t[i]![1] - t[i - 1]![1]);
  return l;
}

/** Répartit N points le long de tous les traits, proportionnellement à leur longueur. */
function echantillonner(traits: readonly Trait[]): Nuage {
  const utiles = traits.filter((t) => t.length > 0);
  const total = utiles.reduce((s, t) => s + longueur(t), 0);
  if (utiles.length === 0) return [];
  if (total === 0) return Array.from({ length: N }, () => utiles[0]![0]!);
  const pas = total / (N - 1);
  const res: Point[] = [];
  let reste = 0;
  for (const t of utiles) {
    if (res.length === 0 || reste === 0) res.push(t[0]!);
    let a = t[0]!;
    for (let i = 1; i < t.length; i++) {
      const b = t[i]!;
      let d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (reste + d >= pas && res.length < N) {
        const r = (pas - reste) / d;
        const p: Point = [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
        res.push(p);
        a = p;
        d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        reste = 0;
      }
      reste += d;
      a = b;
    }
  }
  while (res.length < N) res.push(utiles.at(-1)!.at(-1)!);
  return res.slice(0, N);
}

/** Centre le nuage et le ramène à une taille 1, en gardant les proportions. */
function normaliser(n: Nuage): Nuage {
  const xs = n.map((p) => p[0]);
  const ys = n.map((p) => p[1]);
  const taille = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const cx = xs.reduce((a, b) => a + b, 0) / n.length;
  const cy = ys.reduce((a, b) => a + b, 0) / n.length;
  return n.map(([x, y]) => [(x - cx) / taille, (y - cy) / taille] as const);
}

export function nuage(traits: readonly Trait[]): Nuage {
  return normaliser(echantillonner(traits));
}

function distanceAppariement(a: Nuage, b: Nuage, debut: number): number {
  const pris = new Array<boolean>(N).fill(false);
  let somme = 0;
  let i = debut;
  do {
    let meilleur = Infinity;
    let index = -1;
    for (let j = 0; j < N; j++) {
      if (pris[j]) continue;
      const d = Math.hypot(a[i]![0] - b[j]![0], a[i]![1] - b[j]![1]);
      if (d < meilleur) {
        meilleur = d;
        index = j;
      }
    }
    pris[index] = true;
    const poids = 1 - ((i - debut + N) % N) / N;
    somme += poids * meilleur;
    i = (i + 1) % N;
  } while (i !== debut);
  return somme;
}

/** Distance $P entre deux nuages normalisés. */
export function distance(a: Nuage, b: Nuage): number {
  const pas = Math.floor(Math.sqrt(N));
  let min = Infinity;
  for (let i = 0; i < N; i += pas) min = Math.min(min, distanceAppariement(a, b, i), distanceAppariement(b, a, i));
  return min;
}

export interface Reconnaissance {
  lettre: string;
  distance: number;
  /** Les lettres candidates de la plus proche à la plus lointaine (sans accent). */
  classement: { lettre: string; distance: number }[];
}

/** Distance maximale acceptée : au-delà, le tracé ne ressemble à aucune lettre. */
export const SEUIL_RECONNAISSANCE = 9;

const ACCENTUEES: Record<string, { base: string; accent: Accent }> = {
  É: { base: "E", accent: "aigu" },
  È: { base: "E", accent: "grave" },
  Ê: { base: "E", accent: "circonflexe" },
};
type Accent = "aigu" | "grave" | "circonflexe";

const yMin = (t: Trait) => Math.min(...t.map((p) => p[1]));
const yMax = (t: Trait) => Math.max(...t.map((p) => p[1]));

/** Sépare les petits traits placés au-dessus de tout le reste (accents) de la lettre elle-même. */
export function separerAccents(traits: readonly Trait[]): { base: Trait[]; accents: Trait[] } {
  const utiles = traits.filter((t) => t.length > 0);
  if (utiles.length < 2) return { base: [...utiles], accents: [] };
  const hauteur = Math.max(...utiles.map(yMax)) - Math.min(...utiles.map(yMin)) || 1;
  const accents: Trait[] = [];
  const base: Trait[] = [];
  for (const t of utiles) {
    const autres = utiles.filter((u) => u !== t);
    const auDessus = yMax(t) < Math.min(...autres.map(yMin));
    if (auDessus && yMax(t) - yMin(t) < 0.35 * hauteur) accents.push(t);
    else base.push(t);
  }
  return base.length ? { base, accents } : { base: [...utiles], accents: [] };
}

/** Reconnaît un accent tracé d'un seul geste, quel que soit son sens. */
export function classerAccent(t: Trait): Accent {
  const xs = t.map((p) => p[0]);
  const largeur = Math.max(...xs) - Math.min(...xs) || 1;
  const sommet = t.reduce((k, p, i) => (p[1] < t[k]![1] ? i : k), 0);
  const [x0, y0] = t[0]!;
  const [x1, y1] = t.at(-1)!;
  const auMilieu = sommet > t.length * 0.2 && sommet < t.length * 0.8;
  if (auMilieu && y0 - t[sommet]![1] > 0.25 * largeur && y1 - t[sommet]![1] > 0.25 * largeur) return "circonflexe";
  // en coordonnées écran (y vers le bas), « / » monte vers la droite
  return (y1 - y0) * (x1 - x0) < 0 ? "aigu" : "grave";
}

export function reconnaitre(traits: readonly Trait[], modeles: Readonly<Record<string, readonly Trait[]>>): Reconnaissance | null {
  const { base, accents } = separerAccents(traits);
  const n = nuage(base);
  if (n.length < N) return null;
  const candidats = Object.entries(modeles).filter(([l]) => !(l in ACCENTUEES));
  if (Object.keys(modeles).some((l) => l in ACCENTUEES) && !candidats.some(([l]) => l === "E")) {
    candidats.push(["E", modeles["É"] ? separerAccents(modeles["É"]).base : []]);
  }
  const classement = candidats
    .map(([lettre, m]) => ({ lettre, distance: distance(n, nuage(m)) }))
    .sort((a, b) => a.distance - b.distance);
  const premier = classement[0];
  if (!premier) return null;
  let lettre = premier.lettre;
  if (lettre === "E" && accents.length === 1) {
    const type = classerAccent(accents[0]!);
    lettre = Object.entries(ACCENTUEES).find(([, v]) => v.accent === type)?.[0] ?? lettre;
  } else if (accents.length > 0) {
    lettre = `${lettre}?`; // accent sur une lettre qui n'en prend pas
  }
  return { lettre, distance: premier.distance, classement };
}

/** Vrai si le tracé est reconnu comme la lettre attendue parmi les lettres candidates. */
export function estLaLettre(traits: readonly Trait[], attendue: string, modeles: Readonly<Record<string, readonly Trait[]>>): boolean {
  const r = reconnaitre(traits, modeles);
  return r !== null && r.lettre === attendue && r.distance <= SEUIL_RECONNAISSANCE;
}
