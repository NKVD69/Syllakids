import { contientPhoneme, syllabesAvecPhoneme } from "@syllakids/decodabilite";
import { useEffect, useMemo, useRef, useState } from "react";
import { jouer, texteDuSon } from "../audio";
import { BoutonRond } from "../composants/BoutonRond";
import { Carre, Coche, HautParleur, Oreille, Rond, Triangle } from "../composants/Icones";
import { ENCOURAGEMENTS, MOTS_ORAUX } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import type { ItemMot } from "../types";
import { auHasard, melanger, pause, type PropsActivite, useAvancement } from "./commun";

/** Son étudié dans l'unité : son phonème (API) et sa forme provisoire pour la synthèse vocale. */
function sonDe(f: PropsActivite["f"]) {
  const g = f.unite.graphemes[0]!;
  return { p: g.p, texte: texteDuSon(g.g, g.type) };
}
const direMot = (m: ItemMot, lent = false) => jouer(m.id, { texte: m.texte, lent });

/** Joue la consigne une seule fois au début, puis lance le premier élément. */
function useDebut(lancer: () => Promise<void>, deps: unknown[]) {
  const fait = useRef(false);
  useEffect(() => {
    if (fait.current) return;
    fait.current = true;
    void lancer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** A1 J'entends / je n'entends pas. */
export function JEntends({ f, profil, onFini, avancer }: PropsActivite) {
  const { dire } = useSyllakids();
  const son = sonDe(f);
  const n = profil === "5ans" ? 4 : 6;
  const mots = useMemo(() => {
    const avec = melanger(MOTS_ORAUX.filter((m) => contientPhoneme(m.segments, son.p))).slice(0, n / 2);
    const sans = melanger(MOTS_ORAUX.filter((m) => !contientPhoneme(m.segments, son.p))).slice(0, n / 2);
    return melanger([...avec, ...sans]);
  }, [son.p, n]);
  const [i, setI] = useState(0);
  useAvancement(avancer, i, mots.length);
  const erreurs = useRef(0);
  const occupe = useRef(true);

  useDebut(async () => {
    await dire(consigneProfil("A1", profil), son.texte);
    await direMot(mots[0]!);
    occupe.current = false;
  }, []);

  async function repondre(oui: boolean) {
    if (occupe.current) return;
    occupe.current = true;
    const m = mots[i]!;
    if (oui === contientPhoneme(m.segments, son.p)) {
      erreurs.current = 0;
      await dire(auHasard(ENCOURAGEMENTS));
      if (i + 1 >= mots.length) return onFini();
      setI(i + 1);
      await pause(300);
      await direMot(mots[i + 1]!);
    } else {
      erreurs.current += 1;
      if (erreurs.current >= 3) {
        // on ne bloque jamais l'enfant : la bonne réponse est donnée et l'élément reviendra en révision
        erreurs.current = 0;
        await dire("CON-ERR-08");
        if (i + 1 >= mots.length) return onFini();
        setI(i + 1);
        await direMot(mots[i + 1]!);
      } else {
        await dire(erreurs.current >= 2 ? "CON-A1-AIDE" : "CON-A1-RELANCE");
        await direMot(m, erreurs.current >= 2);
      }
    }
    occupe.current = false;
  }

  return (
    <div className="scene">
      <BoutonRond nom="Réécouter le mot" onClick={() => void direMot(mots[i]!)}><HautParleur /></BoutonRond>
      <div className="actions" style={{ gap: "10vmin" }}>
        <BoutonRond nom="J'entends le son" variante="oui grand" onClick={() => repondre(true)}><Oreille /></BoutonRond>
        <BoutonRond nom="Je n'entends pas le son" variante="non grand" onClick={() => repondre(false)}><Oreille /></BoutonRond>
      </div>
    </div>
  );
}

/** A2 Où est le son ? L'enfant pose le jeton dans la case-syllabe où il entend le son. */
export function OuEstLeSon({ f, profil, onFini, avancer }: PropsActivite) {
  const { dire } = useSyllakids();
  const son = sonDe(f);
  const mots = useMemo(
    () =>
      melanger(MOTS_ORAUX.filter((m) => m.syllabes.length >= 2 && syllabesAvecPhoneme(m.segments, m.syllabes, son.p).length === 1)).slice(
        0,
        profil === "5ans" ? 3 : 4,
      ),
    [son.p, profil],
  );
  const [i, setI] = useState(0);
  useAvancement(avancer, i, mots.length);
  const [jeton, setJeton] = useState<number | null>(null);
  const [faux, setFaux] = useState<number | null>(null);
  const erreurs = useRef(0);
  const occupe = useRef(true);
  const mot = mots[i];

  useDebut(async () => {
    if (!mots[0]) return onFini();
    await dire(consigneProfil("A2", profil), son.texte);
    await direMot(mots[0]);
    occupe.current = false;
  }, []);

  if (!mot) return null;
  const cible = syllabesAvecPhoneme(mot.segments, mot.syllabes, son.p)[0];

  async function poser(k: number) {
    if (occupe.current || !mot) return;
    occupe.current = true;
    if (k === cible) {
      setJeton(k);
      erreurs.current = 0;
      await dire(auHasard(ENCOURAGEMENTS));
      await pause(300);
      setJeton(null);
      if (i + 1 >= mots.length) return onFini();
      setI(i + 1);
      await direMot(mots[i + 1]!);
    } else {
      setFaux(k);
      erreurs.current += 1;
      if (erreurs.current >= 3) {
        erreurs.current = 0;
        setFaux(null);
        setJeton(cible ?? null);
        await dire("CON-ERR-08");
        setJeton(null);
        if (i + 1 >= mots.length) return onFini();
        setI(i + 1);
        await direMot(mots[i + 1]!);
      } else {
        await dire(erreurs.current >= 2 ? "CON-A2-AIDE" : "CON-A2-RELANCE", son.texte);
        setFaux(null);
        await direMot(mot, true);
      }
    }
    occupe.current = false;
  }

  return (
    <div className="scene">
      <BoutonRond nom="Réécouter le mot" onClick={() => void direMot(mot)}><HautParleur /></BoutonRond>
      <div className="cases" role="group" aria-label={`Le mot a ${mot.syllabes.length} morceaux`}>
        {mot.syllabes.map((_, k) => (
          <button
            key={`${i}-${k}`}
            type="button"
            className={`case ${jeton === k ? "jeton" : ""} ${faux === k ? "faux" : ""}`}
            aria-label={`Morceau ${k + 1}`}
            onClick={() => poser(k)}
          />
        ))}
      </div>
    </div>
  );
}

const FORMES = [Rond, Triangle, Carre];

/** A3 L'intrus sonore : trois mots entendus, un seul n'a pas le son. Aucun texte affiché. */
export function IntrusSonore({ f, profil, onFini, avancer }: PropsActivite) {
  const { dire } = useSyllakids();
  const son = sonDe(f);
  const tours = useMemo(() => {
    const avec = melanger(MOTS_ORAUX.filter((m) => contientPhoneme(m.segments, son.p)));
    const sans = melanger(MOTS_ORAUX.filter((m) => !contientPhoneme(m.segments, son.p)));
    const n = profil === "5ans" ? 2 : 3;
    return Array.from({ length: n }, (_, k) => {
      const intrus = sans[k]!;
      return { intrus, cartes: melanger([avec[2 * k]!, avec[2 * k + 1]!, intrus]) };
    }).filter((t) => t.cartes.every(Boolean));
  }, [son.p, profil]);
  const [i, setI] = useState(0);
  useAvancement(avancer, i, tours.length);
  const [choix, setChoix] = useState<number | null>(null);
  const [entendues, setEntendues] = useState<Set<number>>(new Set());
  const erreurs = useRef(0);
  const tour = tours[i];

  useDebut(async () => {
    if (!tours[0]) return onFini();
    await dire(consigneProfil("A3", profil), son.texte);
  }, []);

  if (!tour) return null;

  async function valider() {
    if (choix === null || !tour) return;
    if (tour.cartes[choix] === tour.intrus) {
      erreurs.current = 0;
      await dire(auHasard(ENCOURAGEMENTS));
      setChoix(null);
      setEntendues(new Set());
      if (i + 1 >= tours.length) return onFini();
      setI(i + 1);
    } else {
      erreurs.current += 1;
      setChoix(null);
      if (erreurs.current >= 3) {
        erreurs.current = 0;
        setChoix(tour.cartes.indexOf(tour.intrus));
        await dire("CON-ERR-08");
        setChoix(null);
        setEntendues(new Set());
        if (i + 1 >= tours.length) return onFini();
        setI(i + 1);
      } else await dire(erreurs.current >= 2 ? "CON-A3-AIDE" : "CON-ERR-01", son.texte);
    }
  }

  return (
    <div className="scene">
      <div className="cartes">
        {tour.cartes.map((m, k) => {
          const Forme = FORMES[k]!;
          return (
            <button
              key={`${i}-${k}`}
              type="button"
              className={`carte ${choix === k ? "choisie" : ""}`}
              aria-label={`Image ${k + 1}`}
              onClick={async () => {
                setChoix(k);
                setEntendues((e) => new Set(e).add(k));
                await direMot(m);
              }}
            ><Forme /></button>
          );
        })}
      </div>
      <BoutonRond nom="Valider" variante="principal" desactive={choix === null || entendues.size < 3} onClick={valider}><Coche /></BoutonRond>
    </div>
  );
}
