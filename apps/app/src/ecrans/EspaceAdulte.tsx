/**
 * Espace adulte : verrou, profils de l'appareil, compte, suivi des enfants (parent) ou des classes (enseignant).
 * Routes : #/adulte, #/adulte/enfant/<id>[/<classe>], #/adulte/nouvel-enfant, #/adulte/rattacher,
 * #/adulte/classe/<id>, #/adulte/classe/<id>/codes.
 */
import { useEffect, useMemo, useState } from "react";
import consignes from "@contenu/consignes.json";
import { naviguer } from "../App";
import { Avatar } from "../composants/Avatars";
import { useCompte } from "../compte";
import { useSyllakids, type EtatSynchro } from "../contexte";
import { suivre } from "../suivi";
import { CodesFamilles, MesClasses, TableauClasse } from "./adulte/Classes";
import { CompteACompleter, Connexion } from "./adulte/Connexion";
import { FicheEnfant } from "./adulte/FicheEnfant";
import { MesEnfants, NouvelEnfant, Rattacher } from "./adulte/Famille";
import { Message, nomUnite, Section, UNITES_RESUMEES, useAction } from "./adulte/outils";

/** L'espace reste ouvert 10 minutes après le dernier passage, puis se reverrouille. */
const DUREE_OUVERTURE = 10 * 60 * 1000;
let ouvertJusqua = 0;

/** Verrou parental : une petite addition que l'enfant de 5-6 ans ne sait pas encore lire. */
function VerrouAddition({ onOuvert }: { onOuvert: () => void }) {
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 4), 7 + Math.floor(Math.random() * 3)], []);
  const [reponse, setReponse] = useState("");
  return (
    <form
      className="verrou"
      onSubmit={(e) => {
        e.preventDefault();
        if (Number(reponse) === a + b) onOuvert();
        else setReponse("");
      }}
    >
      <p>Espace réservé aux adultes. Combien font {a} + {b} ?</p>
      <p>
        <input inputMode="numeric" value={reponse} onChange={(e) => setReponse(e.target.value)} aria-label="Réponse" autoFocus />{" "}
        <button className="bouton-texte" type="submit">Ouvrir</button>
      </p>
    </form>
  );
}

/** Sur la tablette de la classe, où un compte enseignant est ouvert : le mot de passe de ce compte. */
function VerrouMotDePasse({ onOuvert }: { onOuvert: () => void }) {
  const { serveur, session } = useCompte();
  const [mdp, setMdp] = useState("");
  const action = useAction();
  return (
    <form
      className="verrou formulaire"
      onSubmit={(e) => {
        e.preventDefault();
        void action.lancer(async () => {
          await serveur!.connecter(session!.email, mdp);
          onOuvert();
        });
      }}
    >
      <p>Tablette de la classe : saisissez le mot de passe du compte {session?.email}.</p>
      <label className="champ">
        Mot de passe
        <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" autoFocus required />
      </label>
      <Message message={action.message} />
      <button className="bouton-texte principal" type="submit" disabled={action.occupe}>Ouvrir</button>
    </form>
  );
}

const ETATS: Record<EtatSynchro, string> = {
  "sans-compte": "",
  "a-jour": "Progrès enregistrés sur le compte.",
  "en-cours": "Envoi des progrès…",
  "a-envoyer": "Des progrès attendent d'être envoyés.",
  "hors-ligne": "Pas de connexion : les progrès seront envoyés plus tard.",
};

const ORIGINES = { appareil: "sur cet appareil seulement", famille: "compte famille", classe: "classe" } as const;

function ProfilsAppareil() {
  const { appareil, progressionDe, ajouterProfil } = useSyllakids();
  return (
    <Section titre="Enfants sur cet appareil">
      <ul className="liste-enfants">
        {appareil.profils.map((p) => {
          const s = suivre(progressionDe(p.id), UNITES_RESUMEES);
          return (
            <li key={p.id}>
              <a href={`#/adulte/enfant/${p.id}`} className="ligne-enfant">
                <Avatar id={p.avatar} taille={48} />
                <span>
                  <strong>{p.prenom || "Enfant sans prénom"}</strong>
                  <span className="petit"> · {nomUnite(s.courante)} · {ORIGINES[p.origine]}{p.sale && p.origine !== "appareil" ? " · à envoyer" : ""}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      {appareil.mode === "maison" && (
        <button className="bouton-texte" type="button" onClick={() => naviguer(`#/adulte/enfant/${ajouterProfil({ avatar: "lune" }).id}`)}>
          Ajouter un enfant sur cet appareil
        </button>
      )}
    </Section>
  );
}

function BlocCompte() {
  const { serveur, session, compte, deconnecter } = useCompte();
  const { etatSynchro, synchroniserMaintenant, appareil, changerMode } = useSyllakids();
  const action = useAction();
  if (serveur === undefined) return null;
  if (serveur === null) {
    return (
      <Section titre="Compte">
        <p>Cette version de Syllakids fonctionne sur cet appareil seulement : les comptes et la synchronisation ne sont pas encore configurés.</p>
      </Section>
    );
  }
  if (!session) return <Connexion />;
  if (compte === null) return <CompteACompleter />;
  return (
    <Section titre="Compte">
      <p>
        {compte?.role === "enseignant" ? "Compte enseignant" : "Compte parent"} : {session.email}
        {compte?.nom ? ` (${compte.nom})` : ""}
      </p>
      {etatSynchro !== "sans-compte" && <p className="petit" role="status">{ETATS[etatSynchro]}</p>}
      {appareil.mode === "classe" && (
        <p>
          Cette tablette sert à la classe {appareil.classe?.nom}.{" "}
          <button className="bouton-lien" type="button" onClick={() => changerMode("maison")}>Revenir à un usage à la maison</button>
        </p>
      )}
      <Message message={action.message} />
      <p className="actions-adulte">
        <button className="bouton-texte" type="button" onClick={() => void synchroniserMaintenant()}>Synchroniser maintenant</button>
        <button className="bouton-texte" type="button" onClick={() => void deconnecter()}>Se déconnecter</button>
      </p>
      <details>
        <summary>Supprimer mon compte</summary>
        <p>
          Votre compte est supprimé, ainsi que les profils d'enfants qui ne sont rattachés à personne d'autre
          {compte?.role === "enseignant" ? " (les élèves dont la famille a un compte restent à la famille)" : " (un profil de classe reste à l'école)"}.
          Les profils restent utilisables sur cet appareil.
        </p>
        <button
          className="bouton-texte danger"
          type="button"
          onClick={() => {
            if (!window.confirm("Supprimer définitivement votre compte ?")) return;
            void action.lancer(async () => {
              const { api } = await import("../serveur/api");
              await api.supprimerMonCompte(serveur);
              await deconnecter();
              return "Le compte a été supprimé.";
            });
          }}
        >
          Supprimer définitivement mon compte
        </button>
      </details>
    </Section>
  );
}

function Accueil() {
  const { compte, session } = useCompte();
  const parent = !!session && compte?.role === "parent";
  const enseignant = !!session && compte?.role === "enseignant";
  return (
    <>
      <ProfilsAppareil />
      <BlocCompte />
      {parent && <MesEnfants />}
      {enseignant && <MesClasses />}
      <Section titre="Conseils pour accompagner l'enfant">
        <ul>{consignes.parents.map((c) => <li key={c.id}>{c.texte}</li>)}</ul>
      </Section>
    </>
  );
}

export function EspaceAdulte({ route }: { route: string }) {
  const { session, compte } = useCompte();
  const { appareil } = useSyllakids();
  const [ouvert, setOuvert] = useState(() => Date.now() < ouvertJusqua);
  const ouvrir = () => {
    ouvertJusqua = Date.now() + DUREE_OUVERTURE;
    setOuvert(true);
  };
  useEffect(() => {
    if (ouvert) ouvertJusqua = Date.now() + DUREE_OUVERTURE;
  }, [ouvert, route]);

  const parties = route.replace(/^#\/adulte\/?/, "").split("/").filter(Boolean);
  const classeAvecMotDePasse = appareil.mode === "classe" && !!session && compte?.role === "enseignant";
  const imprimable = parties[0] === "classe" && parties[2] === "codes";

  let contenu = <Accueil />;
  if (parties[0] === "enfant" && parties[1]) contenu = <FicheEnfant key={parties[1]} id={parties[1]} classe={parties[2]} />;
  else if (parties[0] === "nouvel-enfant") contenu = <NouvelEnfant />;
  else if (parties[0] === "rattacher") contenu = <Rattacher />;
  else if (parties[0] === "classe" && parties[1] && parties[2] === "codes") contenu = <CodesFamilles classe={parties[1]} />;
  else if (parties[0] === "classe" && parties[1]) contenu = <TableauClasse key={parties[1]} classe={parties[1]} />;

  return (
    <main className={`adulte${imprimable ? " imprimable" : ""}`}>
      <header className="entete-adulte">
        <h1>{parties.length ? <a href="#/adulte">Espace adulte</a> : "Espace adulte"}</h1>
        <button className="bouton-texte" type="button" onClick={() => { ouvertJusqua = 0; naviguer("#/"); }}>Revenir à l'enfant</button>
      </header>
      {!ouvert ? classeAvecMotDePasse ? <VerrouMotDePasse onOuvert={ouvrir} /> : <VerrouAddition onOuvert={ouvrir} /> : contenu}
    </main>
  );
}
