import { useEffect, useMemo, useRef, useState } from "react";
import { jouer } from "../audio";
import { BoutonRond } from "../composants/BoutonRond";
import { HautParleur, Interrogation, Pouce } from "../composants/Icones";
import { Mot } from "../composants/Mot";
import { ENCOURAGEMENTS, motsDe, pseudosDe, syllabesDe, syllabesJusquAu } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import type { ItemSyllabe } from "../types";
import { auHasard, melanger, pause, type PropsActivite } from "./commun";

/** Distracteurs proches : même voyelle ou même consonne, déjà lisibles. */
function distracteurs(cible: ItemSyllabe, rang: number, n: number): ItemSyllabe[] {
  const reserve = syllabesJusquAu(rang).filter((s) => s.texte !== cible.texte);
  const proches = reserve.filter((s) => s.texte.at(-1) === cible.texte.at(-1) || s.texte[0] === cible.texte[0]);
  const uniques = [...new Map(melanger(proches.length >= n ? proches : reserve).map((s) => [s.texte, s])).values()];
  return uniques.slice(0, n);
}

/** L4 Quelle syllabe ? Une syllabe est dite, l'enfant touche celle qu'il a entendue. */
export function QuelleSyllabe({ f, profil, onFini }: PropsActivite) {
  const { dire } = useSyllakids();
  const tours = useMemo(() => {
    const cibles = melanger(syllabesDe(f)).slice(0, profil === "5ans" ? 3 : 5);
    return cibles.map((c) => ({ cible: c, choix: melanger([c, ...distracteurs(c, Math.min(f.unite.rang, 13), profil === "5ans" ? 2 : 3)]) }));
  }, [f, profil]);
  const [i, setI] = useState(0);
  const [etat, setEtat] = useState<Record<string, "juste" | "faux">>({});
  const erreurs = useRef(0);
  const occupe = useRef(true);
  const debut = useRef(false);
  const tour = tours[i]!;
  const direCible = (t = tour) => jouer(t.cible.id, { texte: t.cible.texte });

  useEffect(() => {
    if (debut.current) return;
    debut.current = true;
    void (async () => {
      await dire(consigneProfil("L4", profil));
      await direCible(tours[0]);
      occupe.current = false;
    })();
  });

  async function choisir(s: ItemSyllabe) {
    if (occupe.current) return;
    occupe.current = true;
    if (s.texte === tour.cible.texte) {
      setEtat({ [s.id]: "juste" });
      erreurs.current = 0;
      await dire(auHasard(ENCOURAGEMENTS));
      setEtat({});
      if (i + 1 >= tours.length) return onFini();
      setI(i + 1);
      await pause(200);
      await direCible(tours[i + 1]);
    } else {
      setEtat((e) => ({ ...e, [s.id]: "faux" }));
      erreurs.current += 1;
      if (erreurs.current >= 3) {
        erreurs.current = 0;
        setEtat({ [tour.cible.id]: "juste" });
        await dire("CON-ERR-08");
        setEtat({});
        if (i + 1 >= tours.length) return onFini();
        setI(i + 1);
        await direCible(tours[i + 1]);
      } else {
        await dire(erreurs.current >= 2 ? "CON-L4-AIDE" : "CON-ERR-02");
        await direCible();
      }
    }
    occupe.current = false;
  }

  return (
    <div className="scene">
      <BoutonRond nom="Réécouter la syllabe" onClick={() => void direCible()}><HautParleur /></BoutonRond>
      <div className="etiquettes">
        {tour.choix.map((s) => (
          <button key={`${i}-${s.id}`} type="button" className={`etiquette ${etat[s.id] ?? ""}`} onClick={() => choisir(s)} aria-label={s.texte}>
            <Mot texte={s.texte} taille="11vmin" pluriel={false} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** L6 Vrai mot ou mot inventé ? L'enfant lit, puis dit si le mot existe : il doit déchiffrer, pas reconnaître. */
export function VraiOuInvente({ f, profil, onFini }: PropsActivite) {
  const { dire } = useSyllakids();
  const n = profil === "5ans" ? 2 : 3;
  const items = useMemo(
    () =>
      melanger([
        ...melanger(motsDe(f).filter((m) => !m.motOutil)).slice(0, n).map((m) => ({ ...m, vrai: true })),
        ...melanger(pseudosDe(f)).slice(0, n).map((m) => ({ ...m, vrai: false })),
      ]),
    [f, n],
  );
  const [i, setI] = useState(0);
  const occupe = useRef(false);
  const item = items[i];

  useEffect(() => {
    void dire(consigneProfil("L6", profil));
  }, [dire, profil]);

  useEffect(() => {
    if (!item) onFini();
  }, [item, onFini]);
  if (!item) return null;

  async function repondre(vrai: boolean) {
    if (occupe.current || !item) return;
    occupe.current = true;
    await dire(vrai === item.vrai ? auHasard(ENCOURAGEMENTS) : "CON-ERR-07");
    await jouer(item.id, { texte: item.texte });
    occupe.current = false;
    if (i + 1 >= items.length) onFini();
    else setI(i + 1);
  }

  return (
    <div className="scene">
      <Mot texte={item.texte} segments={item.segments} syllabes={item.syllabes} taille="15vmin" />
      <div className="actions" style={{ gap: "10vmin" }}>
        <BoutonRond nom="C'est un vrai mot" variante="oui grand" onClick={() => repondre(true)}><Pouce /></BoutonRond>
        <BoutonRond nom="C'est un mot inventé" variante="grand" onClick={() => repondre(false)}><Interrogation /></BoutonRond>
      </div>
    </div>
  );
}
