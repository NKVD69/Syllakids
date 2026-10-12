/**
 * Avertissement avant suppression pour inactivité (registre des traitements, T1 et T2) :
 * un mois avant, l'adulte reçoit un e-mail qui explique comment garder son compte ou le profil de son enfant.
 * Logique pure, testée avec vitest ; index.ts la branche sur Supabase et sur le service d'e-mails.
 */

export interface APrevenir {
  adulte: string;
  email: string;
  raison: "compte" | "profil";
  enfant: string | null;
  prenom: string | null;
}

export interface Courriel {
  a: string;
  sujet: string;
  texte: string;
}

interface Lot {
  courriel: Courriel;
  adultes: string[];
  enfants: string[];
}

/** Un seul e-mail par adresse, qui regroupe le compte et les profils concernés. */
export function composer(lignes: APrevenir[], adresse: string): Lot[] {
  const parEmail = new Map<string, APrevenir[]>();
  for (const l of lignes) parEmail.set(l.email, [...(parEmail.get(l.email) ?? []), l]);
  return [...parEmail.entries()].map(([email, ls]) => {
    const compte = ls.some((l) => l.raison === "compte");
    const profils = ls.filter((l) => l.raison === "profil" && l.enfant);
    const prenoms = [...new Set(profils.map((l) => l.prenom ?? "votre enfant"))];
    const paragraphes = ["Bonjour,"];
    if (compte) {
      paragraphes.push(
        "Vous ne vous êtes pas connecté(e) à votre compte Syllakids depuis 11 mois. Comme l'indique notre politique de confidentialité, " +
          "le compte et les profils d'enfants qui ne sont rattachés qu'à lui seront supprimés dans un mois.",
        `Pour les garder, il suffit d'ouvrir Syllakids (${adresse}) et de vous connecter dans l'espace adulte (le cadenas).`,
      );
    }
    if (profils.length) {
      const qui = prenoms.length === 1 ? `Le profil de ${prenoms[0]} n'a` : `Les profils de ${prenoms.slice(0, -1).join(", ")} et ${prenoms.at(-1)} n'ont`;
      paragraphes.push(
        `${qui} pas été utilisé${prenoms.length > 1 ? "s" : ""} depuis 11 mois. Sans nouvelle séance de lecture, ${prenoms.length > 1 ? "ils seront supprimés" : "il sera supprimé"} dans un mois avec la progression.`,
        "Pour le garder, il suffit d'une séance de lecture sur un appareil relié à votre compte.",
      );
    }
    paragraphes.push("Si vous ne souhaitez plus utiliser Syllakids, vous n'avez rien à faire : les données seront effacées.", "L'équipe Syllakids");
    return {
      courriel: {
        a: email,
        sujet: compte ? "Votre compte Syllakids sera supprimé dans un mois" : "Un profil Syllakids sera supprimé dans un mois",
        texte: paragraphes.join("\n\n"),
      },
      adultes: compte ? [...new Set(ls.filter((l) => l.raison === "compte").map((l) => l.adulte))] : [],
      enfants: [...new Set(profils.map((l) => l.enfant!))],
    };
  });
}

export interface Dependances {
  lister(): Promise<APrevenir[]>;
  envoyer(c: Courriel): Promise<void>;
  marquer(adultes: string[], enfants: string[]): Promise<void>;
  adresse: string;
}

/** Envoie les e-mails ; seuls les avertissements réellement envoyés sont notés (les autres seront retentés demain). */
export async function prevenir(d: Dependances): Promise<{ envoyes: number; echecs: number }> {
  const lots = composer(await d.lister(), d.adresse);
  const adultes: string[] = [];
  const enfants: string[] = [];
  let echecs = 0;
  for (const lot of lots) {
    try {
      await d.envoyer(lot.courriel);
      adultes.push(...lot.adultes);
      enfants.push(...lot.enfants);
    } catch {
      echecs++;
    }
  }
  if (adultes.length || enfants.length) await d.marquer(adultes, enfants);
  return { envoyes: lots.length - echecs, echecs };
}
