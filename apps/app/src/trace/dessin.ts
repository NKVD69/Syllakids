/** Outils de dessin partagés par les activités d'écriture (E1 tracé, E2 dictée). */
import type { Point, Trait } from "./evaluer";

export interface Repere { s: number; x0: number; y0: number; largeur: number; hauteur: number }

/** Taille du canevas et passage du repère du modèle (0-100) aux pixels. */
export function calculerRepere(largeur: number, hauteur: number): Repere {
  const cap = Math.min(hauteur * 0.6, largeur * 0.62);
  const s = cap / 100;
  return { s, x0: (largeur - 100 * s) / 2, y0: hauteur * 0.27, largeur, hauteur };
}
/** Écart entre deux lettres d'une ligne, en unités du modèle (lettre de 100 de large, plus l'espace). */
export const PAS_LIGNE = 135;

/**
 * Repère d'une ligne de n lettres identiques : même taille pour toutes, la plus grande qui tienne
 * en largeur (et en hauteur : capitale au plus 60 % de la hauteur). La case k s'obtient avec repereCase.
 */
export function repereLigne(largeur: number, hauteur: number, n: number): Repere {
  const s = Math.min((hauteur * 0.6) / 100, largeur / (n * PAS_LIGNE));
  const x0 = (largeur - n * PAS_LIGNE * s) / 2 + ((PAS_LIGNE - 100) / 2) * s;
  // un peu plus de place au-dessus (accents) qu'en dessous
  const y0 = (hauteur - 100 * s) / 2 + 8 * s;
  return { s, x0, y0, largeur, hauteur };
}

export function repereCase(ligne: Repere, k: number): Repere {
  return { ...ligne, x0: ligne.x0 + k * PAS_LIGNE * ligne.s };
}

export const versEcran = (r: Repere, [x, y]: Point): Point => [r.x0 + x * r.s, r.y0 + y * r.s];
export const versModele = (r: Repere, x: number, y: number): Point => [(x - r.x0) / r.s, (y - r.y0) / r.s];

/**
 * Réglure Seyès du canevas, à l'échelle de la lettre modèle : ligne forte sous la lettre,
 * capitale sur 3 interlignes, lignes verticales tous les 4 interlignes. Fond blanc opaque.
 */
export function dessinerReglure(ctx: CanvasRenderingContext2D, r: Repere, verticales = true) {
  const il = (100 * r.s) / 3; // la capitale occupe 3 interlignes
  const base = r.y0 + 100 * r.s;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, r.largeur, r.hauteur);
  for (let k = -12; k <= 12; k++) {
    const y = base - k * il;
    if (y < 0 || y > r.hauteur) continue;
    const forte = k % 4 === 0;
    ctx.strokeStyle = forte ? "#93a6d8" : "#cdd6ee";
    ctx.lineWidth = forte ? 1.6 : 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(r.largeur, y); ctx.stroke();
  }
  if (!verticales) return;
  // une verticale juste avant la lettre, puis tous les 4 interlignes de part et d'autre
  const depart = r.x0 - il / 2;
  for (let x = depart - Math.ceil(depart / (4 * il)) * 4 * il; x < r.largeur; x += 4 * il) {
    if (x < 0) continue;
    ctx.strokeStyle = "#dfe5f4"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, r.hauteur); ctx.stroke();
  }
}

/** Point situé à la distance d (unités du modèle) du début du trait, en suivant le trait. */
function avancer(t: Trait, d: number): Point {
  let reste = d;
  for (let i = 1; i < t.length; i++) {
    const [ax, ay] = t[i - 1]!;
    const [bx, by] = t[i]!;
    const l = Math.hypot(bx - ax, by - ay);
    if (l >= reste && l > 0) return [ax + ((bx - ax) * reste) / l, ay + ((by - ay) * reste) / l];
    reste -= l;
  }
  return t[t.length - 1]!;
}

/**
 * Où placer le numéro de chaque trait. Quand deux traits partent du même point (A, B, D, E, F, M, N, P, R…),
 * le numéro du second est décalé le long de son trait : sinon il recouvre le « 1 » et la numérotation
 * semble commencer à 2.
 */
export function positionsNumeros(modele: readonly Trait[], ecart = 16): Point[] {
  const places: Point[] = [];
  for (const t of modele) {
    let p: Point = t[0]!;
    for (let d = ecart; places.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < ecart) && d <= ecart * 4; d += ecart / 2) {
      p = avancer(t, d);
    }
    places.push(p);
  }
  return places;
}

export function tracerChemin(ctx: CanvasRenderingContext2D, r: Repere, t: Trait, jusqua = 1) {
  const n = Math.max(2, Math.ceil(t.length * jusqua));
  ctx.beginPath();
  t.slice(0, n).forEach((p, i) => {
    const [x, y] = versEcran(r, p);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export function pointDepart(ctx: CanvasRenderingContext2D, r: Repere, t: Trait, numero?: number, place?: Point) {
  const [x, y] = versEcran(r, place ?? t[0]!);
  ctx.fillStyle = "#2e9e5b";
  ctx.beginPath(); ctx.arc(x, y, Math.max(10, r.s * 6), 0, Math.PI * 2); ctx.fill();
  if (numero !== undefined) {
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${Math.max(12, r.s * 7)}px Andika, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(numero), x, y + 1);
  }
}

