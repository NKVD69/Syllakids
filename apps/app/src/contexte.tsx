import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { jouer } from "./audio";
import { consigne } from "./contenu";
import { charger, enregistrer, type Progression } from "./progression";
import { jour, noterItem, type BilanSeance } from "./revisions";

interface Contexte {
  progression: Progression;
  modifier: (f: (p: Progression) => Progression) => void;
  /** Dit une consigne (et la mémorise pour le bouton « oreille »). */
  dire: (id: string, son?: string, nombre?: number) => Promise<void>;
  /** Enregistre le résultat d'un item lu ou écrit : révisions espacées et bilan de la séance. */
  noter: (unite: string, item: string, reussi: boolean) => void;
  /** Remet à zéro le bilan de la séance qui commence. */
  debutSeance: () => void;
  bilanSeance: () => BilanSeance;
  /** Rejoue la dernière consigne. */
  redire: () => Promise<void>;
}

const Ctx = createContext<Contexte | null>(null);

export function FournisseurSyllakids({ children }: { children: ReactNode }) {
  const [progression, setProgression] = useState(charger);
  const derniere = useRef<{ id: string; son?: string; nombre?: number } | null>(null);
  const bilan = useRef<BilanSeance>({ essais: 0, reussites: 0 });

  const modifier = useCallback((f: (p: Progression) => Progression) => {
    setProgression((p) => {
      const n = f(p);
      enregistrer(n);
      return n;
    });
  }, []);

  const dire = useCallback(async (id: string, son?: string, nombre?: number) => {
    derniere.current = { id, son, nombre };
    await jouer(id, { texte: consigne(id, son, nombre) });
  }, []);

  const redire = useCallback(async () => {
    const d = derniere.current;
    if (d) await jouer(d.id, { texte: consigne(d.id, d.son, d.nombre) });
  }, []);

  const noter = useCallback(
    (unite: string, item: string, reussi: boolean) => {
      bilan.current = { essais: bilan.current.essais + 1, reussites: bilan.current.reussites + (reussi ? 1 : 0) };
      modifier((p) => ({ ...p, items: { ...p.items, [item]: noterItem(p.items[item], reussi, unite, jour()) } }));
    },
    [modifier],
  );
  const debutSeance = useCallback(() => {
    bilan.current = { essais: 0, reussites: 0 };
  }, []);
  const bilanSeance = useCallback(() => bilan.current, []);

  const valeur = useMemo(
    () => ({ progression, modifier, dire, redire, noter, debutSeance, bilanSeance }),
    [progression, modifier, dire, redire, noter, debutSeance, bilanSeance],
  );
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useSyllakids(): Contexte {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSyllakids hors du fournisseur");
  return c;
}

/** Choisit la consigne selon le profil : version courte pour les 5 ans quand elle existe. */
export function consigneProfil(code: string, profil: "5ans" | "6ans"): string {
  return profil === "5ans" && consigne(`CON-${code}-COURT`) ? `CON-${code}-COURT` : `CON-${code}-STD`;
}
