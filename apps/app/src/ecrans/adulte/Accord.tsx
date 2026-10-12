/**
 * Formulaire de consentement parental : trois accords séparés, un refus n'empêche pas les autres
 * (documents RGPD, onglet « Consentement parental »). Seule l'utilisation est indispensable.
 */
import { useState } from "react";
import { VERSION_ACCORD, type Accord } from "../../serveur/api";

export const ACCORD_VIDE: Accord = { version: VERSION_ACCORD, utilisation: false, voix_appareil: false, voix_partage: false, tests_classe: false };

export function FormulaireAccord({
  initial, prenom, enClasse, bouton, occupe, onValider,
}: {
  initial?: Partial<Accord> | null;
  prenom: string;
  enClasse: boolean;
  bouton: string;
  occupe?: boolean;
  onValider: (a: Accord) => void;
}) {
  const [a, setA] = useState<Accord>({ ...ACCORD_VIDE, ...(initial ?? {}), version: VERSION_ACCORD });
  const nom = prenom.trim() || "votre enfant";
  const changer = (k: keyof Accord, v: boolean) =>
    setA((x) => {
      const n = { ...x, [k]: v };
      if (k === "voix_appareil" && !v) n.voix_partage = false;
      return n;
    });

  return (
    <form
      className="accord"
      onSubmit={(e) => {
        e.preventDefault();
        if (a.utilisation) onValider(a);
      }}
    >
      <fieldset>
        <legend>1. Utilisation de Syllakids</legend>
        <p>
          Syllakids est une application gratuite, sans publicité, pour apprendre à lire. Pour fonctionner, elle enregistre le prénom ou le surnom de {nom},
          son image et ses résultats aux exercices, afin d'adapter son parcours et de vous montrer ses progrès.
        </p>
        <label>
          <input type="checkbox" checked={a.utilisation} onChange={(e) => changer("utilisation", e.target.checked)} required />
          J'accepte que {nom} utilise Syllakids et que ses résultats soient enregistrés, dans les conditions de la politique de confidentialité.
        </label>
      </fieldset>
      <fieldset>
        <legend>2. Voix et lettres tracées (facultatif)</legend>
        <p>
          Dans certains exercices, l'enfant répète un son dans le micro (5 secondes au plus) et trace des lettres avec le doigt. Ces enregistrements restent sur la
          tablette pendant 3 mois au plus. <em>Cette conservation n'est pas encore active : aujourd'hui, rien n'est gardé après l'exercice.</em>
        </p>
        <label>
          <input type="checkbox" checked={a.voix_appareil} onChange={(e) => changer("voix_appareil", e.target.checked)} />
          J'accepte que la voix et les lettres tracées de {nom} soient conservées sur la tablette pour qu'il ou elle puisse se réécouter.
        </label>
        <label>
          <input type="checkbox" checked={a.voix_partage} disabled={!a.voix_appareil} onChange={(e) => changer("voix_partage", e.target.checked)} />
          J'accepte en plus qu'elles soient partagées avec son enseignant, sur le serveur sécurisé de Syllakids, jusqu'à la fin de l'année scolaire.
        </label>
      </fieldset>
      {enClasse && (
        <fieldset>
          <legend>3. Participation aux tests en classe (facultatif)</legend>
          <p>
            Avant sa diffusion, Syllakids est testé dans quelques classes. Un adulte de l'école observe comment les enfants utilisent l'application et note leurs
            difficultés. Les résultats sont analysés sans le nom des enfants et ne sont jamais publiés de façon qui permette de les reconnaître. Aucune photo ni vidéo.
          </p>
          <label>
            <input type="checkbox" checked={a.tests_classe} onChange={(e) => changer("tests_classe", e.target.checked)} />
            J'accepte que {nom} participe aux tests de Syllakids dans sa classe.
          </label>
        </fieldset>
      )}
      <p className="petit">
        Vous pouvez retirer chacun de ces accords à tout moment depuis cet espace, sans conséquence pour votre enfant. Le retrait entraîne la suppression des données
        concernées.
      </p>
      <button className="bouton-texte principal" type="submit" disabled={!a.utilisation || occupe}>{bouton}</button>
    </form>
  );
}
