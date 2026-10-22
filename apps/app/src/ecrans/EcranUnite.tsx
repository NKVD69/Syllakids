import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { naviguer } from "../App";
import { BoutonRond } from "../composants/BoutonRond";
import { Etoile, Fleche, Maison, Oreille } from "../composants/Icones";
import { UNITES, unite } from "../contenu";
import { estMaitrisee, itemsDus, jour } from "../revisions";
import { deroule, nombreSeances } from "../seances";
import { useSyllakids } from "../contexte";

export function EcranUnite({ id }: { id: string }) {
  const f = unite(id);
  const { progression, modifier, dire, redire, debutSeance, bilanSeance, compterTemps, synchroniserMaintenant } = useSyllakids();
  const profil = progression.reglages.profil;
  const total = f ? nombreSeances(f) : 1;
  const faites = progression.seances[id] ?? (progression.terminees.includes(id) ? total : 0);
  // la séance est fixée à l'ouverture de l'écran ; une unité terminée se rejoue depuis la séance 1
  const seance = useRef(faites >= total ? 0 : faites).current;
  // révision en tête de séance si des items d'unités précédentes sont à revoir aujourd'hui
  const revision = useRef(itemsDus(progression.items, jour(), { exclureUnite: id }).length > 0).current;
  const micro = useRef(progression.reglages.micro !== false).current;
  const etapes = useMemo(() => (f ? deroule(f, profil, seance, revision, micro) : []), [f, profil, seance, revision, micro]);
  useEffect(() => debutSeance(), [debutSeance]);
  const [i, setI] = useState(0);

  const suivante = useCallback(() => setI((k) => k + 1), []);

  const fini = i >= etapes.length;

  // temps de lecture : compté par tranches de 15 secondes tant que l'écran est visible
  useEffect(() => {
    if (fini) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") compterTemps(15);
    }, 15_000);
    return () => window.clearInterval(t);
  }, [fini, compterTemps]);

  useEffect(() => {
    if (!f) naviguer("#/");
  }, [f]);

  const [revoir, setRevoir] = useState(false);
  useEffect(() => {
    if (!fini || etapes.length === 0) return;
    // la dernière séance valide l'unité seulement si le critère de maîtrise est atteint
    const derniere = seance + 1 >= total;
    const maitrisee = !derniere || total === 1 || estMaitrisee(bilanSeance(), profil);
    const validee = derniere && maitrisee;
    modifier((p) => ({
      ...p,
      seances: { ...p.seances, [id]: maitrisee ? Math.max(p.seances[id] ?? 0, seance + 1) : seance },
      terminees: validee && !p.terminees.includes(id) ? [...p.terminees, id] : p.terminees,
    }));
    if (!maitrisee) {
      setRevoir(true);
      void dire("CON-PROG-06");
    } else if (!derniere) void dire("CON-GEN-11");
    else void dire(UNITES.at(-1)?.unite.id === id ? "CON-PROG-09" : "CON-PROG-01");
    // fin de séance : bon moment pour envoyer les progrès
    window.setTimeout(() => void synchroniserMaintenant(), 500);
  }, [fini, etapes.length, id, modifier, dire, seance, total, bilanSeance, profil, synchroniserMaintenant]);

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
            <span className="fin" aria-hidden style={revoir ? { color: "var(--bleu)" } : undefined}><Etoile /></span>
            <BoutonRond nom="Revenir au chemin" variante="principal" onClick={() => naviguer("#/")}><Fleche /></BoutonRond>
          </div>
        )}
      </main>
    </>
  );
}
