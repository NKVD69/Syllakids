import { useEffect, useMemo, useState } from "react";
import { jouer } from "../audio";
import { Mot } from "../composants/Mot";
import { syllabesDe } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import type { ItemSyllabe } from "../types";
import { melanger, type PropsActivite } from "./commun";

/** L3 Le tableau de syllabes : chaque syllabe s'allume à son tour, l'enfant la lit puis la touche pour vérifier. */
export function TableauSyllabes({ f, profil, onFini }: PropsActivite) {
  const { dire } = useSyllakids();
  const base = useMemo<ItemSyllabe[]>(() => {
    const s = syllabesDe(f);
    if (f.unite.rang === 0 && f.unite.revision) {
      // chaque voyelle une seule fois (les grilles de révision du livret répètent certaines voyelles)
      const lignes = [...new Set(f.unite.revision.slice(0, profil === "5ans" ? 1 : 2).flat())];
      return lignes.map((v) => s.find((x) => x.texte === v)!).filter(Boolean);
    }
    return s;
  }, [f, profil]);
  const tours = profil === "5ans" ? 1 : 2;
  const [tour, setTour] = useState(0);
  const [ordre, setOrdre] = useState(base);
  const [i, setI] = useState(0);

  useEffect(() => {
    void dire(consigneProfil("L3", profil));
  }, [dire, profil]);

  async function toucher(k: number) {
    if (k !== i) return;
    const s = ordre[k]!;
    await jouer(s.id, { texte: s.texte });
    if (k + 1 < ordre.length) setI(k + 1);
    else if (tour + 1 < tours) {
      setTour(tour + 1);
      setOrdre(melanger(base));
      setI(0);
      void dire("CON-L3-MELANGE");
    } else onFini();
  }

  const colonnes = ordre.length % 3 === 0 ? 3 : 5;
  return (
    <div className="scene">
      <div className="grille" style={{ gridTemplateColumns: `repeat(${colonnes}, auto)`, gap: "2.4vmin 5vmin" }}>
        {ordre.map((s, k) => (
          <button
            key={`${tour}-${s.id}`}
            type="button"
            onClick={() => toucher(k)}
            aria-label={k === i ? `Syllabe à lire : ${s.texte}` : s.texte}
            aria-current={k === i}
            style={{ border: 0, background: "transparent", cursor: k === i ? "pointer" : "default", opacity: k < i ? 0.35 : 1, padding: 6 }}
          >
            <Mot texte={s.texte} taille={k === i ? "13vmin" : "9vmin"} aides={k === i ? "complet" : "nu"} pluriel={false} />
          </button>
        ))}
      </div>
    </div>
  );
}
