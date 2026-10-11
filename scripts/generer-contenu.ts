/**
 * Génère content/unites/*.json à partir de content/sources/listes.json,
 * en calculant graphèmes, phonèmes et syllabes avec la bibliothèque de déchiffrabilité.
 * Usage : npm run contenu:generer
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONSONNES_LONGUES,
  VOYELLES,
  analyserMot,
  motsOutilsDisponibles,
  phonemeLettre,
  verifierPhrase,
  type Segment,
} from "../packages/decodabilite/src/index.ts";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const sources = JSON.parse(readFileSync(join(racine, "content/sources/listes.json"), "utf8"));

const slug = (mot: string) =>
  mot.replace(/É/g, "E1").replace(/È/g, "E2").replace(/Ê/g, "E3").replace(/À/g, "A2").replace(/[^A-Z0-9]/g, "");
const api = (segments: Segment[]) => segments.map((s) => s.p).join("");
const id2 = (n: number) => String(n).padStart(2, "0");

const erreurs: string[] = [];
const sortie = join(racine, "content/unites");
mkdirSync(sortie, { recursive: true });
const index: unknown[] = [];

for (const r of sources.rangs) {
  const uid = `U${id2(r.rang)}`;
  const graphemes = r.graphemes.map((g: string) => ({
    g,
    p: phonemeLettre(g),
    type: g in VOYELLES ? "voyelle" : CONSONNES_LONGUES.has(g) ? "consonne-longue" : "occlusive",
  }));

  const syllabes =
    r.rang === 0
      ? Object.keys(VOYELLES).map((v) => ({ id: `${uid}-S-${slug(v)}`, type: "syllabe", texte: v, api: VOYELLES[v] }))
      : r.rang <= 13
        ? Object.keys(VOYELLES).map((v) => {
            const texte = r.graphemes[0] + v;
            return { id: `${uid}-S-${slug(texte)}`, type: "syllabe", texte, api: phonemeLettre(r.graphemes[0])! + VOYELLES[v] };
          })
        : [];

  const mots = r.mots.map((m: string) => {
    const a = analyserMot(m);
    if (!a.ok) {
      erreurs.push(`${uid} mot ${m} : ${a.problemes.join(", ")}`);
      return null;
    }
    if (a.rang > Math.min(r.rang, 13)) erreurs.push(`${uid} mot ${m} : lisible seulement au rang ${a.rang}`);
    return {
      id: `${uid}-M-${slug(a.mot)}`,
      type: "mot",
      texte: a.mot,
      rangMin: a.rang,
      syllabes: a.syllabes,
      segments: a.segments,
      api: api(a.segments),
      ...(a.motOutil ? { motOutil: true } : {}),
      image: `${slug(a.mot).toLowerCase()}.webp`,
    };
  });

  const phrases = r.phrases.map((p: string, i: number) => {
    const v = verifierPhrase(p, Math.min(r.rang, 13));
    if (!v.ok) erreurs.push(`${uid} phrase « ${p} » : ${v.problemes.join(" ; ")}`);
    return { id: `${uid}-P-${id2(i + 1)}`, type: "phrase", texte: p, rangMin: v.rang, image: `${uid.toLowerCase()}-p${id2(i + 1)}.webp` };
  });

  const unite = {
    version: "1.0",
    unite: {
      id: uid,
      rang: r.rang,
      titre: r.titre,
      bloc: r.rang === 0 ? "voyelles" : r.bilan ? "bilan" : "sons-simples",
      graphemes,
      motsOutils: r.rang >= 1 && r.rang <= 13 ? motsOutilsDisponibles(r.rang).filter((m) => m.rang === r.rang).map((m) => m.mot) : [],
      ...(r.revision ? { revision: r.revision } : {}),
    },
    items: [...syllabes, ...mots.filter(Boolean), ...phrases],
  };
  writeFileSync(join(sortie, `${uid}.json`), JSON.stringify(unite, null, 2) + "\n");
  index.push({ id: uid, rang: r.rang, titre: r.titre, fichier: `unites/${uid}.json` });
}

writeFileSync(join(racine, "content/index.json"), JSON.stringify({ version: "1.0", unites: index }, null, 2) + "\n");
if (erreurs.length) {
  console.error("Contenu non conforme :\n- " + erreurs.join("\n- "));
  process.exit(1);
}
console.log(`${index.length} unités générées, aucun mot ni phrase à deviner.`);
