/** Compte de l'adulte connecté sur cet appareil (parent ou enseignant), s'il y en a un. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Compte } from "./serveur/api";
import { backend, type Backend, type Session } from "./serveur/backend";

interface ContexteCompte {
  /** null : application sans serveur (pas de comptes) ; undefined : en cours de chargement. */
  serveur: Backend | null | undefined;
  session: Session | null;
  /** null : compte à compléter (rôle, nom) ; undefined : pas encore connu. */
  compte: Compte | null | undefined;
  rafraichir: () => Promise<void>;
  deconnecter: () => Promise<void>;
}

const Ctx = createContext<ContexteCompte | null>(null);
const CLE = "syllakids:compte";

function compteEnCache(uid: string): Compte | undefined {
  try {
    const c = JSON.parse(localStorage.getItem(CLE) ?? "null") as Compte | null;
    return c && c.id === uid ? c : undefined;
  } catch {
    return undefined;
  }
}

export function FournisseurCompte({ children }: { children: ReactNode }) {
  const [serveur, setServeur] = useState<Backend | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [compte, setCompte] = useState<Compte | null | undefined>(undefined);

  useEffect(() => {
    let fini = false;
    let desabonner = () => {};
    void backend().then(async (b) => {
      if (fini) return;
      setServeur(b);
      if (!b) return;
      setSession(await b.session());
      desabonner = b.surSession(setSession);
    });
    return () => {
      fini = true;
      desabonner();
    };
  }, []);

  const rafraichir = useCallback(async () => {
    if (!serveur || !session) {
      setCompte(undefined);
      return;
    }
    try {
      const c = await api.monCompte(serveur);
      setCompte(c);
      try {
        if (c) localStorage.setItem(CLE, JSON.stringify(c));
      } catch {
        /* rien */
      }
    } catch {
      // hors ligne : on garde le compte connu sur l'appareil
      setCompte(compteEnCache(session.uid));
    }
  }, [serveur, session]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const deconnecter = useCallback(async () => {
    await serveur?.deconnecter();
    try {
      localStorage.removeItem(CLE);
    } catch {
      /* rien */
    }
    setSession(null);
    setCompte(undefined);
  }, [serveur]);

  const valeur = useMemo(() => ({ serveur, session, compte, rafraichir, deconnecter }), [serveur, session, compte, rafraichir, deconnecter]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useCompte(): ContexteCompte {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCompte hors du fournisseur");
  return c;
}
