import { motsDePhrase } from "@syllakids/decodabilite";
import { useEffect, useMemo, useRef, useState } from "react";
import { jouer } from "../audio";
import { BoutonRond } from "../composants/BoutonRond";
import { Fleche, HautParleur, VisageContent, VisageTriste } from "../composants/Icones";
import { Mot } from "../composants/Mot";
import { ENCOURAGEMENTS, UNITES, motsDe, phrasesDe, syllabesJusquAu, trouverItem } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import { itemsDus, jour } from "../revisions";
import type { ItemPhrase, ItemSyllabe } from "../types";
import { auHasard, melanger, pause, type PropsActivite } from "./commun";

/** Vérifie qu'une image existe (les illustrations arrivent au fil de leur production). */
async function imageDisponible(nom: string): Promise<boolean> {
  try {
    const r = await fetch(`./images/${nom}`, { method: "HEAD" });
    return r.ok && (r.headers.get("content-type") ?? "").startsWith("image");
  } catch {
    return false;
  }
}

/**
 * C1 Lis et choisis l'image. L'image n'apparaît qu'avec la phrase déjà lue.
 * Sans illustrations disponibles pour l'unité, l'activité se retire d'elle-même.
 */
export function PhraseImage({ f, profil, onFini }: PropsActivite) {
  const { dire, noter } = useSyllakids();
  const [phrases, setPhrases] = useState<ItemPhrase[] | null>(null);
  const [i, setI] = useState(0);
  const [etat, setEtat] = useState<Record<string, "juste" | "faux">>({});
  const occupe = useRef(false);

  useEffect(() => {
    let annule = false;
    void (async () => {
      const toutes = phrasesDe(f);
      const dispo = (await Promise.all(toutes.map(async (p) => ((await imageDisponible(p.image)) ? p : null)))).filter(Boolean) as ItemPhrase[];
      if (annule) return;
      if (dispo.length < 3) return onFini();
      setPhrases(dispo);
      await dire(consigneProfil("C1", profil));
    })();
    return () => {
      annule = true;
    };
  }, [f, profil, dire, onFini]);

  const tours = useMemo(() => {
    if (!phrases) return [];
    return melanger(phrases)
      .slice(0, profil === "5ans" ? 1 : 2)
      .map((cible) => ({ cible, choix: melanger([cible, ...melanger(phrases.filter((p) => p.id !== cible.id)).slice(0, 2)]) }));
  }, [phrases, profil]);

  const tour = tours[i];
  if (!tour) return <div className="scene" />;

  async function choisir(p: ItemPhrase) {
    if (occupe.current || !tour) return;
    occupe.current = true;
    const juste = p.id === tour.cible.id;
    setEtat({ [p.id]: juste ? "juste" : "faux", ...(juste ? {} : { [tour.cible.id]: "juste" }) });
    noter(f.unite.id, tour.cible.id, juste);
    await dire(juste ? auHasard(ENCOURAGEMENTS) : "CON-ERR-07");
    await pause(500);
    setEtat({});
    occupe.current = false;
    if (i + 1 >= tours.length) onFini();
    else setI(i + 1);
  }

  return (
    <div className="scene">
      <div className="phrase lettres regle" style={{ fontSize: "calc(6.5vmin * var(--echelle-texte, 1))" }}>
        {motsDePhrase(tour.cible.texte).map((m, k) => <Mot key={k} texte={m} taille="1em" regle={false} />)}
      </div>
      <div className="images-choix">
        {tour.choix.map((p, k) => (
          <button key={p.id} type="button" className={etat[p.id] ?? ""} onClick={() => choisir(p)} aria-label={`Image ${k + 1}`}>
            <img src={`./images/${p.image}`} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Mots lisibles jusqu'au rang 13, pour la chrono-lecture. */
function motsChrono() {
  const vus = new Set<string>();
  return UNITES.filter((u) => u.unite.rang <= 13)
    .flatMap(motsDe)
    .filter((m) => !m.motOutil && !vus.has(m.texte) && vus.add(m.texte));
}

/** Mots par page de la minute de lecture : tout tient à l'écran, sans défilement. */
const PAR_PAGE = 12;
/** Page en cours : la première dont tous les mots ne sont pas encore lus. */
function page<T extends { id: string }>(mots: T[], lus: Set<string>): T[] {
  for (let k = 0; k < mots.length; k += PAR_PAGE) {
    const p = mots.slice(k, k + PAR_PAGE);
    if (p.some((m) => !lus.has(m.id))) return p;
  }
  return [];
}

/** F1 Chrono-lecture : une minute pour lire le plus de mots possible ; l'enfant touche chaque mot lu. */
export function ChronoLecture({ onFini }: PropsActivite) {
  const { dire, progression, modifier } = useSyllakids();
  const mots = useMemo(() => melanger(motsChrono()).slice(0, 48), []);
  const [lus, setLus] = useState<Set<string>>(new Set());
  const [reste, setReste] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const lusRef = useRef(lus);
  lusRef.current = lus;

  // tous les mots lus avant la fin : la minute s'arrête
  useEffect(() => {
    if (reste !== null && reste > 0 && lus.size === mots.length) setReste(0);
  }, [lus, mots.length, reste]);

  useEffect(() => {
    if (reste === null || reste <= 0) return;
    const t = window.setTimeout(() => setReste(reste - 1), 1000);
    return () => clearTimeout(t);
  }, [reste]);

  useEffect(() => {
    if (reste !== 0) return;
    const n = lusRef.current.size;
    setScore(n);
    const record = !progression.fluence || n > progression.fluence.meilleur;
    if (record) modifier((p) => ({ ...p, fluence: { meilleur: n, date: jour() } }));
    void dire("CON-F1-FIN", undefined, n).then(() => (record && n > 0 ? dire("CON-F1-RECORD") : undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reste]);

  if (reste === null) {
    return (
      <div className="scene">
        <BoutonRond
          nom="Commencer la minute"
          variante="principal grand"
          onClick={async () => {
            await dire("CON-F1-STD");
            setReste(60);
          }}
        ><Fleche /></BoutonRond>
      </div>
    );
  }

  return (
    <div className="scene" style={{ gap: 16 }}>
      <div className="jauge" aria-label={`${reste} secondes`}><span style={{ width: `${(reste / 60) * 100}%` }} /></div>
      {score === null ? (
        <div className="chrono">
          {page(mots, lus).map((m) => (
            <button key={m.id} type="button" className={lus.has(m.id) ? "lu" : ""} onClick={() => setLus((s) => new Set(s).add(m.id))} aria-label={m.texte}>
              <Mot texte={m.texte} segments={m.segments} syllabes={m.syllabes} taille="6.5vmin" aides="arcs" regle={false} />
            </button>
          ))}
        </div>
      ) : (
        <>
          <span className="lettres" style={{ fontSize: "24vmin", color: "var(--vert)" }} aria-label={`${score} mots lus`}>{score}</span>
          <BoutonRond nom="Continuer" variante="principal" onClick={onFini}><Fleche /></BoutonRond>
        </>
      )}
    </div>
  );
}

/** Révision en début de séance : les items dus des unités précédentes (boîtes de Leitner). */
export function Revision({ f, onFini }: PropsActivite) {
  const { dire, noter, progression } = useSyllakids();
  const items = useMemo(
    () => itemsDus(progression.items, jour(), { exclureUnite: f.unite.id, max: 5 }).map(trouverItem).filter(Boolean) as NonNullable<ReturnType<typeof trouverItem>>[],
    // l'ordre est fixé à l'ouverture de la séance
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [i, setI] = useState(0);
  const [ecoute, setEcoute] = useState(false);
  const [etat, setEtat] = useState<Record<string, "juste" | "faux">>({});
  const debut = useRef(false);
  const courant = items[i];

  const choix = useMemo(() => {
    if (!courant || courant.item.type !== "syllabe") return [];
    const cible = courant.item as ItemSyllabe;
    const autres = melanger(syllabesJusquAu(courant.unite.unite.rang).filter((s) => s.texte !== cible.texte && (s.texte[0] === cible.texte[0] || s.texte.at(-1) === cible.texte.at(-1)))).slice(0, 2);
    return melanger([cible, ...autres]);
  }, [courant]);

  useEffect(() => {
    if (debut.current) return;
    debut.current = true;
    if (!items[0]) return onFini();
    void (async () => {
      await dire("CON-GEN-07");
      if (items[0]!.item.type === "syllabe") await jouer(items[0]!.item.id, { texte: items[0]!.item.texte });
    })();
  });

  useEffect(() => {
    if (debut.current && !courant) onFini();
  }, [courant, onFini]);
  if (!courant) return null;

  async function suivant(reussi: boolean) {
    if (!courant) return;
    noter(courant.unite.unite.id, courant.item.id, reussi);
    await dire(reussi ? auHasard(ENCOURAGEMENTS) : "CON-ERR-07");
    if (!reussi) await jouer(courant.item.id, { texte: courant.item.texte });
    setEtat({});
    setEcoute(false);
    const prochain = items[i + 1];
    setI(i + 1);
    if (prochain?.item.type === "syllabe") await jouer(prochain.item.id, { texte: prochain.item.texte });
  }

  if (courant.item.type === "syllabe") {
    return (
      <div className="scene">
        <BoutonRond nom="Réécouter" onClick={() => void jouer(courant.item.id, { texte: courant.item.texte })}><HautParleur /></BoutonRond>
        <div className="etiquettes">
          {choix.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`etiquette ${etat[s.id] ?? ""}`}
              aria-label={s.texte}
              onClick={() => {
                const ok = s.id === courant.item.id;
                setEtat({ [s.id]: ok ? "juste" : "faux" });
                void suivant(ok);
              }}
            ><Mot texte={s.texte} taille="11vmin" pluriel={false} /></button>
          ))}
        </div>
      </div>
    );
  }

  // mot, mot inventé ou phrase : lecture à voix haute, vérification par l'écoute, auto-évaluation
  return (
    <div className="scene">
      {courant.item.type === "phrase" ? (
        <div className="phrase lettres regle" style={{ fontSize: "calc(8vmin * var(--echelle-texte, 1))" }}>{motsDePhrase(courant.item.texte).map((m, k) => <Mot key={k} texte={m} taille="1em" regle={false} />)}</div>
      ) : (
        <Mot texte={courant.item.texte} taille="15vmin" />
      )}
      {!ecoute ? (
        <BoutonRond nom="Vérifier en écoutant" variante="actif" onClick={async () => { await jouer(courant.item.id, { texte: courant.item.texte }); setEcoute(true); }}><HautParleur /></BoutonRond>
      ) : (
        <div className="actions">
          <BoutonRond nom="J'avais bien lu" variante="oui grand" onClick={() => suivant(true)}><VisageContent /></BoutonRond>
          <BoutonRond nom="Ce n'était pas ça" variante="non grand" onClick={() => suivant(false)}><VisageTriste /></BoutonRond>
        </div>
      )}
    </div>
  );
}
