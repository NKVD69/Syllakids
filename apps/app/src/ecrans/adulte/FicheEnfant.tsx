/**
 * Fiche d'un enfant : suivi, réglages, et selon le cas accords parentaux, classe, codes, données.
 * L'enfant peut être sur cet appareil, dans le compte du parent, ou dans une classe de l'enseignant.
 */
import { useState } from "react";
import { naviguer } from "../../App";
import { Avatar, IMAGES_SECRETES } from "../../composants/Avatars";
import { useCompte } from "../../compte";
import { trouverItem } from "../../contenu";
import { useSyllakids } from "../../contexte";
import { normaliser, PROGRESSION_VIDE, type Progression, type Reglages } from "../../progression";
import { api, portProgression, type Eleve, type EnfantFamille } from "../../serveur/api";
import type { Backend } from "../../serveur/backend";
import { suivre, type Suivi } from "../../suivi";
import { synchroniser } from "../../synchro";
import { FormulaireAccord } from "./Accord";
import { BlocProductions } from "./Productions";
import { effacerProductions } from "../../productions";
import { elevesDe, oublierCache } from "./Classes";
import { ChoixAge, ChoixAvatar, versProfilsDistants } from "./Famille";
import { dateFr, dateHeureFr, Erreur, Message, nomUnite, Section, telecharger, UNITES_RESUMEES, useAction, useDonnees } from "./outils";

/** Modifie la progression d'un enfant qui n'est pas sur cet appareil (lecture, modification, écriture avec fusion). */
async function modifierProgressionDistante(b: Backend, id: string, f: (p: Progression) => Progression) {
  const port = portProgression(b);
  const d = await port.lire(id);
  await synchroniser(port, id, f(normaliser(d?.donnees ?? {})), d?.version ?? 0, true);
}

function BlocSuivi({ s }: { s: Suivi }) {
  const max = Math.max(10, ...s.minutesParJour.map((j) => j.minutes));
  const textes = s.difficultes.slice(0, 12).map((id) => trouverItem(id)?.item.texte ?? id);
  return (
    <Section titre="Suivi">
      <dl className="chiffres">
        <div><dt>En ce moment</dt><dd>{nomUnite(s.courante)}{s.courante && s.courante.bloc !== "bilan" ? ` (séance ${Math.min(s.seancesCourante + 1, 2)} sur 2)` : ""}</dd></div>
        <div><dt>Sons validés</dt><dd>{s.terminees} sur {s.total}</dd></div>
        <div><dt>Lecture cette semaine</dt><dd>{s.minutesSemaine} min</dd></div>
        <div><dt>Réussite (14 jours)</dt><dd>{s.reussiteRecente == null ? "—" : `${Math.round(s.reussiteRecente * 100)} %`}</dd></div>
        <div><dt>À revoir aujourd'hui</dt><dd>{s.aRevoir}</dd></div>
        <div><dt>Record de lecture</dt><dd>{s.fluence == null ? "—" : `${s.fluence} mots en une minute`}</dd></div>
        <div><dt>Dernière activité</dt><dd>{dateFr(s.derniereActivite)}</dd></div>
      </dl>
      <figure className="histogramme" aria-label="Minutes de lecture par jour sur 14 jours">
        <div className="barres">
          {s.minutesParJour.map((j) => (
            <div key={j.jour} title={`${dateFr(j.jour)} : ${j.minutes} min`}>
              <span style={{ height: `${(j.minutes / max) * 100}%` }} />
              <small>{Number(j.jour.slice(8))}</small>
            </div>
          ))}
        </div>
        <figcaption className="petit">Minutes de lecture par jour (14 derniers jours)</figcaption>
      </figure>
      {textes.length > 0 && (
        <>
          <h3>À retravailler</h3>
          <p className="petit">Éléments souvent manqués récemment ; ils reviennent automatiquement dans les révisions.</p>
          <ul className="etiquettes-adulte">{textes.map((t, k) => <li key={k}>{t}</li>)}</ul>
        </>
      )}
    </Section>
  );
}

function BlocReglages({ id, prenom, avatar, reglages, enregistrer }: {
  id: string; prenom: string; avatar: string; reglages: Reglages;
  enregistrer: (prenom: string, avatar: string, r: Reglages) => Promise<void>;
}) {
  const [p, setP] = useState(prenom);
  const [a, setA] = useState(avatar);
  const [r, setR] = useState<Reglages>(reglages);
  const action = useAction();
  return (
    <Section titre="Réglages">
      <form className="formulaire" onSubmit={(e) => { e.preventDefault(); void action.lancer(async () => { await enregistrer(p.trim(), a, r); return "Réglages enregistrés."; }); }}>
        <label className="champ">Prénom ou surnom <input value={p} onChange={(e) => setP(e.target.value)} maxLength={30} /></label>
        <details className="changer-avatar">
          <summary><Avatar id={a} taille={40} /> Changer l'image</summary>
          <ChoixAvatar valeur={a} onChange={setA} />
        </details>
        <ChoixAge valeur={r.profil} onChange={(profil) => setR({ ...r, profil })} />
        <label><input type="checkbox" checked={r.dys} onChange={(e) => setR({ ...r, dys: e.target.checked })} /> Mode Dys : police de caractères adaptée</label>
        <label className="champ">
          Temps de lecture maximal par jour
          <select value={r.dureeMax ?? 0} onChange={(e) => setR({ ...r, dureeMax: Number(e.target.value) })}>
            <option value={0}>Pas de limite</option>
            {[10, 15, 20, 30, 45].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
        <Message message={action.message} />
        <button className="bouton-texte principal" type="submit" disabled={action.occupe} data-enfant={id}>Enregistrer</button>
      </form>
    </Section>
  );
}

export function FicheEnfant({ id, classe }: { id: string; classe?: string }) {
  const { serveur, session, compte } = useCompte();
  const ctx = useSyllakids();
  const { appareil, progressionDe, modifierProgressionDe, modifierProfil, retirerProfil, installerProfils, synchroniserMaintenant } = ctx;
  const local = appareil.profils.find((p) => p.id === id) ?? null;
  const parent = !!serveur && !!session && compte?.role === "parent";
  const enseignant = !!serveur && !!session && compte?.role === "enseignant" && !!classe;
  const [tour, setTour] = useState(0);
  const { donnees: distant, erreur } = useDonnees<{ famille: EnfantFamille | null; eleve: Eleve | null }>(
    parent ? async () => ({ famille: (await api.mesEnfants(serveur!)).find((e) => e.id === id) ?? null, eleve: null })
      : enseignant ? async () => ({ famille: null, eleve: (await elevesDe(serveur!, classe!, tour > 0)).find((e) => e.id === id) ?? null })
      : null,
    [parent, enseignant, id, classe, tour],
  );
  const recharger = () => {
    if (classe) oublierCache(classe);
    setTour((t) => t + 1);
  };
  const famille = distant?.famille ?? null;
  const eleve = distant?.eleve ?? null;
  const surCompte = !!famille || !!eleve;
  const progression = local ? progressionDe(id) : normaliser(famille?.donnees ?? eleve?.donnees ?? structuredClone(PROGRESSION_VIDE));
  const prenom = local?.prenom || famille?.prenom || eleve?.prenom || "";
  const avatar = local?.avatar ?? famille?.avatar ?? eleve?.avatar ?? "soleil";
  const s = suivre(progression, UNITES_RESUMEES);
  const action = useAction();

  if (!local && !distant && !erreur) return <p>Chargement…</p>;
  if (!local && distant && !surCompte) return <Erreur texte="Ce profil n'est plus accessible." />;

  const enregistrerReglages = async (p: string, a: string, r: Reglages) => {
    const f = (x: Progression): Progression => ({ ...x, reglages: r, reglagesMaj: new Date().toISOString() });
    if (local) {
      modifierProfil(id, { prenom: p, avatar: a });
      modifierProgressionDe(id, f);
    } else if (serveur) await modifierProgressionDistante(serveur, id, f);
    if (serveur && surCompte && p) await api.modifierEnfant(serveur, id, p, a, r.profil, r.dys);
    if (local && surCompte) await synchroniserMaintenant();
    if (!local) recharger();
  };

  return (
    <>
      <h2 className="titre-fiche"><Avatar id={avatar} taille={64} /> {prenom || "Enfant sans prénom"}</h2>
      <Erreur texte={erreur} />
      <BlocSuivi s={s} />
      <BlocReglages key={`${id}-${tour}`} id={id} prenom={prenom} avatar={avatar} reglages={progression.reglages} enregistrer={enregistrerReglages} />

      {parent && famille && <BlocFamille id={id} famille={famille} local={!!local} onChange={recharger} />}

      {parent && local?.origine === "appareil" && (
        <Section titre="Sauvegarder sur votre compte">
          <p>Ce profil n'existe que sur cet appareil. Sur votre compte, il se retrouve sur vos autres appareils et peut être rattaché à la classe.</p>
          <FormulaireAccord
            prenom={prenom}
            enClasse={false}
            bouton="Sauvegarder sur mon compte"
            occupe={action.occupe}
            onValider={(accord) =>
              void action.lancer(async () => {
                if (!prenom) throw new Error("Indiquez d'abord un prénom ou un surnom dans les réglages.");
                await api.creerEnfant(serveur!, { id, prenom, avatar, profil: progression.reglages.profil, dys: progression.reglages.dys }, accord);
                modifierProfil(id, { origine: "famille", version: 0, sale: true });
                await synchroniserMaintenant();
                recharger();
                return "Le profil est sauvegardé sur votre compte.";
              })
            }
          />
        </Section>
      )}

      {enseignant && eleve && <BlocEleve id={id} classe={classe!} eleve={eleve} onChange={recharger} />}

      {(() => {
        // accords en vigueur : ceux de l'appareil (reçus du serveur ou réglés ici), sinon ceux lus sur le serveur
        const voixAppareil = local?.accords?.voixAppareil ?? eleve?.voix_appareil ?? famille?.consentement?.voix_appareil ?? false;
        const voixPartage = local?.accords?.voixPartage ?? eleve?.voix_partage ?? famille?.consentement?.voix_partage ?? false;
        if (!voixAppareil && !voixPartage) return null;
        const conservation = voixPartage
          ? "Gardées 3 mois sur l'appareil, et partagées avec l'enseignant jusqu'à la fin de l'année scolaire, selon l'accord des parents."
          : "Gardées 3 mois sur l'appareil seulement, selon l'accord des parents.";
        return <BlocProductions id={id} surAppareil={!!local && voixAppareil} partageServeur={surCompte && voixPartage} conservation={conservation} />;
      })()}

      <Section titre="Cet appareil">
        {local ? (
          <>
            <p>{local.origine === "appareil" ? "Ce profil n'existe que sur cet appareil." : "Ce profil est sur cet appareil et se synchronise avec le compte."}</p>
            {local.origine === "appareil" && (
              <label>
                <input
                  type="checkbox"
                  checked={!!local.accords?.voixAppareil}
                  onChange={(e) => {
                    modifierProfil(id, { accords: { voixAppareil: e.target.checked, voixPartage: false } });
                    if (!e.target.checked) void effacerProductions(id);
                  }}
                />
                Garder la voix et les lettres tracées de l'enfant sur cet appareil pendant 3 mois, pour les réécouter et les revoir ici (rien n'est envoyé)
              </label>
            )}
            <p className="actions-adulte">
              {local.origine === "appareil" && (
                <button className="bouton-texte" type="button" onClick={() => {
                  if (window.confirm("Effacer toute la progression de cet enfant sur cet appareil ?")) modifierProgressionDe(id, (p) => ({ ...structuredClone(PROGRESSION_VIDE), reglages: p.reglages, reglagesMaj: p.reglagesMaj }));
                }}>Recommencer depuis le début</button>
              )}
              <button className="bouton-texte" type="button" disabled={appareil.profils.length <= 1} onClick={() => {
                const msg = local.origine === "appareil" ? "Retirer ce profil de l'appareil ? Sa progression sera effacée." : "Retirer ce profil de l'appareil ? Il reste sur le compte.";
                if (!window.confirm(msg)) return;
                void synchroniserMaintenant().finally(() => { retirerProfil(id); naviguer("#/adulte"); });
              }}>Retirer de cet appareil</button>
            </p>
          </>
        ) : (
          <button className="bouton-texte" type="button" onClick={() => {
            if (famille) installerProfils(versProfilsDistants([famille]));
            else if (eleve) installerProfils([{ id, prenom: eleve.prenom, avatar: eleve.avatar, codeImages: eleve.code_images, origine: "classe", donnees: eleve.donnees, version: eleve.version, accords: { voixAppareil: eleve.voix_appareil, voixPartage: eleve.voix_partage } }]);
          }}>Mettre sur cet appareil</button>
        )}
        <Message message={action.message} />
      </Section>
    </>
  );
}

function BlocFamille({ id, famille, local, onChange }: { id: string; famille: NonNullable<Awaited<ReturnType<typeof api.mesEnfants>>[number]>; local: boolean; onChange: () => void }) {
  const { serveur } = useCompte();
  const { modifierProfil, synchroniserMaintenant } = useSyllakids();
  const [code, setCode] = useState("");
  const [journal, setJournal] = useState<Awaited<ReturnType<typeof api.journalEnfant>> | null>(null);
  const action = useAction();
  if (!serveur) return null;
  return (
    <>
      <Section titre="Classe">
        {famille.classe ? (
          <p>Rattaché(e) à la classe {famille.classe} : la progression est la même en classe et à la maison.</p>
        ) : (
          <form className="formulaire en-ligne" onSubmit={(e) => { e.preventDefault(); void action.lancer(async () => { const nom = await api.rejoindreClasse(serveur, id, code); onChange(); return `Rattaché(e) à la classe ${nom}.`; }); }}>
            <label className="champ">Code de la classe (6 caractères, donné par l'enseignant) <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} minLength={6} maxLength={8} required /></label>
            <button className="bouton-texte" type="submit" disabled={action.occupe}>Rejoindre la classe</button>
          </form>
        )}
      </Section>
      <Section titre="Vos accords">
        {famille.consentement && <p className="petit">Dernière modification : {dateFr(famille.consentement.le)}.</p>}
        <FormulaireAccord
          initial={famille.consentement}
          prenom={famille.prenom}
          enClasse={!!famille.classe}
          bouton="Enregistrer mes accords"
          occupe={action.occupe}
          onValider={(accord) => void action.lancer(async () => { await api.donnerConsentement(serveur, id, accord); onChange(); return "Vos accords sont enregistrés."; })}
        />
      </Section>
      <Section titre="Données de votre enfant">
        <p className="actions-adulte">
          <button className="bouton-texte" type="button" onClick={() => void action.lancer(async () => {
            const x = await api.exporterEnfant(serveur, id);
            telecharger(`syllakids-${famille.prenom}.json`, JSON.stringify(x, null, 2), "application/json");
          })}>Télécharger ses données</button>
          <button className="bouton-texte" type="button" onClick={() => void action.lancer(async () => setJournal(await api.journalEnfant(serveur, id)))}>Qui a consulté ses données ?</button>
        </p>
        {journal && (
          <ul className="journal">
            {journal.length === 0 ? <li>Aucune consultation.</li> : journal.map((j, k) => <li key={k}>{dateHeureFr(j.le)} · {j.action} · {j.qui}</li>)}
          </ul>
        )}
        <details>
          <summary>Retirer mon accord et supprimer ses données</summary>
          <p>
            {famille.classe
              ? "Votre compte est détaché du profil. Le profil de classe reste sous la responsabilité de l'école : demandez à l'enseignant de le retirer si vous le souhaitez."
              : "Le profil et sa progression sont supprimés du serveur."}
            {local ? " Le profil reste utilisable sur cet appareil, sans synchronisation ; vous pouvez aussi l'en retirer." : ""}
          </p>
          <button className="bouton-texte danger" type="button" onClick={() => {
            if (!window.confirm("Retirer votre accord ? Cette action ne peut pas être annulée.")) return;
            void action.lancer(async () => {
              const r = await api.donnerConsentement(serveur, id, { version: "retrait", utilisation: false, voix_appareil: false, voix_partage: false, tests_classe: false });
              if (local) modifierProfil(id, { origine: "appareil", version: 0, sale: false });
              await synchroniserMaintenant();
              onChange();
              return r === "supprime" ? "Les données ont été supprimées du serveur." : "Votre compte est détaché de ce profil.";
            });
          }}>Retirer mon accord</button>
        </details>
        <Message message={action.message} />
      </Section>
    </>
  );
}

function BlocEleve({ id, classe, eleve, onChange }: { id: string; classe: string; eleve: Eleve; onChange: () => void }) {
  const { serveur } = useCompte();
  const { appareil, modifierProfil, retirerProfil, synchroniserMaintenant } = useSyllakids();
  const { code_famille: code, code_images: images, famille } = eleve;
  const [papier, setPapier] = useState({ voixAppareil: eleve.voix_appareil, voixPartage: eleve.voix_partage, tests: false });
  const action = useAction();
  const accord = useAction();
  if (!serveur) return null;
  return (
    <>
    <Section titre="Accord des parents sur la voix et les tracés">
      <p>
        {eleve.accord_source === "application"
          ? "Accord donné par la famille dans l'application. "
          : eleve.accord_source === "papier" ? "Accord papier saisi en classe. " : "Aucun accord enregistré : rien n'est gardé. "}
        Saisissez ici le formulaire papier signé par la famille ; l'accord le plus récent s'applique.
      </p>
      <form className="formulaire" onSubmit={(e) => { e.preventDefault(); void accord.lancer(async () => {
        await api.accordPapier(serveur, id, papier.voixAppareil, papier.voixPartage, papier.tests);
        oublierCache(classe);
        await synchroniserMaintenant();
        onChange();
        return "Accord papier enregistré.";
      }); }}>
        <label><input type="checkbox" checked={papier.voixAppareil} onChange={(e) => setPapier({ ...papier, voixAppareil: e.target.checked, voixPartage: e.target.checked && papier.voixPartage })} /> Voix et lettres tracées conservées sur la tablette (3 mois)</label>
        <label><input type="checkbox" checked={papier.voixPartage} disabled={!papier.voixAppareil} onChange={(e) => setPapier({ ...papier, voixPartage: e.target.checked })} /> Partagées avec l'enseignant jusqu'à la fin de l'année scolaire</label>
        <label><input type="checkbox" checked={papier.tests} onChange={(e) => setPapier({ ...papier, tests: e.target.checked })} /> Participation aux tests de Syllakids en classe</label>
        <button className="bouton-texte" type="submit" disabled={accord.occupe}>Enregistrer l'accord papier</button>
      </form>
      <Message message={accord.message} />
    </Section>
    <Section titre="En classe">
      <p>Code famille : <strong className="code">{(code ?? "").replace(/(.{4})/, "$1 ")}</strong> {famille ? "(une famille est rattachée)" : "(aucune famille rattachée)"}</p>
      {images && (
        <p className="images-coupon">Images secrètes : {images.split("-").map((k, i) => <Avatar key={i} id={IMAGES_SECRETES[Number(k)]!.id} taille={36} />)}</p>
      )}
      <p className="actions-adulte">
        <button className="bouton-texte" type="button" onClick={() => void action.lancer(async () => { await api.nouveauCodeFamille(serveur, id); onChange(); return "Nouveau code famille créé ; l'ancien ne fonctionne plus."; })}>Nouveau code famille</button>
        <button className="bouton-texte" type="button" onClick={() => void action.lancer(async () => {
          const n = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, 3).join("-");
          await serveur.appeler("nouveau_code_images", { p_enfant: id, p_code: n });
          if (appareil.profils.some((p) => p.id === id)) modifierProfil(id, { codeImages: n });
          onChange();
          return "Nouvelles images secrètes.";
        })}>Changer les images secrètes</button>
        <button className="bouton-texte danger" type="button" onClick={() => {
          if (!window.confirm(famille ? "Retirer l'élève de la classe ? Le profil reste à sa famille." : "Retirer l'élève de la classe ? Son profil et sa progression seront supprimés.")) return;
          void action.lancer(async () => {
            await api.retirerEleve(serveur, id);
            oublierCache(classe);
            if (appareil.profils.some((p) => p.id === id)) retirerProfil(id);
            naviguer(`#/adulte/classe/${classe}`);
          });
        }}>Retirer de la classe</button>
      </p>
      <Message message={action.message} />
    </Section>
    </>
  );
}
