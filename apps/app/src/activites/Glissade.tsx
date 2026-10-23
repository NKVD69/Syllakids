import { useEffect, useRef, useState } from "react";
import { jouer } from "../audio";
import { syllabesDe } from "../contenu";
import { consigneProfil, useSyllakids } from "../contexte";
import { pause, type PropsActivite, useAvancement } from "./commun";

/** L1 La glissade : l'enfant fait glisser la consonne jusqu'à la voyelle, les deux sons se collent. */
export function Glissade({ f, profil, onFini, avancer }: PropsActivite) {
  const { dire } = useSyllakids();
  const consonne = f.unite.graphemes[0]!.g;
  const voyelles = profil === "5ans" ? ["A", "I", "O"] : ["A", "I", "O", "U"];
  const [tour, setTour] = useState(0);
  useAvancement(avancer, tour, voyelles.length);
  const [decalage, setDecalage] = useState({ x: 0, y: 0 });
  const [colle, setColle] = useState(false);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const refVoyelle = useRef<HTMLDivElement>(null);
  const refConsonne = useRef<HTMLDivElement>(null);
  const voyelle = voyelles[tour]!;
  const syllabe = syllabesDe(f).find((s) => s.texte === consonne + voyelle)!;

  useEffect(() => {
    void dire(consigneProfil("L1", profil));
  }, [dire, profil]);

  async function lacher() {
    depart.current = null;
    const a = refConsonne.current?.getBoundingClientRect();
    const b = refVoyelle.current?.getBoundingClientRect();
    const touche = a && b && a.right > b.left - 12 && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
    if (!touche) {
      setDecalage({ x: 0, y: 0 });
      return;
    }
    setColle(true);
    await jouer(syllabe.id, { texte: syllabe.texte });
    await dire("CON-L1-SUITE");
    await pause(600);
    setColle(false);
    setDecalage({ x: 0, y: 0 });
    if (tour + 1 < voyelles.length) setTour(tour + 1);
    else onFini();
  }

  return (
    <div className="scene">
      {colle ? (
        <span className="lettres syllabe arc c0 regle" style={{ fontSize: "24vmin" }}>{consonne + voyelle}</span>
      ) : (
        <div className="piste">
          <div
            ref={refConsonne}
            className="tuile mobile"
            role="button"
            aria-label={`Lettre ${consonne}, à faire glisser`}
            style={{ fontSize: "20vmin", color: "var(--bleu)", transform: `translate(${decalage.x}px, ${decalage.y}px)` }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              depart.current = { x: e.clientX - decalage.x, y: e.clientY - decalage.y };
            }}
            onPointerMove={(e) => {
              if (depart.current) setDecalage({ x: e.clientX - depart.current.x, y: e.clientY - depart.current.y });
            }}
            onPointerUp={lacher}
            onPointerCancel={() => { depart.current = null; setDecalage({ x: 0, y: 0 }); }}
          >{consonne}</div>
          <div ref={refVoyelle} className="tuile" style={{ fontSize: "20vmin", color: "var(--rouge)" }}>{voyelle}</div>
        </div>
      )}
    </div>
  );
}
