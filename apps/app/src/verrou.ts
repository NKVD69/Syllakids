/**
 * Verrou des écrans réservés aux adultes (paramètres, espace adulte) : un calcul de niveau CE1,
 * hors de portée d'un enfant de 5-6 ans qui apprend à lire, immédiat pour un adulte.
 */

export interface QuestionCalcul {
  texte: string;
  reponse: number;
}

type Hasard = () => number;
const entre = (h: Hasard, min: number, max: number) => min + Math.floor(h() * (max - min + 1));

/**
 * Trois sortes de calculs du programme de CE1 :
 * addition avec retenue (47 + 25), soustraction avec retenue (63 − 28), tables de 2 à 5 (4 × 7).
 */
export function questionCE1(h: Hasard = Math.random): QuestionCalcul {
  const sorte = entre(h, 0, 2);
  if (sorte === 0) {
    for (;;) {
      const a = entre(h, 15, 69);
      const b = entre(h, 13, 39);
      if ((a % 10) + (b % 10) >= 10 && a + b < 100) return { texte: `${a} + ${b}`, reponse: a + b };
    }
  }
  if (sorte === 1) {
    for (;;) {
      const a = entre(h, 31, 95);
      const b = entre(h, 12, 49);
      if (a % 10 < b % 10 && a - b >= 11) return { texte: `${a} − ${b}`, reponse: a - b };
    }
  }
  const a = entre(h, 2, 5);
  const b = entre(h, 3, 9);
  return { texte: `${a} × ${b}`, reponse: a * b };
}

/** Après 3 mauvaises réponses, il faut attendre avant de réessayer (on ne devine pas en tapant au hasard). */
export const ESSAIS_AVANT_ATTENTE = 3;
export const ATTENTE_MS = 30_000;

/** L'accès reste ouvert 10 minutes après le dernier passage, puis se referme. */
const DUREE_OUVERTURE = 10 * 60 * 1000;
let ouvertJusqua = 0;

export function estOuvert(maintenant = Date.now()): boolean {
  return maintenant < ouvertJusqua;
}

export function ouvrir(maintenant = Date.now()) {
  ouvertJusqua = maintenant + DUREE_OUVERTURE;
}

export function fermer() {
  ouvertJusqua = 0;
}
