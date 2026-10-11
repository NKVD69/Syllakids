import consignes from "@contenu/consignes.json";
import index from "@contenu/index.json";
import traces from "@contenu/traces-capitales.json";
import type { FichierUnite, ItemMot, ItemPhrase, ItemSyllabe } from "./types";

const fichiers = import.meta.glob<FichierUnite>("../../../content/unites/*.json", { eager: true, import: "default" });

export const UNITES: FichierUnite[] = index.unites.map((u) => {
  const f = Object.entries(fichiers).find(([chemin]) => chemin.endsWith(`/${u.id}.json`));
  if (!f) throw new Error(`Unité manquante : ${u.id}`);
  return f[1];
});

export function unite(id: string): FichierUnite | undefined {
  return UNITES.find((u) => u.unite.id === id);
}

export const syllabesDe = (f: FichierUnite) => f.items.filter((i): i is ItemSyllabe => i.type === "syllabe");
export const motsDe = (f: FichierUnite) => f.items.filter((i): i is ItemMot => i.type === "mot");
export const phrasesDe = (f: FichierUnite) => f.items.filter((i): i is ItemPhrase => i.type === "phrase");

type Message = { id: string; texte: string };
const MESSAGES = new Map<string, string>((consignes.messages as Message[]).map((m) => [m.id, m.texte]));

/** Texte d'une consigne ; [son] est remplacé par le son fourni. */
export function consigne(id: string, son?: string): string {
  const t = MESSAGES.get(id);
  if (!t) return "";
  return son === undefined ? t : t.replaceAll("[son]", son);
}

export const ENCOURAGEMENTS = [...MESSAGES.keys()].filter((k) => k.startsWith("CON-OK-"));
export const ESSAIS = ["CON-ERR-01", "CON-ERR-02", "CON-ERR-03", "CON-ERR-06"];

export type TracesLettre = { traits: [number, number][][] };
export const TRACES = traces.lettres as unknown as Record<string, TracesLettre>;
