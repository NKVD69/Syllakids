/** Écoute de la voix et relecture des lettres tracées : celles de l'appareil et celles partagées sur le serveur. */
import { useEffect, useState } from "react";
import { useCompte } from "../../compte";
import { trouverItem } from "../../contenu";
import { depuisBase64, productionsDe, type Production } from "../../productions";
import { api } from "../../serveur/api";
import { dateHeureFr, Erreur, Section, useAction, useDonnees } from "./outils";

type Traits = readonly (readonly (readonly [number, number])[])[];

/** Une case par lettre, dessinée dans le repère des modèles (capitale de 0 à 100, accents au-dessus). */
export function ApercuTrace({ cases }: { cases: readonly Traits[] }) {
  return (
    <span className="apercu-trace" aria-label={`Tracé en ${cases.length} case${cases.length > 1 ? "s" : ""}`}>
      {cases.map((traits, k) => (
        <svg key={k} viewBox="-15 -40 130 155" width="44" height="52" aria-hidden>
          <line x1="-15" x2="115" y1="0" y2="0" className="ligne-haut" />
          <line x1="-15" x2="115" y1="100" y2="100" className="ligne-base" />
          {traits.map((t, i) => (
            <polyline key={i} points={t.map(([x, y]) => `${x},${y}`).join(" ")} />
          ))}
        </svg>
      ))}
    </span>
  );
}

function libelle(item: string): string {
  if (item.startsWith("lettre:")) return `la lettre ${item.slice(7)}`;
  return trouverItem(item)?.item.texte ?? item;
}

function Lecteur({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <audio controls src={url} preload="none" /> : null;
}

function LecteurServeur({ id }: { id: string }) {
  const { serveur } = useCompte();
  const [blob, setBlob] = useState<Blob | null>(null);
  const action = useAction();
  if (blob) return <Lecteur blob={blob} />;
  return (
    <button className="bouton-lien" type="button" disabled={action.occupe} onClick={() => void action.lancer(async () => {
      const a = await api.audioProduction(serveur!, id);
      if (a) setBlob(depuisBase64(a.audio, a.mime));
    })}>Écouter</button>
  );
}

export function BlocProductions({ id, surAppareil, partageServeur, conservation }: {
  id: string;
  surAppareil: boolean;
  partageServeur: boolean;
  /** Texte qui dit ce qui est gardé et où. */
  conservation: string;
}) {
  const { serveur } = useCompte();
  const [locales, setLocales] = useState<Production[] | null>(null);
  const [voirServeur, setVoirServeur] = useState(false);
  const distantes = useDonnees(voirServeur && serveur ? () => api.productionsEnfant(serveur, id) : null, [voirServeur, id]);

  useEffect(() => {
    if (surAppareil) void productionsDe(id).then(setLocales);
  }, [id, surAppareil]);

  return (
    <Section titre="Voix et lettres tracées">
      <p className="petit">{conservation}</p>
      {surAppareil && (
        <>
          <h3>Sur cet appareil</h3>
          {locales && locales.length === 0 && <p className="petit">Rien pour l'instant.</p>}
          <ul className="productions">
            {locales?.slice(0, 60).map((p) => (
              <li key={p.id}>
                <span className="petit">{dateHeureFr(p.le)}</span> · {p.type === "voix" ? "répète" : "écrit"} <strong>{libelle(p.item)}</strong>
                {p.type === "voix" && p.audio && <Lecteur blob={p.audio} />}
                {p.type === "trace" && p.traits && <ApercuTrace cases={p.traits} />}
                {p.envoye && <span className="petit"> · partagé</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {partageServeur && serveur && (
        <>
          <h3>Partagé avec l'enseignant</h3>
          {!voirServeur ? (
            <button className="bouton-texte" type="button" onClick={() => setVoirServeur(true)}>Afficher ce qui est sur le serveur</button>
          ) : (
            <>
              <Erreur texte={distantes.erreur} />
              {distantes.donnees?.length === 0 && <p className="petit">Rien pour l'instant.</p>}
              <ul className="productions">
                {distantes.donnees?.map((p) => (
                  <li key={p.id}>
                    <span className="petit">{dateHeureFr(p.cree_le)}</span> · {p.type === "voix" ? "répète" : "écrit"} <strong>{libelle(p.item)}</strong>
                    {p.type === "voix" && <LecteurServeur id={p.id} />}
                    {p.type === "trace" && p.traits && <ApercuTrace cases={p.traits} />}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Section>
  );
}
