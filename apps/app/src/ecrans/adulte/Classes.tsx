/** Côté enseignant : classes, tableau de bord de la classe, codes pour les familles. */
import { useMemo, useState } from "react";
import { naviguer } from "../../App";
import { chargerProgression } from "../../appareil";
import { Avatar, IMAGES_SECRETES, TOUS_AVATARS } from "../../composants/Avatars";
import { useCompte } from "../../compte";
import { useSyllakids } from "../../contexte";
import { normaliser } from "../../progression";
import { api, type Eleve } from "../../serveur/api";
import type { Backend } from "../../serveur/backend";
import { csv, suivre } from "../../suivi";
import type { Profil } from "../../types";
import { ChoixAge, ChoixAvatar } from "./Famille";
import { anneeScolaire, dateFr, Erreur, Message, nomUnite, Section, telecharger, UNITES_RESUMEES, useAction, useDonnees } from "./outils";

// Le tableau de classe est journalisé à chaque lecture : on garde la dernière lecture 2 minutes
// pour que l'ouverture d'une fiche élève ne crée pas une nouvelle consultation de toute la classe.
const cache = new Map<string, { quand: number; eleves: Eleve[] }>();

export async function elevesDe(b: Backend, classe: string, forcer = false): Promise<Eleve[]> {
  const c = cache.get(classe);
  if (!forcer && c && Date.now() - c.quand < 120_000) return c.eleves;
  const eleves = await api.tableauClasse(b, classe);
  cache.set(classe, { quand: Date.now(), eleves });
  return eleves;
}

export function oublierCache(classe: string) {
  cache.delete(classe);
}

export function MesClasses() {
  const { serveur } = useCompte();
  const { donnees: classes, erreur, recharger } = useDonnees(serveur ? () => api.mesClasses(serveur) : null, [serveur]);
  const [nom, setNom] = useState("");
  const [annee, setAnnee] = useState(anneeScolaire());
  const action = useAction();
  if (!serveur) return null;
  return (
    <Section titre="Vos classes">
      <Erreur texte={erreur} />
      {classes && classes.length === 0 && <p>Créez votre classe, puis ajoutez vos élèves.</p>}
      <ul className="liste-enfants">
        {classes?.map((c) => (
          <li key={c.id}>
            <a className="ligne-enfant" href={`#/adulte/classe/${c.id}`}>
              <span><strong>{c.nom}</strong> <span className="petit">· {c.annee} · {c.nb_eleves} élève{c.nb_eleves > 1 ? "s" : ""}</span></span>
            </a>
          </li>
        ))}
      </ul>
      <form
        className="formulaire en-ligne"
        onSubmit={(e) => {
          e.preventDefault();
          void action.lancer(async () => {
            const c = await api.creerClasse(serveur, nom, annee);
            setNom("");
            recharger();
            naviguer(`#/adulte/classe/${c.id}`);
          });
        }}
      >
        <label className="champ">Nom de la classe <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} placeholder="GS Les Lilas" required /></label>
        <label className="champ">Année scolaire <input value={annee} onChange={(e) => setAnnee(e.target.value)} pattern="\d{4}-\d{4}" required /></label>
        <button className="bouton-texte principal" type="submit" disabled={action.occupe}>Créer la classe</button>
      </form>
      <Message message={action.message} />
    </Section>
  );
}

function pourcent(x: number | null): string {
  return x == null ? "—" : `${Math.round(x * 100)} %`;
}

export function TableauClasse({ classe }: { classe: string }) {
  const { serveur } = useCompte();
  const { appareil, installerProfils, changerMode, retirerProfil } = useSyllakids();
  const [tour, setTour] = useState(0);
  const { donnees, erreur } = useDonnees(
    serveur ? async () => ({ classes: await api.mesClasses(serveur), eleves: await elevesDe(serveur, classe, tour > 0) }) : null,
    [serveur, classe, tour],
  );
  const recharger = () => {
    oublierCache(classe);
    setTour((t) => t + 1);
  };
  const infos = donnees?.classes.find((c) => c.id === classe);
  const eleves = useMemo(() => donnees?.eleves ?? [], [donnees]);
  const lignes = useMemo(() => eleves.map((e) => ({ e, s: suivre(e.donnees, UNITES_RESUMEES), profil: normaliser(e.donnees ?? { reglages: { profil: e.profil } }).reglages.profil })), [eleves]);
  const pris = eleves.map((e) => e.avatar);
  const [prenom, setPrenom] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [age, setAge] = useState<Profil>("5ans");
  const action = useAction();
  if (!serveur) return null;
  const avatarPropose = avatar ?? TOUS_AVATARS.find((a) => !pris.includes(a)) ?? "soleil";
  const tabletteDeCetteClasse = appareil.mode === "classe" && appareil.classe?.id === classe;

  const installer = () => {
    installerProfils(eleves.map((e) => ({ id: e.id, prenom: e.prenom, avatar: e.avatar, codeImages: e.code_images, origine: "classe" as const, donnees: e.donnees ?? { reglages: { profil: e.profil, dys: e.dys } }, version: e.version })));
    // les profils vides créés au premier lancement ne servent pas sur la tablette de la classe
    for (const p of appareil.profils) {
      const pr = chargerProgression(p.id);
      if (p.origine === "appareil" && !p.prenom && pr.terminees.length === 0 && Object.keys(pr.items).length === 0) retirerProfil(p.id);
    }
    changerMode("classe", { id: classe, nom: infos?.nom ?? "" });
  };

  const exporter = () =>
    telecharger(
      `syllakids-${(infos?.nom ?? "classe").replace(/[^\p{L}\d]+/gu, "-")}.csv`,
      csv([
        ["Élève", "Niveau", "Son en cours", "Séances du son en cours", "Sons validés", "Réussite 14 jours", "À retravailler", "Minutes 7 jours", "Record mots/minute", "Dernière activité", "Famille rattachée"],
        ...lignes.map(({ e, s, profil }) => [
          e.prenom, profil === "5ans" ? "GS" : "CP", nomUnite(s.courante), s.seancesCourante, `${s.terminees}/${s.total}`,
          s.reussiteRecente == null ? "" : Math.round(s.reussiteRecente * 100), s.difficultes.length, s.minutesSemaine, s.fluence ?? "",
          s.derniereActivite ?? "", e.famille ? "oui" : "non",
        ]),
      ]),
      "text/csv;charset=utf-8",
    );

  return (
    <>
      <Section titre={infos ? `${infos.nom} (${infos.annee})` : "Classe"}>
        <Erreur texte={erreur} />
        {infos && (
          <p>
            Code de la classe : <strong className="code">{infos.code}</strong>{" "}
            <span className="petit">(pour une famille qui a déjà créé le profil de son enfant à la maison)</span>
          </p>
        )}
        {lignes.length > 0 && (
          <div className="tableau-defilant">
            <table className="tableau-classe">
              <caption className="petit">Aucun classement : chaque ligne se lit pour elle-même. Cliquez sur un prénom pour la fiche de l'élève.</caption>
              <thead>
                <tr>
                  <th scope="col">Élève</th><th scope="col">Son en cours</th><th scope="col">Sons validés</th><th scope="col">Réussite 14 j</th>
                  <th scope="col">À retravailler</th><th scope="col">Temps 7 j</th><th scope="col">Record</th><th scope="col">Dernière activité</th><th scope="col">Famille</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(({ e, s, profil }) => (
                  <tr key={e.id}>
                    <th scope="row">
                      <a href={`#/adulte/enfant/${e.id}/${classe}`} className="ligne-enfant"><Avatar id={e.avatar} taille={32} /> {e.prenom}</a>
                      <span className="petit"> {profil === "5ans" ? "GS" : "CP"}</span>
                    </th>
                    <td>{nomUnite(s.courante)}{s.courante ? ` (${s.seancesCourante}/2)` : ""}</td>
                    <td>{s.terminees}/{s.total}</td>
                    <td>{pourcent(s.reussiteRecente)}</td>
                    <td>{s.difficultes.length || "—"}</td>
                    <td>{s.minutesSemaine} min</td>
                    <td>{s.fluence ?? "—"}</td>
                    <td>{dateFr(s.derniereActivite)}</td>
                    <td>{e.famille ? "rattachée" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="actions-adulte">
          <button className="bouton-texte" type="button" onClick={recharger}>Actualiser</button>
          {lignes.length > 0 && <button className="bouton-texte" type="button" onClick={exporter}>Exporter (CSV)</button>}
          {lignes.length > 0 && <button className="bouton-texte" type="button" onClick={() => naviguer(`#/adulte/classe/${classe}/codes`)}>Codes pour les familles</button>}
          {lignes.length > 0 && (
            <button className="bouton-texte principal" type="button" onClick={installer}>
              {tabletteDeCetteClasse ? "Mettre à jour les élèves de cette tablette" : "Utiliser cette tablette pour la classe"}
            </button>
          )}
        </p>
        {tabletteDeCetteClasse && <p className="petit" role="status">Cette tablette sert à cette classe : chaque enfant choisit son image puis touche ses 3 images secrètes.</p>}
      </Section>

      <Section titre="Ajouter un élève">
        <form
          className="formulaire"
          onSubmit={(ev) => {
            ev.preventDefault();
            void action.lancer(async () => {
              await api.creerEleve(serveur, classe, prenom, avatarPropose, age);
              setPrenom("");
              setAvatar(null);
              recharger();
              return `${prenom.trim()} a été ajouté(e) à la classe.`;
            });
          }}
        >
          <label className="champ">Prénom (ou prénom et initiale) <input value={prenom} onChange={(ev) => setPrenom(ev.target.value)} maxLength={30} required /></label>
          <ChoixAvatar valeur={avatarPropose} onChange={setAvatar} pris={pris} />
          <ChoixAge valeur={age} onChange={setAge} />
          <button className="bouton-texte principal" type="submit" disabled={action.occupe}>Ajouter</button>
        </form>
        <Message message={action.message} />
      </Section>

      <Section titre="Gérer la classe">
        <ActionsClasse classe={classe} onFait={recharger} />
      </Section>
    </>
  );
}

function ActionsClasse({ classe, onFait }: { classe: string; onFait: () => void }) {
  const { serveur } = useCompte();
  const { appareil, changerMode } = useSyllakids();
  const action = useAction();
  if (!serveur) return null;
  return (
    <>
      <p className="actions-adulte">
        <button className="bouton-texte" type="button" onClick={() => void action.lancer(async () => { await api.nouveauCodeClasse(serveur, classe); onFait(); return "Nouveau code de classe créé ; l'ancien ne fonctionne plus."; })}>
          Changer le code de la classe
        </button>
        <button
          className="bouton-texte danger"
          type="button"
          onClick={() => {
            if (!window.confirm("Supprimer la classe ? Les élèves sans famille rattachée seront supprimés avec leur progression.")) return;
            void action.lancer(async () => {
              await api.supprimerClasse(serveur, classe);
              oublierCache(classe);
              if (appareil.classe?.id === classe) changerMode("maison");
              naviguer("#/adulte");
            });
          }}
        >
          Supprimer la classe
        </button>
      </p>
      <Message message={action.message} />
    </>
  );
}

/** Page imprimable : un coupon par élève avec son code famille et ses images secrètes. */
export function CodesFamilles({ classe }: { classe: string }) {
  const { serveur } = useCompte();
  const { donnees, erreur } = useDonnees(serveur ? () => elevesDe(serveur, classe) : null, [serveur, classe]);
  const adresse = window.location.origin + window.location.pathname;
  return (
    <>
      <p className="actions-adulte pas-imprime">
        <button className="bouton-texte principal" type="button" onClick={() => window.print()}>Imprimer</button>
        <a className="bouton-texte" href={`#/adulte/classe/${classe}`}>Revenir à la classe</a>
      </p>
      <Erreur texte={erreur} />
      <div className="coupons">
        {donnees?.map((e) => (
          <article className="coupon" key={e.id}>
            <h2><Avatar id={e.avatar} taille={40} /> Syllakids · {e.prenom}</h2>
            <p>Pour continuer à la maison le parcours de lecture de la classe :</p>
            <ol>
              <li>Ouvrez Syllakids ({adresse}) et touchez le cadenas pour l'espace adulte.</li>
              <li>Créez un compte parent, puis choisissez « J'ai un code donné par l'enseignant ».</li>
              <li>Saisissez ce code : <strong className="code">{(e.code_famille ?? "").replace(/(.{4})/, "$1 ")}</strong></li>
            </ol>
            {e.code_images && (
              <p className="images-coupon">
                Images secrètes en classe :{" "}
                {e.code_images.split("-").map((k, i) => <Avatar key={i} id={IMAGES_SECRETES[Number(k)]!.id} taille={36} />)}
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
