import {
  RANG_S_PLURIEL,
  RANG_SYLLABE_FERMEE,
  estConsonne,
  estVoyelle,
  phonemeLettre,
  rangLettre,
} from "./graphemes";
import { trouverMotOutil } from "./motsOutils";
import type { AnalyseMot, ResultatMot, Segment } from "./types";

/** Suites de voyelles qui formeraient un son complexe ou une lettre muette non encore enseignés. */
const SUITES_INTERDITES = new Set(["AI", "AU", "OU", "OI", "EU", "EI", "UI", "AY", "OY", "IE", "UE", "ÉE", "EA", "EE"]);
/** Voyelles après lesquelles L ou R peuvent fermer une syllabe sans changer de son. */
const VOYELLES_FERMABLES = new Set(["A", "I", "O", "U"]);

export function normaliser(mot: string): string {
  return mot.normalize("NFC").toLocaleUpperCase("fr-FR").trim();
}

/** Découpe une suite de lettres simples en syllabes : V, CV, ou CVC quand L/R ferme la syllabe. */
export function syllaber(lettres: readonly string[]): string[] {
  const syllabes: string[] = [];
  let courante = "";
  for (let i = 0; i < lettres.length; i++) {
    const l = lettres[i]!;
    courante += l;
    if (!estVoyelle(l)) continue;
    const suivante = lettres[i + 1];
    const apres = lettres[i + 2];
    if (suivante === undefined) continue;
    if (estVoyelle(suivante) || estVoyelle(apres)) {
      syllabes.push(courante);
      courante = "";
    } else {
      // consonne qui ferme la syllabe (fin de mot ou consonne suivante)
      courante += suivante;
      i++;
      syllabes.push(courante);
      courante = "";
    }
  }
  if (courante) {
    if (syllabes.length > 0 && ![...courante].some(estVoyelle)) syllabes[syllabes.length - 1] += courante;
    else syllabes.push(courante);
  }
  return syllabes;
}

/**
 * Analyse un mot : découpage en graphèmes, phonèmes, syllabes et rang minimal de lecture.
 * Renvoie un échec détaillé si le mot demande de deviner (son complexe, lettre muette, etc.).
 */
export function analyserMot(brut: string, options: { pluriel?: boolean } = {}): ResultatMot {
  const mot = normaliser(brut);
  const outil = trouverMotOutil(mot);
  if (outil) {
    return {
      ok: true,
      mot,
      segments: outil.segments.map((s) => ({ ...s })),
      syllabes: [...outil.syllabes],
      rang: outil.rang,
      motOutil: outil.explication ? { explication: outil.explication } : {},
    };
  }

  const problemes: string[] = [];
  let lettresMot = [...mot];
  let pluriel = false;
  if (options.pluriel && mot.length > 2 && mot.endsWith("S")) {
    // S final traité comme S muet du pluriel ; on vérifie le singulier
    const singulier = lettresMot.slice(0, -1);
    if (singulier.at(-1) !== "S") {
      lettresMot = singulier;
      pluriel = true;
    }
  }

  let rang = 0;
  let syllabeFermee = false;
  const n = lettresMot.length;
  if (n === 0) return { ok: false, mot, problemes: ["mot vide"] };

  for (let i = 0; i < n; i++) {
    const l = lettresMot[i]!;
    const prec = lettresMot[i - 1];
    const suiv = lettresMot[i + 1];
    const r = rangLettre(l);
    if (r === undefined) {
      problemes.push(`lettre ${l} pas encore enseignée`);
      continue;
    }
    rang = Math.max(rang, r);

    if (estVoyelle(l) && estVoyelle(suiv) && SUITES_INTERDITES.has(l + suiv)) {
      problemes.push(`suite ${l + suiv} (son complexe ou lettre muette)`);
    }
    if (l === "Y" && estVoyelle(prec) && estVoyelle(suiv)) problemes.push("Y entre deux voyelles");

    if (estConsonne(l)) {
      if (suiv === l) problemes.push(`lettre doublée ${l}${l}`);
      if ((l === "N" || l === "M") && estVoyelle(prec) && !estVoyelle(suiv)) {
        problemes.push(`son nasal ${prec}${l}`);
      }
      if (l === "S" && estVoyelle(prec) && estVoyelle(suiv)) problemes.push("S entre deux voyelles (se lit [z])");
      if (!estVoyelle(suiv)) {
        const fermable = (l === "L" || l === "R") && prec !== undefined && VOYELLES_FERMABLES.has(prec);
        if (fermable) syllabeFermee = true;
        else if (suiv === undefined) problemes.push(`consonne finale ${l}`);
        else if (suiv !== l) problemes.push(`groupe de consonnes ${l}${suiv}`);
      }
    }
    if (l === "E" && suiv !== undefined && !estVoyelle(suiv)) {
      const apres = lettresMot[i + 2];
      if (!estVoyelle(apres)) problemes.push("E devant une consonne qui ferme la syllabe");
    }
  }

  if (problemes.length > 0) return { ok: false, mot, problemes: [...new Set(problemes)] };

  if (syllabeFermee) rang = Math.max(rang, RANG_SYLLABE_FERMEE);
  if (pluriel) rang = Math.max(rang, RANG_S_PLURIEL);

  const segments: Segment[] = lettresMot.map((g) => ({ g, p: phonemeLettre(g)! }));
  const syllabes = syllaber(lettresMot);
  if (pluriel) {
    segments.push({ g: "S", p: "", muet: true });
    syllabes[syllabes.length - 1] += "S";
  }
  const resultat: AnalyseMot = { ok: true, mot, segments, syllabes, rang };
  return resultat;
}

/** Rang minimal d'un mot, ou undefined s'il n'est jamais lisible dans le MVP. */
export function rangMinimal(mot: string, options: { pluriel?: boolean } = {}): number | undefined {
  const r = analyserMot(mot, options);
  return r.ok ? r.rang : undefined;
}

export interface VerificationPhrase {
  ok: boolean;
  rang: number;
  mots: ResultatMot[];
  problemes: string[];
}

/** Découpe une phrase en mots (les emplacements de personnage {P1} sont ignorés). */
export function motsDePhrase(phrase: string): string[] {
  return normaliser(phrase.replace(/\{P\d+\}/g, " "))
    .split(/[^A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]+/u)
    .filter(Boolean);
}

/** Vérifie qu'une phrase est entièrement lisible à un rang donné. */
export function verifierPhrase(phrase: string, rangCible: number): VerificationPhrase {
  const mots = motsDePhrase(phrase).map((m) => analyserMot(m, { pluriel: true }));
  const problemes: string[] = [];
  let rang = 0;
  for (const r of mots) {
    if (!r.ok) problemes.push(`${r.mot} : ${r.problemes.join(", ")}`);
    else {
      rang = Math.max(rang, r.rang);
      if (r.rang > rangCible) problemes.push(`${r.mot} : lisible seulement au rang ${r.rang}`);
    }
  }
  return { ok: problemes.length === 0, rang, mots, problemes };
}
