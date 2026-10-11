import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { naviguer } from "../App";
import { Glissade } from "../activites/Glissade";
import { LisLeMot } from "../activites/LisLeMot";
import { PhraseKaraoke } from "../activites/PhraseKaraoke";
import { Presentation, PresentationVoyelles } from "../activites/Presentation";
import { TableauSyllabes } from "../activites/TableauSyllabes";
import { TraceLettre } from "../activites/TraceLettre";
import type { PropsActivite } from "../activites/commun";
import { BoutonRond } from "../composants/BoutonRond";
import { Etoile, Fleche, Maison, Oreille } from "../composants/Icones";
import { UNITES, motsDe, phrasesDe, unite } from "../contenu";
import { useSyllakids } from "../contexte";
import type { FichierUnite, Profil } from "../types";

type Activite = { code: string; composant: ComponentType<PropsActivite> };

/** Déroulé d'une unité : écouter, répéter, lire, écrire (cahier des charges, section 5). */
function deroule(f: FichierUnite, profil: Profil): Activite[] {
  const { bloc } = f.unite;
  if (bloc === "voyelles") {
    return [
      { code: "presentation", composant: PresentationVoyelles },
      { code: "L3", composant: TableauSyllabes },
      { code: "E1", composant: TraceLettre },
    ];
  }
  if (bloc === "bilan") {
    return [
      { code: "L5", composant: LisLeMot },
      { code: "L7", composant: PhraseKaraoke },
    ];
  }
  const etapes: Activite[] = [
    { code: "presentation", composant: Presentation },
    { code: "L1", composant: Glissade },
    { code: "L3", composant: TableauSyllabes },
  ];
  if (motsDe(f).some((m) => !m.motOutil)) etapes.push({ code: "L5", composant: LisLeMot });
  etapes.push({ code: "E1", composant: TraceLettre });
  if (phrasesDe(f).length > 0 && !(profil === "5ans" && f.unite.rang < 6)) etapes.push({ code: "L7", composant: PhraseKaraoke });
  return etapes;
}

export function EcranUnite({ id }: { id: string }) {
  const f = unite(id);
  const { progression, modifier, dire, redire } = useSyllakids();
  const profil = progression.reglages.profil;
  const etapes = useMemo(() => (f ? deroule(f, profil) : []), [f, profil]);
  const [i, setI] = useState(0);

  const suivante = useCallback(() => setI((k) => k + 1), []);

  const fini = i >= etapes.length;

  useEffect(() => {
    if (!f) naviguer("#/");
  }, [f]);

  useEffect(() => {
    if (!fini || etapes.length === 0) return;
    modifier((p) => (p.terminees.includes(id) ? p : { ...p, terminees: [...p.terminees, id] }));
    const derniere = UNITES.at(-1)?.unite.id === id;
    void dire(derniere ? "CON-PROG-09" : "CON-PROG-01");
  }, [fini, etapes.length, id, modifier, dire]);

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
            <span key={e.code} className={k < i ? "fait" : k === i ? "encours" : ""} />
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
