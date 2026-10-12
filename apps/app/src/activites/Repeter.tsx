import { useEffect, useMemo, useRef, useState } from "react";
import { jouer, texteDuSon } from "../audio";
import { BoutonRond } from "../composants/BoutonRond";
import { Fleche, HautParleur, Micro, VisageContent, VisageMoyen, VisageTriste } from "../composants/Icones";
import { Mot } from "../composants/Mot";
import { syllabesDe } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import { enregistrer, fermerMicro, lireEnregistrement, ouvrirMicro, SEUIL_VOIX, suivreNiveau } from "../micro";
import { melanger, pause, type PropsActivite } from "./commun";

/** Ouvre le micro pour la durée de l'activité ; null si refusé ou absent. */
function useMicro(): MediaStream | null | undefined {
  const [flux, setFlux] = useState<MediaStream | null | undefined>(undefined);
  useEffect(() => {
    let annule = false;
    let ouvert: MediaStream | null = null;
    void ouvrirMicro().then((f) => {
      ouvert = f;
      if (annule) fermerMicro(f);
      else setFlux(f);
    });
    return () => {
      annule = true;
      fermerMicro(ouvert);
    };
  }, []);
  return flux;
}

function SansMicro({ onFini }: { onFini: () => void }) {
  const { dire } = useSyllakids();
  useEffect(() => {
    void dire("CON-MIC-06");
  }, [dire]);
  return (
    <div className="scene">
      <span className="fin" style={{ color: "var(--muette)" }} aria-hidden><Micro /></span>
      <BoutonRond nom="Passer cette activité" variante="principal" onClick={onFini}><Fleche /></BoutonRond>
    </div>
  );
}

type EtapeEcho = "modele" | "pret" | "enregistre" | "reecoute" | "juge";

/** R1 L'écho : modèle, enregistrement de l'enfant (5 s au plus), réécoute côte à côte, auto-évaluation. */
export function Echo({ f, profil, onFini }: PropsActivite) {
  const { dire, conserver } = useSyllakids();
  const flux = useMicro();
  const items = useMemo(() => melanger(syllabesDe(f)).slice(0, profil === "5ans" ? 3 : 4), [f, profil]);
  const [i, setI] = useState(0);
  const [etape, setEtape] = useState<EtapeEcho>("modele");
  const [niveau, setNiveau] = useState(0);
  const voix = useRef<Blob | null>(null);
  const debut = useRef(false);
  const item = items[i]!;

  useEffect(() => {
    if (!flux || debut.current) return;
    debut.current = true;
    void (async () => {
      await dire(consigneProfil("R1", profil));
      await jouer(items[0]!.id, { texte: items[0]!.texte });
      setEtape("pret");
    })();
  }, [flux, dire, profil, items]);

  if (flux === undefined) return <div className="scene" />;
  if (flux === null) return <SansMicro onFini={onFini} />;

  async function parler() {
    if (!flux || etape !== "pret") return;
    setEtape("enregistre");
    voix.current = await enregistrer(flux, setNiveau);
    setNiveau(0);
    if (!voix.current) {
      await dire("CON-MIC-01");
      setEtape("pret");
      return;
    }
    conserver({ type: "voix", item: item.id, audio: voix.current, mime: voix.current.type || "audio/webm" });
    setEtape("reecoute");
    await dire("CON-MIC-04");
    await jouer(item.id, { texte: item.texte });
    await pause(300);
    await lireEnregistrement(voix.current);
    setEtape("juge");
    await dire("CON-MIC-05");
  }

  async function juger() {
    voix.current = null;
    if (i + 1 >= items.length) return onFini();
    setI(i + 1);
    setEtape("modele");
    await jouer(items[i + 1]!.id, { texte: items[i + 1]!.texte });
    setEtape("pret");
  }

  return (
    <div className="scene">
      <Mot texte={item.texte} taille="18vmin" pluriel={false} />
      {etape === "enregistre" && <div className="niveau" aria-hidden><span style={{ width: `${Math.round(niveau * 100)}%` }} /></div>}
      {etape === "juge" ? (
        <div className="actions">
          <BoutonRond nom="C'était pareil" variante="oui grand" onClick={juger}><VisageContent /></BoutonRond>
          <BoutonRond nom="Presque pareil" variante="grand" onClick={juger}><VisageMoyen /></BoutonRond>
          <BoutonRond nom="Pas pareil" variante="non grand" onClick={juger}><VisageTriste /></BoutonRond>
        </div>
      ) : (
        <div className="actions">
          <BoutonRond nom="Réécouter le modèle" onClick={() => void jouer(item.id, { texte: item.texte })} desactive={etape !== "pret"}><HautParleur /></BoutonRond>
          <BoutonRond nom="Parler dans le micro" variante={etape === "enregistre" ? "principal grand" : "grand actif"} onClick={parler} desactive={etape !== "pret" && etape !== "enregistre"}><Micro /></BoutonRond>
        </div>
      )}
    </div>
  );
}

/** R2 Le son qui dure : la barre avance tant que l'enfant fait durer le son. */
export function SonQuiDure({ f, profil, onFini }: PropsActivite) {
  const { dire } = useSyllakids();
  const flux = useMicro();
  const lettres = useMemo(() => (f.unite.rang === 0 ? ["A", "O", "I"].slice(0, profil === "5ans" ? 2 : 3) : [f.unite.graphemes[0]!.g]), [f, profil]);
  const objectif = profil === "5ans" ? 1500 : 2500; // millisecondes de son continu
  const [k, setK] = useState(0);
  const [progres, setProgres] = useState(0);
  const [ecoute, setEcoute] = useState(false);
  const [passer, setPasser] = useState(false);
  const debut = useRef(false);
  const lettre = lettres[k]!;

  // on ne bloque jamais l'enfant : après 15 secondes, la flèche permet de continuer
  useEffect(() => {
    setPasser(false);
    const t = window.setTimeout(() => setPasser(true), 15000);
    return () => clearTimeout(t);
  }, [k]);
  const type = f.unite.rang === 0 ? "voyelle" : f.unite.graphemes[0]!.type;
  const son = texteDuSon(lettre, type);

  useEffect(() => {
    if (!flux || debut.current) return;
    debut.current = true;
    void dire(consigneProfil("R2", profil), son).then(() => setEcoute(true));
  }, [flux, dire, profil, son]);

  useEffect(() => {
    if (!flux || !ecoute) return;
    let cumul = 0;
    let avant = performance.now();
    let fini = false;
    const arreter = suivreNiveau(flux, (n) => {
      const t = performance.now();
      const dt = t - avant;
      avant = t;
      if (fini) return;
      cumul = n > SEUIL_VOIX ? cumul + dt : Math.max(0, cumul - dt * 0.5);
      setProgres(Math.min(1, cumul / objectif));
      if (cumul >= objectif) {
        fini = true;
        setEcoute(false);
        void dire("CON-OK-16").then(() => {
          setProgres(0);
          if (k + 1 >= lettres.length) onFini();
          else {
            setK(k + 1);
            void dire(consigneProfil("R2", profil), texteDuSon(lettres[k + 1]!, type)).then(() => setEcoute(true));
          }
        });
      }
    });
    return arreter;
  }, [flux, ecoute, objectif, dire, k, lettres, onFini, profil, type]);

  if (flux === undefined) return <div className="scene" />;
  if (flux === null) return <SansMicro onFini={onFini} />;

  return (
    <div className="scene">
      <span className="lettres" style={{ fontSize: "26vmin", color: "var(--bleu)" }}>{lettre}</span>
      <div className="jauge" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progres * 100)}>
        <span style={{ width: `${progres * 100}%` }} />
      </div>
      <div className="actions">
        <BoutonRond nom="Écouter comment faire" onClick={() => void dire("CON-R2-AIDE")}><HautParleur /></BoutonRond>
        {passer && <BoutonRond nom="Continuer" variante="principal" onClick={onFini}><Fleche /></BoutonRond>}
      </div>
    </div>
  );
}
