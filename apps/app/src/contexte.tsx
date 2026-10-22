import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  chargerAppareil, chargerProgression, enregistrerAppareil, enregistrerProgression, nouveauProfil, nouvelId, oublierProgression,
  type Appareil, type ProfilEnfant,
} from "./appareil";
import { jouer } from "./audio";
import { useCompte } from "./compte";
import { consigne } from "./contenu";
import { ajouterTemps, fusionner, normaliser, type Progression } from "./progression";
import { jour, noterItem, type BilanSeance } from "./revisions";
import { ajouterProduction, effacerProductions, marquerEnvoyee, productionsDe, purgerProductions, versBase64, type Production } from "./productions";
import { api, portProgression } from "./serveur/api";
import { synchroniser } from "./synchro";

export type EtatSynchro = "sans-compte" | "a-jour" | "en-cours" | "a-envoyer" | "hors-ligne";

/** Profil reçu du serveur, à installer sur l'appareil. */
export interface ProfilDistant {
  id: string;
  prenom: string;
  avatar: string;
  codeImages?: string | null;
  origine: "famille" | "classe";
  donnees: unknown;
  version: number;
  accords?: { voixAppareil: boolean; voixPartage: boolean };
}

/** Ce qu'une activité propose de garder : un enregistrement de voix ou un tracé. */
export type NouvelleProduction = Pick<Production, "type" | "item" | "mime" | "audio" | "traits">;

interface Contexte {
  appareil: Appareil;
  /** Profil de l'enfant qui utilise l'application (null : à choisir). */
  profil: ProfilEnfant | null;
  progression: Progression;
  modifier: (f: (p: Progression) => Progression) => void;
  choisirProfil: (id: string | null) => void;
  ajouterProfil: (p: Partial<ProfilEnfant>, progression?: Progression) => ProfilEnfant;
  modifierProfil: (id: string, changements: Partial<ProfilEnfant>) => void;
  /** Retire le profil de l'appareil (n'efface rien sur le serveur). */
  retirerProfil: (id: string) => void;
  installerProfils: (profils: ProfilDistant[]) => void;
  /** Lit ou modifie la progression d'un profil qui n'est pas forcément celui en cours. */
  progressionDe: (id: string) => Progression;
  modifierProgressionDe: (id: string, f: (p: Progression) => Progression) => void;
  changerMode: (mode: Appareil["mode"], classe?: Appareil["classe"]) => void;
  /** Réglages de l'appareil (réglure, voix). */
  changerOptions: (o: Partial<NonNullable<Appareil["options"]>>) => void;
  etatSynchro: EtatSynchro;
  synchroniserMaintenant: () => Promise<void>;
  /** Ajoute du temps de lecture au profil en cours. */
  compterTemps: (secondes: number) => void;
  /** Garde la voix ou un tracé de l'enfant en cours, seulement si l'accord le permet. */
  conserver: (p: NouvelleProduction) => void;
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

/** Délai avant l'envoi des changements (les séances écrivent souvent : on regroupe). */
const DELAI_SYNCHRO = 20_000;

export function FournisseurSyllakids({ children }: { children: ReactNode }) {
  const { serveur, session, compte } = useCompte();
  const [appareil, setAppareil] = useState<Appareil>(chargerAppareil);
  // un seul profil : il est choisi d'office ; plusieurs : l'enfant choisit à chaque ouverture
  const [actif, setActif] = useState<string | null>(() => {
    const a = chargerAppareil();
    return a.profils.length === 1 ? a.profils[0]!.id : null;
  });
  const [progression, setProgression] = useState<Progression>(() => (actif ? chargerProgression(actif) : normaliser({})));
  const [etatSynchro, setEtatSynchro] = useState<EtatSynchro>("sans-compte");
  const appareilRef = useRef(appareil);
  appareilRef.current = appareil;
  const actifRef = useRef(actif);
  actifRef.current = actif;
  const derniere = useRef<{ id: string; son?: string; nombre?: number } | null>(null);
  const bilan = useRef<BilanSeance>({ essais: 0, reussites: 0 });
  const minuterie = useRef<number | undefined>(undefined);

  const majAppareil = useCallback((f: (a: Appareil) => Appareil) => {
    const n = f(appareilRef.current);
    appareilRef.current = n;
    enregistrerAppareil(n);
    setAppareil(n);
  }, []);

  const marquerSale = useCallback(
    (id: string) => {
      const p = appareilRef.current.profils.find((x) => x.id === id);
      if (p && !p.sale) majAppareil((a) => ({ ...a, profils: a.profils.map((x) => (x.id === id ? { ...x, sale: true } : x)) }));
    },
    [majAppareil],
  );

  // ---- synchronisation -------------------------------------------------------------
  const enCours = useRef(false);
  const synchroniserMaintenant = useCallback(async () => {
    window.clearTimeout(minuterie.current);
    if (!serveur || !session || !compte) {
      setEtatSynchro("sans-compte");
      return;
    }
    if (enCours.current) return;
    enCours.current = true;
    setEtatSynchro("en-cours");
    const port = portProgression(serveur);
    let echec = false;
    for (const p of appareilRef.current.profils.filter((x) => x.origine !== "appareil")) {
      try {
        const avant = chargerProgression(p.id);
        const r = await synchroniser(port, p.id, avant, p.version, p.sale);
        // l'enfant a pu continuer pendant l'envoi : on refusionne avec ce qui est sur l'appareil maintenant
        const maintenant = chargerProgression(p.id);
        const changeEntreTemps = JSON.stringify(maintenant) !== JSON.stringify(avant);
        const resultat = changeEntreTemps ? fusionner(maintenant, r.progression) : r.progression;
        enregistrerProgression(p.id, resultat);
        if (actifRef.current === p.id) setProgression(resultat);
        majAppareil((a) => ({ ...a, profils: a.profils.map((x) => (x.id === p.id ? { ...x, version: r.version, sale: changeEntreTemps } : x)) }));
      } catch (e) {
        // profil supprimé côté serveur ou plus accessible : on le garde sur l'appareil, sans synchronisation
        if (/introuvable/i.test(e instanceof Error ? e.message : "")) {
          majAppareil((a) => ({ ...a, profils: a.profils.map((x) => (x.id === p.id ? { ...x, origine: "appareil", version: 0 } : x)) }));
        } else echec = true;
      }
    }
    try {
      await synchroniserVoix(serveur);
    } catch {
      echec = true;
    }
    enCours.current = false;
    const reste = appareilRef.current.profils.some((x) => x.origine !== "appareil" && x.sale);
    setEtatSynchro(echec ? "hors-ligne" : reste ? "a-envoyer" : "a-jour");
  }, [serveur, session, compte, majAppareil]);

  /** Accords à jour pour les profils du compte, puis envoi de la voix et des tracés si le partage est accepté. */
  async function synchroniserVoix(b: NonNullable<typeof serveur>) {
    const lies = appareilRef.current.profils.filter((x) => x.origine !== "appareil");
    if (!lies.length) return;
    const accords = await api.accordsAppareil(b, lies.map((x) => x.id));
    for (const p of lies) {
      const a = accords.find((x) => x.enfant === p.id);
      const nouveaux = { voixAppareil: !!a?.voix_appareil, voixPartage: !!a?.voix_partage };
      if (JSON.stringify(nouveaux) !== JSON.stringify(p.accords)) {
        majAppareil((ap) => ({ ...ap, profils: ap.profils.map((x) => (x.id === p.id ? { ...x, accords: nouveaux } : x)) }));
      }
      if (!nouveaux.voixAppareil) {
        await effacerProductions(p.id);
        continue;
      }
      if (!nouveaux.voixPartage) continue;
      for (const prod of (await productionsDe(p.id)).filter((x) => !x.envoye)) {
        await api.deposerProduction(b, {
          id: prod.id, enfant: p.id, type: prod.type, item: prod.item, le: prod.le, mime: prod.mime ?? null,
          audio: prod.audio ? await versBase64(prod.audio) : null, traits: prod.traits ?? null,
        });
        await marquerEnvoyee(prod.id);
      }
    }
  }

  const planifierSynchro = useCallback(() => {
    window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => void synchroniserMaintenant(), DELAI_SYNCHRO);
  }, [synchroniserMaintenant]);

  useEffect(() => {
    void purgerProductions();
  }, []);

  useEffect(() => {
    void synchroniserMaintenant();
    const enLigne = () => void synchroniserMaintenant();
    const visible = () => {
      if (document.visibilityState === "visible") void synchroniserMaintenant();
    };
    window.addEventListener("online", enLigne);
    document.addEventListener("visibilitychange", visible);
    const regulier = window.setInterval(() => {
      if (document.visibilityState === "visible") void synchroniserMaintenant();
    }, 120_000);
    return () => {
      window.removeEventListener("online", enLigne);
      document.removeEventListener("visibilitychange", visible);
      window.clearInterval(regulier);
    };
  }, [synchroniserMaintenant]);

  // ---- progression ----------------------------------------------------------------
  const modifierProgressionDe = useCallback(
    (id: string, f: (p: Progression) => Progression) => {
      if (id === actifRef.current) {
        setProgression((p) => {
          const n = f(p);
          enregistrerProgression(id, n);
          return n;
        });
      } else enregistrerProgression(id, f(chargerProgression(id)));
      marquerSale(id);
      planifierSynchro();
    },
    [marquerSale, planifierSynchro],
  );

  const modifier = useCallback(
    (f: (p: Progression) => Progression) => {
      if (actifRef.current) modifierProgressionDe(actifRef.current, f);
    },
    [modifierProgressionDe],
  );

  const progressionDe = useCallback((id: string) => (id === actifRef.current ? progression : chargerProgression(id)), [progression]);

  const conserver = useCallback((n: NouvelleProduction) => {
    const p = appareilRef.current.profils.find((x) => x.id === actifRef.current);
    if (!p?.accords?.voixAppareil) return;
    void ajouterProduction({ ...n, id: nouvelId(), enfant: p.id, le: new Date().toISOString(), envoye: false });
  }, []);

  const compterTemps = useCallback(
    (secondes: number) => modifier((p) => ajouterTemps(p, appareilRef.current.id, jour(), secondes)),
    [modifier],
  );

  // ---- profils ----------------------------------------------------------------------
  const choisirProfil = useCallback((id: string | null) => {
    setActif(id);
    actifRef.current = id;
    setProgression(id ? chargerProgression(id) : normaliser({}));
  }, []);

  const ajouterProfil = useCallback(
    (partiel: Partial<ProfilEnfant>, p?: Progression) => {
      const profil = nouveauProfil(partiel);
      if (p) enregistrerProgression(profil.id, p);
      majAppareil((a) => ({ ...a, profils: [...a.profils, profil] }));
      return profil;
    },
    [majAppareil],
  );

  const modifierProfil = useCallback(
    (id: string, changements: Partial<ProfilEnfant>) => {
      majAppareil((a) => ({ ...a, profils: a.profils.map((x) => (x.id === id ? { ...x, ...changements } : x)) }));
      if (changements.origine && changements.origine !== "appareil") planifierSynchro();
    },
    [majAppareil, planifierSynchro],
  );

  const retirerProfil = useCallback(
    (id: string) => {
      majAppareil((a) => ({ ...a, profils: a.profils.filter((x) => x.id !== id) }));
      oublierProgression(id);
      void effacerProductions(id);
      if (actifRef.current === id) choisirProfil(null);
    },
    [majAppareil, choisirProfil],
  );

  const installerProfils = useCallback(
    (distants: ProfilDistant[]) => {
      majAppareil((a) => {
        const profils = [...a.profils];
        for (const d of distants) {
          const serveur = normaliser(d.donnees ?? {});
          const i = profils.findIndex((x) => x.id === d.id);
          const local = i >= 0 ? chargerProgression(d.id) : null;
          const fusion = local ? fusionner(local, serveur) : serveur;
          enregistrerProgression(d.id, fusion);
          if (actifRef.current === d.id) setProgression(fusion);
          const profil: ProfilEnfant = {
            ...(i >= 0 ? profils[i]! : nouveauProfil()),
            id: d.id,
            prenom: d.prenom,
            avatar: d.avatar,
            ...(d.codeImages ? { codeImages: d.codeImages } : {}),
            origine: d.origine,
            version: d.version,
            ...(d.accords ? { accords: d.accords } : {}),
            sale: local ? JSON.stringify(fusion) !== JSON.stringify(serveur) : false,
          };
          if (i >= 0) profils[i] = profil;
          else profils.push(profil);
        }
        return { ...a, profils };
      });
      planifierSynchro();
    },
    [majAppareil, planifierSynchro],
  );

  const changerMode = useCallback(
    (mode: Appareil["mode"], classe?: Appareil["classe"]) => majAppareil((a) => ({ ...a, mode, ...(classe ? { classe } : { classe: undefined }) })),
    [majAppareil],
  );

  const changerOptions = useCallback(
    (o: Partial<NonNullable<Appareil["options"]>>) => majAppareil((a) => ({ ...a, options: { ...a.options, ...o } })),
    [majAppareil],
  );

  // ---- consignes et séance -------------------------------------------------------------
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

  const profil = appareil.profils.find((p) => p.id === actif) ?? null;

  const valeur = useMemo(
    () => ({
      appareil, profil, progression, modifier, choisirProfil, ajouterProfil, modifierProfil, retirerProfil, installerProfils,
      progressionDe, modifierProgressionDe, changerMode, changerOptions, etatSynchro, synchroniserMaintenant, compterTemps, conserver,
      dire, redire, noter, debutSeance, bilanSeance,
    }),
    [appareil, profil, progression, modifier, choisirProfil, ajouterProfil, modifierProfil, retirerProfil, installerProfils,
      progressionDe, modifierProgressionDe, changerMode, changerOptions, etatSynchro, synchroniserMaintenant, compterTemps, conserver,
      dire, redire, noter, debutSeance, bilanSeance],
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
