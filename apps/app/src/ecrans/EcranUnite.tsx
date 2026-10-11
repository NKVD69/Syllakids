import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { naviguer } from "../App";
import { BoutonRond } from "../composants/BoutonRond";
import { Etoile, Fleche, Maison, Oreille } from "../composants/Icones";
import { UNITES, unite } from "../contenu";
import { deroule, nombreSeances } from "../seances";
import { useSyllakids } from "../contexte";

export function EcranUnite({ id }: { id: string }) {
  const f = unite(id);
  const { progression, modifier, dire, redire } = useSyllakids();
  const profil = progression.reglages.profil;
  const total = f ? nombreSeances(f) : 1;
  const faites = progression.seances[id] ?? (progression.terminees.includes(id) ? total : 0);
  // la séance est fixée à l'ouverture de l'écran ; une unité terminée se rejoue depuis la séance 1
  const seance = useRef(faites >= total ? 0 : faites).current;
  const etapes = useMemo(() => (f ? deroule(f, profil, seance) : []), [f, profil, seance]);
  const [i, setI] = useState(0);

  const suivante = useCallback(() => setI((k) => k + 1), []);

  const fini = i >= etapes.length;

  useEffect(() => {
    if (!f) naviguer("#/");
  }, [f]);

  useEffect(() => {
    if (!fini || etapes.length === 0) return;
    const derniere = seance + 1 >= total;
    modifier((p) => ({
      ...p,
      seances: { ...p.seances, [id]: Math.max(p.seances[id] ?? 0, seance + 1) },
      terminees: derniere && !p.terminees.includes(id) ? [...p.terminees, id] : p.terminees,
    }));
    if (!derniere) void dire("CON-GEN-11");
    else void dire(UNITES.at(-1)?.unite.id === id ? "CON-PROG-09" : "CON-PROG-01");
  }, [fini, etapes.length, id, modifier, dire, seance, total]);

  if (!f) return null;
  const Courante = etapes[i]?.composant;

  return (
    <>
      <header className="barre">
        <BoutonRond nom="Revenir au chemin" variante="petit" onClick={() => naviguer("#/")}><Maison /></BoutonRond>
        <BoutonRond nom="Réécouter la consigne" variante="petit" onClick={() => void redire()}><Oreille /></BoutonRond>
        <span className="espace" />
        <div className="avancement" aria-label={`Étape ${Math.min(i + 1, etapes.length)} sur ${etapes.length}`}>
          {etapes.map((e, k) => (
            <span key={k} className={k < i ? "fait" : k === i ? "encours" : ""} />
          ))}
        </div>
      </header>
      <main className="cahier" style={{ flex: 1, display: "flex" }}>
        {Courante ? (
          <Courante key={i} f={f} profil={profil} onFini={suivante} />
        ) : (
          <div className="scene">
            <span className="fin" aria-hidden><Etoile /></span>
            <BoutonRond nom="Revenir au chemin" variante="principal" onClick={() => naviguer("#/")}><Fleche /></BoutonRond>
          </div>
        )}
      </main>
    </>
  );
}
