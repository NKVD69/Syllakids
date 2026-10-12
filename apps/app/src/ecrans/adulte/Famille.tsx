/** Côté parent : enfants du compte, ajout d'un enfant, rattachement au profil de classe par code. */
import { useState } from "react";
import { naviguer } from "../../App";
import { nouvelId } from "../../appareil";
import { Avatar, TOUS_AVATARS, dessin } from "../../composants/Avatars";
import { useCompte } from "../../compte";
import { useSyllakids } from "../../contexte";
import { api, type EnfantFamille } from "../../serveur/api";
import type { Profil } from "../../types";
import { suivre } from "../../suivi";
import { FormulaireAccord } from "./Accord";
import { Erreur, Message, nomUnite, Section, UNITES_RESUMEES, useAction, useDonnees } from "./outils";

export function ChoixAvatar({ valeur, onChange, pris = [] }: { valeur: string; onChange: (a: string) => void; pris?: string[] }) {
  return (
    <fieldset className="choix-avatar">
      <legend>Image de l'enfant (il la reconnaîtra pour se retrouver)</legend>
      {TOUS_AVATARS.map((a) => (
        <label key={a} className={a === valeur ? "choisi" : pris.includes(a) ? "pris" : ""} title={dessin(a).nom}>
          <input type="radio" name="avatar" value={a} checked={a === valeur} onChange={() => onChange(a)} aria-label={`${dessin(a).nom}${a.includes("-") ? `, variante ${a.split("-")[1]}` : ""}${pris.includes(a) ? ", déjà prise" : ""}`} />
          <Avatar id={a} taille={44} />
        </label>
      ))}
    </fieldset>
  );
}

export function ChoixAge({ valeur, onChange }: { valeur: Profil; onChange: (p: Profil) => void }) {
  return (
    <fieldset>
      <legend>Niveau</legend>
      <label><input type="radio" name="age" checked={valeur === "5ans"} onChange={() => onChange("5ans")} /> 5 ans (grande section) : séances de 10 minutes, consignes courtes, écriture guidée</label>
      <label><input type="radio" name="age" checked={valeur === "6ans"} onChange={() => onChange("6ans")} /> 6 ans (CP) : parcours complet, séances de 15 minutes</label>
    </fieldset>
  );
}

/** Profils du compte à installer sur l'appareil. */
export function versProfilsDistants(enfants: EnfantFamille[]) {
  return enfants.map((e) => ({ id: e.id, prenom: e.prenom, avatar: e.avatar, origine: "famille" as const, donnees: e.donnees ?? { reglages: { profil: e.profil, dys: e.dys } }, version: e.version }));
}

export function MesEnfants() {
  const { serveur } = useCompte();
  const { appareil, installerProfils } = useSyllakids();
  const { donnees: enfants, erreur } = useDonnees(serveur ? () => api.mesEnfants(serveur) : null, [serveur, appareil.profils.length]);
  return (
    <Section titre="Vos enfants">
      <Erreur texte={erreur} />
      {enfants && enfants.length === 0 && <p>Aucun enfant n'est encore rattaché à votre compte.</p>}
      <ul className="liste-enfants">
        {enfants?.map((e) => {
          const ici = appareil.profils.some((p) => p.id === e.id);
          const s = suivre(e.donnees, UNITES_RESUMEES);
          return (
            <li key={e.id}>
              <a href={`#/adulte/enfant/${e.id}`} className="ligne-enfant">
                <Avatar id={e.avatar} taille={48} />
                <span>
                  <strong>{e.prenom}</strong>
                  <span className="petit"> · {nomUnite(s.courante)}{e.classe ? ` · classe ${e.classe}` : ""}{ici ? " · sur cet appareil" : ""}</span>
                </span>
              </a>
              {!ici && (
                <button className="bouton-texte" type="button" onClick={() => installerProfils(versProfilsDistants([e]))}>Mettre sur cet appareil</button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="actions-adulte">
        <button className="bouton-texte" type="button" onClick={() => naviguer("#/adulte/nouvel-enfant")}>Ajouter un enfant</button>
        <button className="bouton-texte" type="button" onClick={() => naviguer("#/adulte/rattacher")}>J'ai un code donné par l'enseignant</button>
      </p>
    </Section>
  );
}

export function NouvelEnfant() {
  const { serveur } = useCompte();
  const { installerProfils } = useSyllakids();
  const [prenom, setPrenom] = useState("");
  const [avatar, setAvatar] = useState("soleil");
  const [profil, setProfil] = useState<Profil>("6ans");
  const [etape, setEtape] = useState<"profil" | "accord">("profil");
  const action = useAction();
  if (!serveur) return null;
  return (
    <Section titre="Ajouter un enfant à votre compte">
      {etape === "profil" ? (
        <form className="formulaire" onSubmit={(e) => { e.preventDefault(); setEtape("accord"); }}>
          <label className="champ">
            Prénom ou surnom (pas de nom de famille)
            <input value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={30} required />
          </label>
          <ChoixAvatar valeur={avatar} onChange={setAvatar} />
          <ChoixAge valeur={profil} onChange={setProfil} />
          <button className="bouton-texte principal" type="submit">Continuer</button>
        </form>
      ) : (
        <>
          <FormulaireAccord
            prenom={prenom}
            enClasse={false}
            bouton="Créer le profil"
            occupe={action.occupe}
            onValider={(accord) =>
              void action.lancer(async () => {
                const id = nouvelId();
                const donnees = { reglages: { profil, dys: false } };
                await api.creerEnfant(serveur, { id, prenom, avatar, profil, dys: false }, accord);
                installerProfils([{ id, prenom: prenom.trim(), avatar, origine: "famille", donnees, version: 0 }]);
                naviguer(`#/adulte/enfant/${id}`);
              })
            }
          />
          <Message message={action.message} />
        </>
      )}
    </Section>
  );
}

export function Rattacher() {
  const { serveur } = useCompte();
  const { installerProfils } = useSyllakids();
  const [code, setCode] = useState("");
  const [etape, setEtape] = useState<"code" | "accord">("code");
  const action = useAction();
  if (!serveur) return null;
  return (
    <Section titre="Retrouver le profil de classe de votre enfant">
      <p>
        L'enseignant de votre enfant vous a remis un code de 8 caractères. Il permet de continuer à la maison le même parcours qu'en classe :
        les progrès faits ici et en classe se retrouvent des deux côtés.
      </p>
      {etape === "code" ? (
        <form className="formulaire" onSubmit={(e) => { e.preventDefault(); setEtape("accord"); }}>
          <label className="champ">
            Code famille
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" spellCheck={false} minLength={8} maxLength={12} required />
          </label>
          <button className="bouton-texte principal" type="submit">Continuer</button>
        </form>
      ) : (
        <>
          <FormulaireAccord
            prenom=""
            enClasse
            bouton="Rattacher le profil"
            occupe={action.occupe}
            onValider={(accord) =>
              void action.lancer(async () => {
                const e = await api.rattacherParCode(serveur, code, accord);
                const tous = await api.mesEnfants(serveur);
                installerProfils(versProfilsDistants(tous.filter((x) => x.id === e.id)));
                naviguer(`#/adulte/enfant/${e.id}`);
              })
            }
          />
          <Message message={action.message} />
          <button className="bouton-lien" type="button" onClick={() => { action.effacer(); setEtape("code"); }}>Corriger le code</button>
        </>
      )}
    </Section>
  );
}
