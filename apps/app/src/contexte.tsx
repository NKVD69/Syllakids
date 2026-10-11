import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { jouer } from "./audio";
import { consigne } from "./contenu";
import { charger, enregistrer, type Progression } from "./progression";

interface Contexte {
  progression: Progression;
  modifier: (f: (p: Progression) => Progression) => void;
  /** Dit une consigne (et la mémorise pour le bouton « oreille »). */
  dire: (id: string, son?: string) => Promise<void>;
  /** Rejoue la dernière consigne. */
  redire: () => Promise<void>;
}

const Ctx = createContext<Contexte | null>(null);

export function FournisseurSyllakids({ children }: { children: ReactNode }) {
  const [progression, setProgression] = useState(charger);
  const derniere = useRef<{ id: string; son?: string } | null>(null);

  const modifier = useCallback((f: (p: Progression) => Progression) => {
    setProgression((p) => {
      const n = f(p);
      enregistrer(n);
      return n;
    });
  }, []);

  const dire = useCallback(async (id: string, son?: string) => {
    derniere.current = { id, son };
    await jouer(id, { texte: consigne(id, son) });
  }, []);

  const redire = useCallback(async () => {
    if (derniere.current) await jouer(derniere.current.id, { texte: consigne(derniere.current.id, derniere.current.son) });
  }, []);

  const valeur = useMemo(() => ({ progression, modifier, dire, redire }), [progression, modifier, dire, redire]);
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
