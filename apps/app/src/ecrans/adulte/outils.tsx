/** Petits outils communs aux écrans de l'espace adulte. */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { UNITES } from "../../contenu";
import { messageErreur } from "../../serveur/backend";
import type { UniteResumee } from "../../suivi";

export const UNITES_RESUMEES: UniteResumee[] = UNITES.map((u) => ({ id: u.unite.id, titre: u.unite.titre, bloc: u.unite.bloc }));

export function nomUnite(u: UniteResumee | null): string {
  if (!u) return "Parcours terminé";
  if (u.bloc === "voyelles") return "Les voyelles";
  if (u.bloc === "bilan") return "Bilan de lecture";
  return `Le son ${u.titre}`;
}

/** Chargement asynchrone avec état d'erreur et rechargement. */
export function useDonnees<T>(charger: (() => Promise<T>) | null, deps: unknown[]): { donnees: T | undefined; erreur: string | null; recharger: () => void } {
  const [donnees, setDonnees] = useState<T | undefined>(undefined);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tour, setTour] = useState(0);
  useEffect(() => {
    if (!charger) return;
    let fini = false;
    setErreur(null);
    charger().then(
      (d) => !fini && setDonnees(d),
      (e) => !fini && setErreur(messageErreur(e)),
    );
    return () => {
      fini = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tour]);
  const recharger = useCallback(() => setTour((t) => t + 1), []);
  return { donnees, erreur, recharger };
}

/** Exécute une action en affichant « en cours », puis le message de réussite ou l'erreur. */
export function useAction(): { occupe: boolean; message: { texte: string; erreur: boolean } | null; lancer: (f: () => Promise<string | void>) => Promise<boolean>; effacer: () => void } {
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const lancer = useCallback(async (f: () => Promise<string | void>) => {
    setOccupe(true);
    setMessage(null);
    try {
      const m = await f();
      if (m) setMessage({ texte: m, erreur: false });
      return true;
    } catch (e) {
      setMessage({ texte: messageErreur(e), erreur: true });
      return false;
    } finally {
      setOccupe(false);
    }
  }, []);
  return { occupe, message, lancer, effacer: () => setMessage(null) };
}

export function Message({ message }: { message: { texte: string; erreur: boolean } | null | undefined }) {
  if (!message) return null;
  return message.erreur ? (
    <p className="message-adulte erreur" role="alert">{message.texte}</p>
  ) : (
    <p className="message-adulte" role="status">{message.texte}</p>
  );
}

export function Erreur({ texte }: { texte: string | null }) {
  return texte ? <p className="message-adulte erreur" role="alert">{texte}</p> : null;
}

export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="carte-adulte" aria-label={titre}>
      <h2>{titre}</h2>
      {children}
    </section>
  );
}

export function telecharger(nom: string, contenu: string, type: string) {
  // nom de fichier sans accents : certains navigateurs ignorent sinon le nom proposé
  nom = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "-");
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dateFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function dateHeureFr(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Année scolaire en cours, par exemple « 2026-2027 » (bascule au 1er août). */
export function anneeScolaire(d = new Date()): string {
  const a = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${a}-${a + 1}`;
}

export const MOT_DE_PASSE_MIN = 10;
