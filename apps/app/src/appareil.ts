/**
 * Ce que l'appareil garde en mémoire : ses profils d'enfants et la progression de chacun.
 * Tout fonctionne hors ligne ; la synchronisation (synchro.ts) envoie ensuite les changements.
 */
import { normaliser, PROGRESSION_VIDE, type Progression } from "./progression";

/** D'où vient le profil : créé sur cet appareil seulement, ou rattaché à un compte (famille, classe). */
export type Origine = "appareil" | "famille" | "classe";

export interface ProfilEnfant {
  id: string;
  /** Prénom ou surnom ; peut rester vide pour un profil créé sans compte. */
  prenom: string;
  avatar: string;
  /** Images secrètes pour la tablette de la classe, par exemple « 2-5-7 ». */
  codeImages?: string;
  origine: Origine;
  /** Dernière version du serveur connue de l'appareil (0 : jamais envoyée). */
  version: number;
  /** Des changements attendent d'être envoyés. */
  sale: boolean;
  /**
   * Accords sur la voix et les tracés : reçus du serveur pour un profil rattaché à un compte,
   * réglés dans l'espace adulte pour un profil qui n'existe que sur l'appareil.
   */
  accords?: { voixAppareil: boolean; voixPartage: boolean };
}

export interface Appareil {
  /** Identifiant de l'appareil (sert seulement à compter le temps de lecture de chaque appareil). */
  id: string;
  profils: ProfilEnfant[];
  /** Tablette de la classe : choix de l'enfant et images secrètes à chaque ouverture. */
  mode: "maison" | "classe";
  classe?: { id: string; nom: string };
}

const CLE_APPAREIL = "syllakids:appareil:v1";
const CLE_ANCIENNE = "syllakids:progression:v1";
const cleProgression = (id: string) => `syllakids:progression:${id}`;

export function nouvelId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const h = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function lire(cle: string): unknown {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : les données restent en mémoire */
  }
}

export function nouveauProfil(partiel: Partial<ProfilEnfant> = {}): ProfilEnfant {
  return { id: nouvelId(), prenom: "", avatar: "soleil", origine: "appareil", version: 0, sale: false, ...partiel };
}

/** Lit l'état de l'appareil ; au premier lancement, crée un profil (et reprend l'ancienne progression s'il y en a une). */
export function chargerAppareil(): Appareil {
  const a = lire(CLE_APPAREIL) as Appareil | null;
  if (a && Array.isArray(a.profils) && a.id) return { ...a, mode: a.mode ?? "maison" };
  const premier = nouveauProfil();
  const ancienne = lire(CLE_ANCIENNE);
  if (ancienne) {
    enregistrerProgression(premier.id, normaliser(ancienne));
    try {
      localStorage.removeItem(CLE_ANCIENNE);
    } catch {
      /* rien */
    }
  }
  const nouveau: Appareil = { id: nouvelId(), profils: [premier], mode: "maison" };
  enregistrerAppareil(nouveau);
  return nouveau;
}

export function enregistrerAppareil(a: Appareil) {
  ecrire(CLE_APPAREIL, a);
}

export function chargerProgression(id: string): Progression {
  const p = lire(cleProgression(id));
  return p ? normaliser(p) : structuredClone(PROGRESSION_VIDE);
}

export function enregistrerProgression(id: string, p: Progression) {
  ecrire(cleProgression(id), p);
}

export function oublierProgression(id: string) {
  try {
    localStorage.removeItem(cleProgression(id));
  } catch {
    /* rien */
  }
}
