/**
 * Synchronisation de la progression d'un enfant avec le serveur.
 * L'appareil travaille hors ligne ; à chaque occasion (ouverture, fin de séance, retour du réseau),
 * il envoie sa version. Si un autre appareil a écrit entre-temps, le serveur refuse et renvoie la sienne :
 * l'appareil fusionne les deux (rien n'est perdu) et renvoie le résultat.
 */
import { fusionner, memeProgression, normaliser, type Progression } from "./progression";

export interface PortProgression {
  lire(enfant: string): Promise<{ donnees: unknown; version: number } | null>;
  ecrire(enfant: string, donnees: Progression, version: number): Promise<{ ok: boolean; version: number; donnees: unknown | null }>;
}

export interface EtatSynchro {
  progression: Progression;
  version: number;
}

export async function synchroniser(port: PortProgression, enfant: string, progression: Progression, version: number, sale: boolean): Promise<EtatSynchro> {
  let local = progression;
  let v = version;
  if (!sale) {
    const distant = await port.lire(enfant);
    if (distant) {
      if (distant.version === v) return { progression: local, version: v };
      const serveur = normaliser(distant.donnees);
      local = fusionner(local, serveur);
      v = distant.version;
      // rien de nouveau sur cet appareil : on prend simplement la version du serveur
      if (memeProgression(local, serveur)) return { progression: local, version: v };
    } else if (v === 0 && memeProgression(local, normaliser({}))) {
      return { progression: local, version: v };
    }
  }
  for (let essai = 0; essai < 4; essai++) {
    const r = await port.ecrire(enfant, local, v);
    if (r.ok) return { progression: local, version: r.version };
    if (r.donnees) local = fusionner(local, normaliser(r.donnees));
    v = r.version;
  }
  throw new Error("La synchronisation n'a pas abouti, elle sera retentée plus tard.");
}
