import { analyserMot, type Segment } from "@syllakids/decodabilite";

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

/** Répartit les segments (graphèmes) dans les syllabes affichées. */
function grouper(segments: Segment[], syllabes: string[]): Segment[][] {
  const groupes: Segment[][] = [];
  let i = 0;
  for (const syl of syllabes) {
    const g: Segment[] = [];
    let longueur = 0;
    while (i < segments.length && longueur < syl.length) {
      g.push(segments[i]!);
      longueur += segments[i]!.g.length;
      i++;
    }
    groupes.push(g);
  }
  if (i < segments.length) groupes.at(-1)?.push(...segments.slice(i));
  return groupes;
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
  const groupes = grouper(seg, syl);
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
