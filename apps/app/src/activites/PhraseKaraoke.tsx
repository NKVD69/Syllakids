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
      <div className="phrase" style={{ fontSize: "8.5vmin" }}>
        {mots.map((m, k) => (
          <Mot key={k} texte={m} taille="1em" className={k === lu ? "lu" : ""} />
        ))}
        {/[.!?]/.test(ponctuation) && <span className="lettres">{ponctuation}</span>}
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
