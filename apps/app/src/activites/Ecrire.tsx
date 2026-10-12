import { ORDRE_CONSONNES, VOYELLES } from "@syllakids/decodabilite";
import { useEffect, useMemo, useRef, useState } from "react";
import { jouer } from "../audio";
import { BoutonRond } from "../composants/BoutonRond";
import { Coche, Gomme, Oreille } from "../composants/Icones";
import { ZoneEcriture, type PoigneeEcriture } from "../composants/ZoneEcriture";
import { ENCOURAGEMENTS, TRACES, motsDe, syllabesDe } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import type { Trait } from "../trace/evaluer";
import { estLaLettre } from "../trace/reconnaitre";
import type { FichierUnite, Profil } from "../types";
import { auHasard, melanger, pause, type PropsActivite } from "./commun";

export type Niveau = "syllabes" | "mots";
interface ADicter { id: string; texte: string; lettres: string[] }

/** Lettres déjà apprises au rang de l'unité. */
export function lettresApprises(f: FichierUnite): string[] {
  return [...Object.keys(VOYELLES), ...ORDRE_CONSONNES.slice(0, Math.min(f.unite.rang, 13))];
}

/** Syllabes ou mots courts de l'unité, sans lettre muette, à écrire sous la dictée. */
export function aDicter(f: FichierUnite, niveau: Niveau, profil: Profil): ADicter[] {
  const syllabes = melanger(syllabesDe(f))
    .slice(0, profil === "5ans" ? 2 : 3)
    .map((s) => ({ id: s.id, texte: s.texte, lettres: [...s.texte] }));
  if (niveau === "syllabes") return syllabes;
  const max = profil === "5ans" ? 4 : 5;
  const mots = melanger(motsDe(f).filter((m) => !m.motOutil && m.segments.every((s) => !s.muet && s.g.length === 1) && m.texte.length <= max))
    .slice(0, 2)
    .map((m) => ({ id: m.id, texte: m.texte, lettres: m.segments.map((s) => s.g) }));
  return mots.length ? mots : syllabes;
}

const modele = (l: string): Trait[] => (TRACES[l]?.traits ?? []).map((t) => t.map(([x, y]) => [x, y] as const));

/** E2 La dictée : une case par lettre ; l'application vérifie chaque lettre parmi celles déjà apprises. */
export function Dictee({ f, profil, onFini, niveau }: PropsActivite & { niveau: Niveau }) {
  const { dire, noter, conserver } = useSyllakids();
  const items = useMemo(() => aDicter(f, niveau, profil), [f, niveau, profil]);
  const modeles = useMemo(() => Object.fromEntries(lettresApprises(f).map((l) => [l, modele(l)])), [f]);
  const [i, setI] = useState(0);
  const [etats, setEtats] = useState<("juste" | "faux" | undefined)[]>([]);
  const [aide, setAide] = useState(false);
  const cases = useRef<(PoigneeEcriture | null)[]>([]);
  const erreurs = useRef(0);
  const occupe = useRef(false);
  const debut = useRef(false);
  const item = items[i];
  const n = item?.lettres.length ?? 1;
  const largeur = Math.round(Math.min(140, (Math.min(window.innerWidth, 1000) - 150) / n - 14));
  const direItem = (it = item) => (it ? jouer(it.id, { texte: it.texte }) : Promise.resolve());

  useEffect(() => {
    if (debut.current) return;
    debut.current = true;
    void (async () => {
      await dire(consigneProfil("E2", profil));
      await direItem(items[0]);
    })();
  });

  useEffect(() => {
    if (!item) onFini();
  }, [item, onFini]);
  if (!item) return null;

  function suivant() {
    erreurs.current = 0;
    setAide(false);
    setEtats([]);
    cases.current.forEach((c) => c?.effacer());
    if (i + 1 >= items.length) onFini();
    else {
      setI(i + 1);
      void pause(300).then(() => direItem(items[i + 1]));
    }
  }

  async function verifier() {
    if (occupe.current || !item) return;
    occupe.current = true;
    const resultats = item.lettres.map((l, k) => estLaLettre(cases.current[k]?.traits() ?? [], l, modeles));
    // premier essai de l'enfant, gardé si l'accord le permet
    if (erreurs.current === 0) conserver({ type: "trace", item: item.id, traits: item.lettres.map((_, k) => (cases.current[k]?.traits() ?? []).map((t) => [...t])) });
    setEtats(resultats.map((ok) => (ok ? "juste" : "faux")));
    if (resultats.every(Boolean)) {
      noter(f.unite.id, item.id, erreurs.current === 0);
      await dire(auHasard(ENCOURAGEMENTS));
      suivant();
    } else {
      erreurs.current += 1;
      if (erreurs.current >= 3) {
        noter(f.unite.id, item.id, false);
        setAide(true);
        await dire("CON-ERR-08");
        await pause(1200);
        suivant();
      } else {
        await dire(erreurs.current >= 2 ? "CON-E2-AIDE" : "CON-ERR-03");
        if (erreurs.current >= 2) setAide(true);
        resultats.forEach((ok, k) => !ok && cases.current[k]?.effacer());
        setEtats(resultats.map((ok) => (ok ? "juste" : undefined)));
        await direItem();
      }
    }
    occupe.current = false;
  }

  return (
    <div className="scene" style={{ gap: 20 }}>
      <div className="cases-ecriture">
        {item.lettres.map((l, k) => (
          <ZoneEcriture
            key={`${i}-${k}`}
            ref={(c) => {
              cases.current[k] = c;
            }}
            largeur={largeur}
            hauteur={Math.round(largeur * 1.3)}
            fantome={aide && etats[k] !== "juste" ? modele(l) : undefined}
            etat={etats[k]}
            nom={`Case ${k + 1} sur ${n}`}
          />
        ))}
      </div>
      <div className="actions">
        <BoutonRond nom="Réécouter" onClick={() => void direItem()}><Oreille /></BoutonRond>
        <BoutonRond nom="Tout effacer" onClick={() => { cases.current.forEach((c) => c?.effacer()); setEtats([]); }}><Gomme /></BoutonRond>
        <BoutonRond nom="J'ai fini" variante="principal" onClick={verifier}><Coche /></BoutonRond>
      </div>
    </div>
  );
}

/** E3 Les étiquettes : l'enfant compose ce qu'il entend avec des lettres à toucher dans l'ordre. */
export function Etiquettes({ f, profil, onFini, niveau }: PropsActivite & { niveau: Niveau }) {
  const { dire, noter } = useSyllakids();
  const items = useMemo(() => aDicter(f, niveau, profil), [f, niveau, profil]);
  const apprises = useMemo(() => lettresApprises(f), [f]);
  const [i, setI] = useState(0);
  const item = items[i];
  const reserveInitiale = useMemo(() => {
    if (!item) return [];
    const intrus = melanger(apprises.filter((l) => !item.lettres.includes(l))).slice(0, profil === "5ans" ? 1 : 2);
    return melanger([...item.lettres, ...intrus]).map((l, k) => ({ cle: `${i}-${k}`, l }));
  }, [item, apprises, profil, i]);
  const [reserve, setReserve] = useState(reserveInitiale);
  const [places, setPlaces] = useState<({ cle: string; l: string } | null)[]>([]);
  const [etats, setEtats] = useState<("juste" | "faux" | undefined)[]>([]);
  const erreurs = useRef(0);
  const debut = useRef(false);
  const direItem = (it = item) => (it ? jouer(it.id, { texte: it.texte }) : Promise.resolve());

  useEffect(() => {
    setReserve(reserveInitiale);
    setPlaces(item ? item.lettres.map(() => null) : []);
    setEtats([]);
  }, [reserveInitiale, item]);

  useEffect(() => {
    if (debut.current) return;
    debut.current = true;
    void (async () => {
      await dire(consigneProfil("E3", profil));
      await direItem(items[0]);
    })();
  });

  useEffect(() => {
    if (!item) onFini();
  }, [item, onFini]);
  if (!item) return null;

  async function verifier(remplies: { cle: string; l: string }[]) {
    if (!item) return;
    const ok = remplies.map((t, k) => t.l === item.lettres[k]);
    setEtats(ok.map((o) => (o ? "juste" : "faux")));
    if (ok.every(Boolean)) {
      noter(f.unite.id, item.id, erreurs.current === 0);
      await dire(auHasard(ENCOURAGEMENTS));
      erreurs.current = 0;
      if (i + 1 >= items.length) return onFini();
      setI(i + 1);
      await pause(200);
      await direItem(items[i + 1]);
      return;
    }
    erreurs.current += 1;
    if (erreurs.current >= 3) {
      noter(f.unite.id, item.id, false);
      setPlaces(item.lettres.map((l, k) => ({ cle: `sol-${k}`, l })));
      setEtats(item.lettres.map(() => "juste"));
      await dire("CON-ERR-08");
      erreurs.current = 0;
      if (i + 1 >= items.length) return onFini();
      setI(i + 1);
      await direItem(items[i + 1]);
      return;
    }
    await dire(erreurs.current >= 2 ? "CON-E3-AIDE" : "CON-ERR-02");
    // les étiquettes mal placées retournent dans la réserve
    setReserve((r) => [...r, ...remplies.filter((_, k) => !ok[k])]);
    setPlaces(remplies.map((t, k) => (ok[k] ? t : null)));
    setEtats(ok.map((o) => (o ? "juste" : undefined)));
    await direItem();
  }

  function poser(t: { cle: string; l: string }) {
    const k = places.findIndex((p) => p === null);
    if (k === -1) return;
    const nouvelles = places.map((p, j) => (j === k ? t : p));
    setPlaces(nouvelles);
    setReserve((r) => r.filter((x) => x.cle !== t.cle));
    if (nouvelles.every(Boolean)) void verifier(nouvelles as { cle: string; l: string }[]);
  }

  function retirer(k: number) {
    const t = places[k];
    if (!t || etats[k] === "juste") return;
    setPlaces(places.map((p, j) => (j === k ? null : p)));
    setReserve((r) => [...r, t]);
  }

  return (
    <div className="scene">
      <BoutonRond nom="Réécouter" onClick={() => void direItem()}><Oreille /></BoutonRond>
      <div className="emplacements">
        {places.map((p, k) => (
          <button key={k} type="button" className={`emplacement ${etats[k] ?? ""}`} onClick={() => retirer(k)} aria-label={p ? `Lettre ${p.l}` : `Place ${k + 1} vide`}>
            {p && <span className="lettres" style={{ fontSize: "11vmin" }}>{p.l}</span>}
          </button>
        ))}
      </div>
      <div className="reserve">
        {reserve.map((t) => (
          <button key={t.cle} type="button" className="tuile" style={{ fontSize: "10vmin" }} onClick={() => poser(t)} aria-label={`Étiquette ${t.l}`}>{t.l}</button>
        ))}
      </div>
    </div>
  );
}

/** Choix automatique : étiquettes pour les 5 ans et sur petit écran, dictée tracée sinon (section 10). */
export function Ecrire(props: PropsActivite & { niveau: Niveau }) {
  const petitEcran = window.innerWidth < 600;
  return props.profil === "5ans" || petitEcran ? <Etiquettes {...props} /> : <Dictee {...props} />;
}
export const EcrireSyllabes = (p: PropsActivite) => <Ecrire {...p} niveau="syllabes" />;
export const EcrireMots = (p: PropsActivite) => <Ecrire {...p} niveau="mots" />;
