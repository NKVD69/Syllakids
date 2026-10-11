import type { ComponentType } from "react";
import { QuelleSyllabe, VraiOuInvente } from "./activites/Choix";
import { IntrusSonore, JEntends, OuEstLeSon } from "./activites/Ecoute";
import { Glissade } from "./activites/Glissade";
import { LisLeMot } from "./activites/LisLeMot";
import { PhraseKaraoke } from "./activites/PhraseKaraoke";
import { Presentation, PresentationVoyelles } from "./activites/Presentation";
import { Echo, SonQuiDure } from "./activites/Repeter";
import { TableauSyllabes } from "./activites/TableauSyllabes";
import { TraceLettre } from "./activites/TraceLettre";
import type { PropsActivite } from "./activites/commun";
import { motsDe, phrasesDe, pseudosDe } from "./contenu";
import type { FichierUnite, Profil } from "./types";

export type Activite = { code: string; composant: ComponentType<PropsActivite> };

/** Nombre de séances d'une unité (cahier des charges, section 5 : 2 à 4 séances par unité). */
export function nombreSeances(f: FichierUnite): number {
  return f.unite.bloc === "bilan" ? 1 : 2;
}

/**
 * Déroulé d'une séance : écouter, répéter, lire, écrire.
 * Séance 1 : découverte du son. Séance 2 : entraînement et lecture de mots et de phrases.
 */
export function deroule(f: FichierUnite, profil: Profil, seance: number): Activite[] {
  const { bloc, rang } = f.unite;
  const cinq = profil === "5ans";
  if (bloc === "bilan") {
    return [
      { code: "L5", composant: LisLeMot },
      { code: "L7", composant: PhraseKaraoke },
    ];
  }
  if (bloc === "voyelles") {
    return seance === 0
      ? [
          { code: "presentation", composant: PresentationVoyelles },
          { code: "L3", composant: TableauSyllabes },
          { code: "E1", composant: TraceLettre },
        ]
      : [
          { code: "R2", composant: SonQuiDure },
          { code: "L4", composant: QuelleSyllabe },
          { code: "R1", composant: Echo },
        ];
  }
  const longue = f.unite.graphemes[0]?.type === "consonne-longue";
  if (seance === 0) {
    return [
      { code: "presentation", composant: Presentation },
      { code: "A1", composant: JEntends },
      longue ? { code: "R2", composant: SonQuiDure } : { code: "R1", composant: Echo },
      { code: "L1", composant: Glissade },
      { code: "L3", composant: TableauSyllabes },
      { code: "E1", composant: TraceLettre },
    ];
  }
  const etapes: Activite[] = [{ code: "A2", composant: OuEstLeSon }];
  if (!cinq) etapes.push({ code: "A3", composant: IntrusSonore });
  etapes.push({ code: "R1", composant: Echo }, { code: "L4", composant: QuelleSyllabe });
  if (motsDe(f).some((m) => !m.motOutil)) etapes.push({ code: "L5", composant: LisLeMot });
  if (!cinq && pseudosDe(f).length > 0) etapes.push({ code: "L6", composant: VraiOuInvente });
  if (phrasesDe(f).length > 0 && !(cinq && rang < 6)) etapes.push({ code: "L7", composant: PhraseKaraoke });
  return etapes;
}
