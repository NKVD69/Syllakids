import { useMemo, useState } from "react";
import { naviguer } from "../App";
import consignes from "@contenu/consignes.json";
import { useSyllakids } from "../contexte";

/** Verrou parental : une petite addition que l'enfant de 5-6 ans ne sait pas encore lire. */
function Verrou({ onOuvert }: { onOuvert: () => void }) {
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
      <p><button className="bouton-texte" type="button" onClick={() => naviguer("#/")}>Revenir au chemin</button></p>
    </form>
  );
}

export function EspaceAdulte() {
  const { progression, modifier } = useSyllakids();
  const [ouvert, setOuvert] = useState(false);
  const r = progression.reglages;

  return (
    <main className="adulte">
      <h1>Espace adulte</h1>
      {!ouvert ? (
        <Verrou onOuvert={() => setOuvert(true)} />
      ) : (
        <>
          <h2>Profil de l'enfant</h2>
          <fieldset>
            <legend>Âge</legend>
            {(["5ans", "6ans"] as const).map((p) => (
              <label key={p}>
                <input type="radio" name="profil" checked={r.profil === p} onChange={() => modifier((x) => ({ ...x, reglages: { ...x.reglages, profil: p } }))} />
                {p === "5ans" ? "5 ans (grande section) : séances de 10 minutes, consignes courtes, écriture guidée" : "6 ans (CP) : parcours complet, séances de 15 minutes"}
              </label>
            ))}
          </fieldset>

          <h2>Affichage</h2>
          <label>
            <input type="checkbox" checked={r.dys} onChange={(e) => modifier((x) => ({ ...x, reglages: { ...x.reglages, dys: e.target.checked } }))} />
            Mode Dys : police de caractères adaptée
          </label>

          <h2>Progression</h2>
          <p>{progression.terminees.length} étape{progression.terminees.length > 1 ? "s" : ""} terminée{progression.terminees.length > 1 ? "s" : ""} sur le chemin.</p>
          <button className="bouton-texte" type="button" onClick={() => { if (confirm("Effacer toute la progression de cet enfant ?")) modifier((x) => ({ ...x, terminees: [] })); }}>
            Recommencer depuis le début
          </button>

          <h2>Conseils</h2>
          <ul>{consignes.parents.slice(0, 6).map((c) => <li key={c.id}>{c.texte}</li>)}</ul>

          <p style={{ marginTop: 32 }}>
            <button className="bouton-texte" type="button" onClick={() => naviguer("#/")}>Revenir au chemin</button>
          </p>
        </>
      )}
    </main>
  );
}
