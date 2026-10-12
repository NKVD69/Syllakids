/** Connexion, création de compte et compte à compléter (rôle, nom). */
import { useState } from "react";
import { useCompte } from "../../compte";
import { api, type Role } from "../../serveur/api";
import { MOT_DE_PASSE_MIN, Message, Section, useAction } from "./outils";

export function Connexion() {
  const { serveur, rafraichir } = useCompte();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [role, setRole] = useState<Role>("parent");
  const [nom, setNom] = useState("");
  const action = useAction();
  if (!serveur) return null;

  const valider = () =>
    action.lancer(async () => {
      if (mode === "connexion") {
        await serveur.connecter(email.trim(), mdp);
        await rafraichir();
        return;
      }
      if (mdp.length < MOT_DE_PASSE_MIN) throw new Error(`Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`);
      const r = await serveur.inscrire(email.trim(), mdp);
      if (r.confirmation) return "Un e-mail de confirmation vous a été envoyé. Ouvrez le lien qu'il contient, puis connectez-vous ici.";
      await api.creerCompte(serveur, role, nom.trim());
      await rafraichir();
    });

  return (
    <Section titre={mode === "connexion" ? "Se connecter" : "Créer un compte adulte"}>
      <p>
        Un compte permet de retrouver la progression de l'enfant sur plusieurs appareils (en classe et à la maison) et de suivre ses progrès.
        Il n'est pas nécessaire pour utiliser Syllakids sur un seul appareil.
      </p>
      <form
        className="formulaire"
        onSubmit={(e) => {
          e.preventDefault();
          void valider();
        }}
      >
        {mode === "inscription" && (
          <>
            <fieldset>
              <legend>Vous êtes</legend>
              <label><input type="radio" name="role" checked={role === "parent"} onChange={() => setRole("parent")} /> Parent ou responsable légal</label>
              <label><input type="radio" name="role" checked={role === "enseignant"} onChange={() => setRole("enseignant")} /> Enseignant ou enseignante</label>
            </fieldset>
            <label className="champ">
              {role === "enseignant" ? "Nom affiché aux familles (par exemple « Mme Durand »)" : "Votre prénom (facultatif)"}
              <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} autoComplete="name" required={role === "enseignant"} />
            </label>
          </>
        )}
        <label className="champ">
          Adresse e-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="champ">
          Mot de passe{mode === "inscription" ? ` (${MOT_DE_PASSE_MIN} caractères au moins)` : ""}
          <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete={mode === "connexion" ? "current-password" : "new-password"} minLength={mode === "inscription" ? MOT_DE_PASSE_MIN : undefined} required />
        </label>
        <Message message={action.message} />
        <p className="actions-adulte">
          <button className="bouton-texte principal" type="submit" disabled={action.occupe}>{mode === "connexion" ? "Se connecter" : "Créer le compte"}</button>
          <button className="bouton-texte" type="button" onClick={() => { action.effacer(); setMode(mode === "connexion" ? "inscription" : "connexion"); }}>
            {mode === "connexion" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
          {mode === "connexion" && serveur.type === "supabase" && (
            <button className="bouton-lien" type="button" onClick={() => void action.lancer(async () => { await serveur.oubli(email.trim()); return "Si un compte existe pour cette adresse, un e-mail vient d'être envoyé."; })}>
              Mot de passe oublié
            </button>
          )}
        </p>
      </form>
    </Section>
  );
}

/** Après la confirmation de l'e-mail : choisir son rôle pour terminer la création du compte. */
export function CompteACompleter() {
  const { serveur, rafraichir, deconnecter, session } = useCompte();
  const [role, setRole] = useState<Role>("parent");
  const [nom, setNom] = useState("");
  const action = useAction();
  if (!serveur) return null;
  return (
    <Section titre="Terminer la création du compte">
      <p>Connecté avec {session?.email}.</p>
      <form className="formulaire" onSubmit={(e) => { e.preventDefault(); void action.lancer(async () => { await api.creerCompte(serveur, role, nom.trim()); await rafraichir(); }); }}>
        <fieldset>
          <legend>Vous êtes</legend>
          <label><input type="radio" name="role2" checked={role === "parent"} onChange={() => setRole("parent")} /> Parent ou responsable légal</label>
          <label><input type="radio" name="role2" checked={role === "enseignant"} onChange={() => setRole("enseignant")} /> Enseignant ou enseignante</label>
        </fieldset>
        <label className="champ">
          {role === "enseignant" ? "Nom affiché aux familles" : "Votre prénom (facultatif)"}
          <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} required={role === "enseignant"} />
        </label>
        <Message message={action.message} />
        <p className="actions-adulte">
          <button className="bouton-texte principal" type="submit" disabled={action.occupe}>Continuer</button>
          <button className="bouton-texte" type="button" onClick={() => void deconnecter()}>Se déconnecter</button>
        </p>
      </form>
    </Section>
  );
}
