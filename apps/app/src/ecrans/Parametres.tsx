/**
 * Paramètres de l'application, derrière un calcul de CE1 :
 * réglages de chaque enfant (lecture, activités, temps) et réglages de l'appareil.
 */
import { useState } from "react";
import { naviguer } from "../App";
import { Avatar } from "../composants/Avatars";
import { Mot } from "../composants/Mot";
import { VerrouCalcul } from "../composants/VerrouCalcul";
import { useSyllakids } from "../contexte";
import type { Reglages } from "../progression";
import { estOuvert, fermer, ouvrir } from "../verrou";

function Case({ coche, onChange, children, aide }: { coche: boolean; onChange: (v: boolean) => void; children: string; aide?: string }) {
  return (
    <label>
      <input type="checkbox" checked={coche} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {children}
        {aide && <span className="petit"><br />{aide}</span>}
      </span>
    </label>
  );
}

function ReglagesEnfant({ id }: { id: string }) {
  const { progressionDe, modifierProgressionDe } = useSyllakids();
  // copie locale : l'écran se met à jour aussitôt, même pour un enfant qui n'est pas celui en cours
  const [r, setR] = useState<Reglages>(() => progressionDe(id).reglages);
  const changer = <K extends keyof Reglages>(k: K, v: Reglages[K]) => {
    setR((x) => ({ ...x, [k]: v }));
    modifierProgressionDe(id, (p) => ({ ...p, reglages: { ...p.reglages, [k]: v }, reglagesMaj: new Date().toISOString() }));
  };
  const apercu = ["apercu", r.dys ? "dys" : "", r.couleurs === false ? "sans-couleurs" : "", r.arcs === false ? "sans-arcs" : "", r.grandTexte ? "grand-texte" : ""].join(" ");

  return (
    <>
      <section className="carte-adulte" aria-label="Niveau">
        <h2>Niveau</h2>
        <fieldset>
          <legend>Parcours</legend>
          <label><input type="radio" name="niveau" checked={r.profil === "5ans"} onChange={() => changer("profil", "5ans")} /> 5 ans (grande section) : séances de 10 minutes, consignes courtes, écriture guidée</label>
          <label><input type="radio" name="niveau" checked={r.profil === "6ans"} onChange={() => changer("profil", "6ans")} /> 6 ans (CP) : parcours complet, séances de 15 minutes</label>
        </fieldset>
        <p className="petit">Changer de niveau ne fait rien perdre de la progression.</p>
      </section>

      <section className="carte-adulte" aria-label="Lecture">
        <h2>Lecture</h2>
        <div className={apercu} aria-hidden>
          <Mot texte="VÉLO" taille="10vmin" />
        </div>
        <Case coche={r.couleurs !== false} onChange={(v) => changer("couleurs", v)} aide="Une syllabe en bleu, la suivante en rouge.">Syllabes en couleurs</Case>
        <Case coche={r.arcs !== false} onChange={(v) => changer("arcs", v)} aide="Un arc sous chaque syllabe, pour la lire d'un seul coup.">Arcs sous les syllabes</Case>
        <Case coche={!!r.grandTexte} onChange={(v) => changer("grandTexte", v)}>Mots et phrases plus grands</Case>
        <Case coche={r.dys} onChange={(v) => changer("dys", v)} aide="Police OpenDyslexic, lettres plus espacées.">Mode Dys</Case>
      </section>

      <section className="carte-adulte" aria-label="Activités">
        <h2>Activités</h2>
        <Case coche={r.micro !== false} onChange={(v) => changer("micro", v)} aide="Répéter une syllabe, faire durer un son. Décochez si l'appareil n'a pas de micro ou si l'enfant ne doit pas parler (classe silencieuse).">
          Activités au micro
        </Case>
        <Case coche={!!r.traceSouple} onChange={(v) => changer("traceSouple", v)} aide="Pour un enfant qui a des difficultés motrices : un tracé moins précis est accepté.">
          Tracé des lettres plus tolérant
        </Case>
      </section>

      <section className="carte-adulte" aria-label="Temps de lecture">
        <h2>Temps de lecture</h2>
        <label className="champ">
          Temps maximal par jour, tous appareils confondus
          <select value={r.dureeMax ?? 0} onChange={(e) => changer("dureeMax", Number(e.target.value))}>
            <option value={0}>Pas de limite</option>
            {[10, 15, 20, 30, 45].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
      </section>
    </>
  );
}

function ReglagesAppareil() {
  const { appareil, changerOptions } = useSyllakids();
  const o = appareil.options ?? {};
  return (
    <section className="carte-adulte" aria-label="Sur cet appareil">
      <h2>Sur cet appareil</h2>
      <Case coche={o.regle !== false} onChange={(v) => changerOptions({ regle: v })} aide="Les lignes du cahier sous chaque mot, à sa taille.">Réglure Seyès sous les mots</Case>
      <Case coche={!!o.voixLente} onChange={(v) => changerOptions({ voixLente: v })}>Consignes et mots dits plus lentement</Case>
    </section>
  );
}

export function Parametres() {
  const { appareil, profil } = useSyllakids();
  const [ouvert, setOuvert] = useState(() => estOuvert());
  const [choisi, setChoisi] = useState<string | null>(profil?.id ?? appareil.profils[0]?.id ?? null);
  const enfant = appareil.profils.find((p) => p.id === choisi) ?? null;

  return (
    <main className="adulte">
      <header className="entete-adulte">
        <h1>Paramètres</h1>
        <button className="bouton-texte" type="button" onClick={() => { fermer(); naviguer("#/"); }}>Revenir à l'enfant</button>
      </header>
      {!ouvert ? (
        <VerrouCalcul titre="Paramètres réservés aux adultes." onOuvert={() => { ouvrir(); setOuvert(true); }} />
      ) : (
        <>
          {appareil.profils.length > 1 && (
            <section className="carte-adulte" aria-label="Enfant">
              <h2>Enfant</h2>
              <div className="choix-enfant" role="radiogroup" aria-label="Enfant à régler">
                {appareil.profils.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={p.id === choisi} className={p.id === choisi ? "choisi" : ""} onClick={() => setChoisi(p.id)}>
                    <Avatar id={p.avatar} taille={40} /> {p.prenom || "Sans prénom"}
                  </button>
                ))}
              </div>
            </section>
          )}
          {enfant && (
            <>
              <h2 className="titre-fiche"><Avatar id={enfant.avatar} taille={48} /> {enfant.prenom || "Enfant sans prénom"}</h2>
              <ReglagesEnfant key={enfant.id} id={enfant.id} />
            </>
          )}
          <ReglagesAppareil />
          <section className="carte-adulte" aria-label="Autres réglages">
            <h2>Comptes, suivi et enfants de l'appareil</h2>
            <p>Créer un compte, ajouter un enfant, suivre ses progrès, gérer les accords des parents ou la classe : voir l'espace adulte.</p>
            <a className="bouton-texte" href="#/adulte">Ouvrir l'espace adulte</a>
          </section>
        </>
      )}
    </main>
  );
}
