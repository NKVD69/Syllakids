import { useEffect, useMemo, useState } from "react";
import { jouer } from "../audio";
import { BoutonRond } from "../composants/BoutonRond";
import { Fleche, HautParleur } from "../composants/Icones";
import { Mot } from "../composants/Mot";
import { ENCOURAGEMENTS, motsDe } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import { auHasard, melanger, type PropsActivite, useAvancement } from "./commun";

/** L5 Lis le mot : l'enfant lit à voix haute, puis touche le haut-parleur pour vérifier. Pas d'image avant la lecture. */
export function LisLeMot({ f, profil, onFini, avancer }: PropsActivite) {
  const { dire } = useSyllakids();
  const nombre = f.unite.bloc === "bilan" ? (profil === "5ans" ? 6 : 10) : profil === "5ans" ? 3 : 5;
  const mots = useMemo(() => melanger(motsDe(f).filter((m) => !m.motOutil)).slice(0, nombre), [f, nombre]);
  const [i, setI] = useState(0);
  useAvancement(avancer, i, mots.length);
  const [verifie, setVerifie] = useState(false);
  const mot = mots[i];

  useEffect(() => {
    void dire(consigneProfil("L5", profil));
  }, [dire, profil]);

  useEffect(() => {
    if (!mot) onFini();
  }, [mot, onFini]);
  if (!mot) return null;

  return (
    <div className="scene">
      <Mot texte={mot.texte} segments={mot.segments} syllabes={mot.syllabes} taille={mot.texte.length > 6 ? "13vmin" : "17vmin"} />
      <div className="actions">
        <BoutonRond nom="Vérifier en écoutant" variante={verifie ? undefined : "actif"} onClick={async () => { await jouer(mot.id, { texte: mot.texte }); setVerifie(true); }}><HautParleur /></BoutonRond>
        <BoutonRond
          nom="Mot suivant"
          variante="principal"
          desactive={!verifie}
          onClick={() => {
            void dire(auHasard(ENCOURAGEMENTS));
            setVerifie(false);
            if (i + 1 < mots.length) setI(i + 1);
            else onFini();
          }}
        ><Fleche /></BoutonRond>
      </div>
    </div>
  );
}
