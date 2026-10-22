import { motsDePhrase } from "@syllakids/decodabilite";
import { useEffect, useMemo, useState } from "react";
import { jouer } from "../audio";
import { BoutonRond } from "../composants/BoutonRond";
import { Fleche, HautParleur } from "../composants/Icones";
import { Mot } from "../composants/Mot";
import { phrasesDe } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import type { PropsActivite } from "./commun";

/** L7 La phrase karaoké : l'enfant lit, puis écoute la phrase pendant que les mots s'allument. */
export function PhraseKaraoke({ f, profil, onFini }: PropsActivite) {
  const { dire } = useSyllakids();
  const phrases = useMemo(() => phrasesDe(f).slice(0, profil === "5ans" ? 2 : 4), [f, profil]);
  const [i, setI] = useState(0);
  const [lu, setLu] = useState(-1);
  const [ecoutee, setEcoutee] = useState(false);
  const phrase = phrases[i];

  useEffect(() => {
    void dire(consigneProfil("L7", profil));
  }, [dire, profil]);

  useEffect(() => {
    if (!phrase) onFini();
  }, [phrase, onFini]);
  if (!phrase) return null;
  const mots = motsDePhrase(phrase.texte);
  const ponctuation = phrase.texte.trim().slice(-1);
  // position de chaque mot dans le texte, pour suivre la lecture
  const debuts = mots.map((m, k) => phrase.texte.toLocaleUpperCase("fr-FR").indexOf(m, k === 0 ? 0 : undefined));

  async function ecouter() {
    await jouer(phrase!.id, {
      texte: phrase!.texte,
      surMot: (c) => setLu(debuts.filter((d) => d <= c).length - 1),
    });
    setLu(-1);
    setEcoutee(true);
  }

  return (
    <div className="scene">
      <div className="phrase lettres regle" style={{ fontSize: "calc(8.5vmin * var(--echelle-texte, 1))" }}>
        {mots.map((m, k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "flex-end" }}>
            <Mot texte={m} taille="1em" className={k === lu ? "lu" : ""} regle={false} />
            {k === mots.length - 1 && /[.!?]/.test(ponctuation) && (
              <span className="lettres" style={{ marginLeft: ponctuation === "." ? "0.04em" : "0.25em" }}>{ponctuation}</span>
            )}
          </span>
        ))}
      </div>
      <div className="actions">
        <BoutonRond nom="Écouter la phrase" variante={ecoutee ? undefined : "actif"} onClick={ecouter}><HautParleur /></BoutonRond>
        <BoutonRond
          nom="Phrase suivante"
          variante="principal"
          desactive={!ecoutee}
          onClick={() => {
            setEcoutee(false);
            if (i + 1 < phrases.length) setI(i + 1);
            else onFini();
          }}
        ><Fleche /></BoutonRond>
      </div>
    </div>
  );
}
