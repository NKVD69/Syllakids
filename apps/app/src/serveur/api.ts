/** Fonctions du serveur, typées (voir supabase/migrations pour les règles d'accès). */
import type { Progression } from "../progression";
import type { PortProgression } from "../synchro";
import type { Profil } from "../types";
import type { Backend } from "./backend";

export type Role = "parent" | "enseignant";
export interface Compte { id: string; role: Role; nom: string }
export interface Classe { id: string; nom: string; annee: string; code: string; nb_eleves: number }

/** Les trois accords du formulaire de consentement parental (documents RGPD). */
export interface Accord { version: string; utilisation: boolean; voix_appareil: boolean; voix_partage: boolean; tests_classe: boolean }
export const VERSION_ACCORD = "2026-10";

export interface Eleve {
  id: string; prenom: string; avatar: string; profil: Profil; dys: boolean;
  code_famille: string | null; code_images: string | null;
  famille: boolean; voix_partage: boolean;
  donnees: unknown; version: number; maj_le: string | null;
}
export interface EnfantFamille {
  id: string; prenom: string; avatar: string; profil: Profil; dys: boolean;
  classe: string | null; consentement: (Accord & { le: string }) | null;
  donnees: unknown; version: number; maj_le: string | null;
}
export interface EntreeJournal { le: string; action: string; qui: string }

const liste = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : x == null ? [] : [x as T]);
const une = <T>(x: unknown): T | null => liste<T>(x)[0] ?? null;

export const api = {
  monCompte: async (b: Backend) => une<Compte>(await b.appeler("mon_compte")),
  creerCompte: async (b: Backend, role: Role, nom: string) => une<Compte>(await b.appeler("creer_compte", { p_role: role, p_nom: nom }))!,
  supprimerMonCompte: (b: Backend) => b.appeler("supprimer_mon_compte"),

  mesClasses: async (b: Backend) => liste<Classe>(await b.appeler("mes_classes")),
  creerClasse: async (b: Backend, nom: string, annee: string) => une<Classe>(await b.appeler("creer_classe", { p_nom: nom, p_annee: annee }))!,
  nouveauCodeClasse: async (b: Backend, classe: string) => String(await b.appeler("nouveau_code_classe", { p_classe: classe })),
  supprimerClasse: (b: Backend, classe: string) => b.appeler("supprimer_classe", { p_classe: classe }),
  creerEleve: async (b: Backend, classe: string, prenom: string, avatar: string, profil: Profil, id?: string) =>
    une<Eleve>(await b.appeler("creer_eleve", { p_classe: classe, p_prenom: prenom, p_avatar: avatar, p_profil: profil, p_id: id ?? null }))!,
  nouveauCodeFamille: async (b: Backend, enfant: string) => String(await b.appeler("nouveau_code_famille", { p_enfant: enfant })),
  retirerEleve: async (b: Backend, enfant: string) => String(await b.appeler("retirer_eleve", { p_enfant: enfant })) as "supprime" | "rendu",
  tableauClasse: async (b: Backend, classe: string) => liste<Eleve>(await b.appeler("tableau_classe", { p_classe: classe })),

  mesEnfants: async (b: Backend) => liste<EnfantFamille>(await b.appeler("mes_enfants")),
  creerEnfant: async (b: Backend, e: { id: string; prenom: string; avatar: string; profil: Profil; dys: boolean }, accord: Accord) =>
    une<{ id: string }>(await b.appeler("creer_enfant", { p_id: e.id, p_prenom: e.prenom, p_avatar: e.avatar, p_profil: e.profil, p_dys: e.dys, p_consentement: accord }))!,
  rattacherParCode: async (b: Backend, code: string, accord: Accord) =>
    une<{ id: string; prenom: string }>(await b.appeler("rattacher_par_code", { p_code: code, p_consentement: accord }))!,
  rejoindreClasse: async (b: Backend, enfant: string, code: string) => String(await b.appeler("rejoindre_classe", { p_enfant: enfant, p_code_classe: code })),
  donnerConsentement: async (b: Backend, enfant: string, accord: Accord) =>
    String(await b.appeler("donner_consentement", { p_enfant: enfant, p_consentement: accord })) as "enregistre" | "detache" | "supprime",
  modifierEnfant: (b: Backend, enfant: string, prenom: string, avatar: string, profil: Profil, dys: boolean) =>
    b.appeler("modifier_enfant", { p_enfant: enfant, p_prenom: prenom, p_avatar: avatar, p_profil: profil, p_dys: dys }),
  exporterEnfant: (b: Backend, enfant: string) => b.appeler("exporter_enfant", { p_enfant: enfant }),
  journalEnfant: async (b: Backend, enfant: string) => liste<EntreeJournal>(await b.appeler("journal_enfant", { p_enfant: enfant })),
};

/** La progression vue par le module de synchronisation. */
export function portProgression(b: Backend): PortProgression {
  return {
    async lire(enfant) {
      return une<{ donnees: unknown; version: number }>(await b.appeler("lire_progression", { p_enfant: enfant }));
    },
    async ecrire(enfant, donnees: Progression, version) {
      return une<{ ok: boolean; version: number; donnees: unknown }>(
        await b.appeler("ecrire_progression", { p_enfant: enfant, p_donnees: donnees, p_version: version }),
      )!;
    },
  };
}
