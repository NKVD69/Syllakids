/** Outils de dessin partagés par les activités d'écriture (E1 tracé, E2 dictée). */
import type { Point, Trait } from "./evaluer";

export interface Repere { s: number; x0: number; y0: number; largeur: number; hauteur: number }

/** Taille du canevas et passage du repère du modèle (0-100) aux pixels. */
export function calculerRepere(largeur: number, hauteur: number): Repere {
  const cap = Math.min(hauteur * 0.6, largeur * 0.62);
  const s = cap / 100;
  return { s, x0: (largeur - 100 * s) / 2, y0: hauteur * 0.27, largeur, hauteur };
}
export const versEcran = (r: Repere, [x, y]: Point): Point => [r.x0 + x * r.s, r.y0 + y * r.s];
export const versModele = (r: Repere, x: number, y: number): Point => [(x - r.x0) / r.s, (y - r.y0) / r.s];

export function dessinerReglure(ctx: CanvasRenderingContext2D, r: Repere, marge = true) {
  const il = (100 * r.s) / 3; // la capitale occupe 3 interlignes
  const base = r.y0 + 100 * r.s;
  ctx.lineWidth = 1;
  for (let k = -12; k <= 12; k++) {
    const y = base - k * il;
    if (y < 0 || y > r.hauteur) continue;
    const forte = k % 4 === 0;
    ctx.strokeStyle = forte ? "#93a6d8" : "#cdd6ee";
    ctx.lineWidth = forte ? 1.6 : 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(r.largeur, y); ctx.stroke();
  }
  for (let x = (marge ? 48 : 0) + il * 4; marge && x < r.largeur; x += il * 4) {
    ctx.strokeStyle = "#cdd6ee"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, r.hauteur); ctx.stroke();
  }
  if (marge) {
    ctx.strokeStyle = "#e07a86"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(47, 0); ctx.lineTo(47, r.hauteur); ctx.stroke();
  }
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

export function pointDepart(ctx: CanvasRenderingContext2D, r: Repere, t: Trait, numero?: number) {
  const [x, y] = versEcran(r, t[0]!);
  ctx.fillStyle = "#2e9e5b";
  ctx.beginPath(); ctx.arc(x, y, Math.max(10, r.s * 6), 0, Math.PI * 2); ctx.fill();
  if (numero !== undefined) {
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${Math.max(12, r.s * 7)}px Andika, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(numero), x, y + 1);
  }
}

