import { useEffect, useState } from "react";
import { jouer, texteDuSon } from "../audio";
import { BoutonRond } from "../composants/BoutonRond";
import { Parler, Fleche, HautParleur } from "../composants/Icones";
import { syllabesDe } from "../contenu";
import { useSyllakids } from "../contexte";
import type { PropsActivite } from "./commun";

/** Présentation du son de l'unité : la lettre, son son, « dis-le avec moi ». */
export function Presentation({ f, onFini }: PropsActivite) {
  const { dire } = useSyllakids();
  const g = f.unite.graphemes[0]!;
  const son = texteDuSon(g.g, g.type);
  const [ecoute, setEcoute] = useState(false);

  useEffect(() => {
    void dire("CON-SON-05", son);
  }, [dire, son]);

  return (
    <div className="scene">
      <span className="lettres regle" style={{ fontSize: "28vmin", color: "var(--bleu)" }} aria-label={`Lettre ${g.g}`}>{g.g}</span>
      <div className="actions">
        <BoutonRond nom="Écouter le son" onClick={async () => { await dire("CON-SON-01", son); setEcoute(true); }}><HautParleur /></BoutonRond>
        <BoutonRond
          nom="Le dire avec moi"
          onClick={async () => {
            await dire("CON-SON-02", son);
            if (g.type === "consonne-longue") await dire("CON-SON-03");
            if (g.type === "occlusive") await dire("CON-SON-04");
            setEcoute(true);
          }}
        ><Parler /></BoutonRond>
        <BoutonRond nom="Continuer" variante="principal" desactive={!ecoute} onClick={onFini}><Fleche /></BoutonRond>
      </div>
    </div>
  );
}

/** Présentation des voyelles : l'enfant touche chaque lettre pour entendre son son. */
export function PresentationVoyelles({ f, onFini }: PropsActivite) {
  const { dire } = useSyllakids();
  const syllabes = syllabesDe(f);
  const [ecoutees, setEcoutees] = useState<Set<string>>(new Set());

  useEffect(() => {
    void dire("CON-GEN-08");
  }, [dire]);

  return (
    <div className="scene">
      <div className="grille" style={{ gridTemplateColumns: "repeat(3, auto)" }}>
        {syllabes.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`tuile ${ecoutees.has(s.id) ? "ecoutee" : ""}`}
            style={{ fontSize: "13vmin" }}
            aria-label={`Voyelle ${s.texte}`}
            onClick={async () => {
              setEcoutees((e) => new Set(e).add(s.id));
              await jouer(s.id, { texte: s.texte });
            }}
          >{s.texte}</button>
        ))}
      </div>
      <BoutonRond nom="Continuer" variante="principal" desactive={ecoutees.size < 5} onClick={onFini}><Fleche /></BoutonRond>
    </div>
  );
}
