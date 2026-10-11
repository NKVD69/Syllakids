import { analyserMot, grouperParSyllabe, type Segment } from "@syllakids/decodabilite";

export type Aides = "complet" | "arcs" | "nu";

interface Props {
  texte: string;
  segments?: Segment[];
  syllabes?: string[];
  taille?: string;
  aides?: Aides;
  pluriel?: boolean;
  className?: string;
}

/** Affiche un mot avec ses repères de lecture : arcs sous les syllabes, couleurs alternées, lettres muettes en gris. */
export function Mot({ texte, segments, syllabes, taille = "12vmin", aides = "complet", pluriel = true, className = "" }: Props) {
  let seg = segments;
  let syl = syllabes;
  if (!seg || !syl) {
    const a = analyserMot(texte, { pluriel });
    if (a.ok) {
      seg = a.segments;
      syl = a.syllabes;
    } else {
      seg = [...texte].map((g) => ({ g, p: "" }));
      syl = [texte];
    }
  }
  const groupes = grouperParSyllabe(seg, syl);
  return (
    <span className={`mot lettres ${aides === "nu" ? "nu" : ""} ${className}`} style={{ fontSize: taille }} aria-label={texte}>
      {groupes.map((g, i) => (
        <span key={i} className={`syllabe ${aides !== "nu" ? "arc" : ""} ${aides === "complet" ? `c${i % 2}` : ""}`}>
          {g.map((s, j) => (
            <span key={j} className={s.muet ? "muette" : undefined}>{s.g}</span>
          ))}
        </span>
      ))}
    </span>
  );
}
