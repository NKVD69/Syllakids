/**
 * Images des profils d'enfants et des « images secrètes » de la classe.
 * Dessins simples, sans lettre, reconnaissables par un enfant qui ne lit pas encore.
 */
import type { ReactNode } from "react";

interface Dessin { id: string; nom: string; fond: string; svg: ReactNode }

export const AVATARS: Dessin[] = [
  {
    id: "soleil", nom: "soleil", fond: "#fff3c4",
    svg: (
      <g>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="50" y1="14" x2="50" y2="24" stroke="#f0a400" strokeWidth="6" strokeLinecap="round" transform={`rotate(${a} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="19" fill="#ffc21a" stroke="#f0a400" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: "lune", nom: "lune", fond: "#dfe6fb",
    svg: <path d="M62 18a32 32 0 1 0 20 50A26 26 0 1 1 62 18z" fill="#4f6fc9" />,
  },
  {
    id: "etoile", nom: "étoile", fond: "#ffe9cc",
    svg: <path d="M50 14l10 22 24 3-18 16 5 24-21-12-21 12 5-24-18-16 24-3z" fill="#f28c18" stroke="#d26f00" strokeWidth="3" strokeLinejoin="round" />,
  },
  {
    id: "fleur", nom: "fleur", fond: "#fde1ee",
    svg: (
      <g>
        <path d="M50 58v30" stroke="#2e9e5b" strokeWidth="5" strokeLinecap="round" />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="50" cy="28" rx="11" ry="15" fill="#e8559a" transform={`rotate(${a} 50 44)`} />
        ))}
        <circle cx="50" cy="44" r="9" fill="#ffc21a" />
      </g>
    ),
  },
  {
    id: "arbre", nom: "arbre", fond: "#ddf3e3",
    svg: (
      <g>
        <rect x="44" y="55" width="12" height="32" rx="3" fill="#8a5a2b" />
        <circle cx="50" cy="40" r="26" fill="#2e9e5b" />
      </g>
    ),
  },
  {
    id: "poisson", nom: "poisson", fond: "#d7f0fb",
    svg: (
      <g>
        <path d="M70 50L90 34v32z" fill="#f2771b" />
        <ellipse cx="46" cy="50" rx="30" ry="19" fill="#ff9a3d" />
        <circle cx="30" cy="46" r="4.5" fill="#1d2433" />
      </g>
    ),
  },
  {
    id: "chat", nom: "chat", fond: "#ececec",
    svg: (
      <g>
        <path d="M22 40L26 14l18 14h12l18-14 4 26z" fill="#7d8597" />
        <circle cx="50" cy="54" r="30" fill="#7d8597" />
        <circle cx="39" cy="50" r="4.5" fill="#fff" />
        <circle cx="61" cy="50" r="4.5" fill="#fff" />
        <path d="M46 62h8l-4 5z" fill="#f4a3b5" />
      </g>
    ),
  },
  {
    id: "oiseau", nom: "oiseau", fond: "#dff4ff",
    svg: (
      <g>
        <ellipse cx="48" cy="56" rx="28" ry="22" fill="#2f8fd8" />
        <circle cx="66" cy="38" r="14" fill="#2f8fd8" />
        <path d="M78 38l12 4-12 4z" fill="#f0a400" />
        <circle cx="69" cy="35" r="3.5" fill="#1d2433" />
        <path d="M30 52q12 14 26 2" stroke="#1c6fae" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: "bateau", nom: "bateau", fond: "#d9ecff",
    svg: (
      <g>
        <path d="M50 14v50" stroke="#4a5878" strokeWidth="4" />
        <path d="M54 18l26 40H54z" fill="#ffffff" stroke="#4a5878" strokeWidth="3" strokeLinejoin="round" />
        <path d="M46 26L24 58h22z" fill="#c8322e" />
        <path d="M14 66h72l-12 16H26z" fill="#8a5a2b" />
      </g>
    ),
  },
  {
    id: "pomme", nom: "pomme", fond: "#ffe0de",
    svg: (
      <g>
        <path d="M50 30c-14-10-36-4-34 20 2 22 16 36 26 34 4-1 6-3 8-3s4 2 8 3c10 2 24-12 26-34 2-24-20-30-34-20z" fill="#d93b30" />
        <path d="M50 30c0-8 2-14 6-18" stroke="#8a5a2b" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M56 22c6-8 16-8 20-6-4 8-12 10-20 6z" fill="#2e9e5b" />
      </g>
    ),
  },
  {
    id: "nuage", nom: "nuage", fond: "#e6eefb",
    svg: <path d="M28 70a16 16 0 0 1 2-32 22 22 0 0 1 40-4 18 18 0 0 1 4 36z" fill="#ffffff" stroke="#7c95c9" strokeWidth="4" strokeLinejoin="round" />,
  },
  {
    id: "coeur", nom: "cœur", fond: "#ffe1e6",
    svg: <path d="M50 84C20 62 14 46 18 34c4-14 24-18 32-2 8-16 28-12 32 2 4 12-2 28-32 50z" fill="#e2445c" />,
  },
];

export const IMAGES_SECRETES = AVATARS.slice(0, 9);

export function dessin(id: string): Dessin {
  const base = id.split("-")[0];
  return AVATARS.find((a) => a.id === base) ?? AVATARS[0]!;
}

/** Variantes de couleur (anneau) pour qu'une classe de 36 élèves ait 36 images différentes. */
const ANNEAUX: Record<string, string> = { "2": "#1f5fbf", "3": "#c8322e" };

/** Toutes les images possibles, dans l'ordre où on les propose. */
export const TOUS_AVATARS = ["", "-2", "-3"].flatMap((v) => AVATARS.map((a) => a.id + v));

export function Avatar({ id, taille = 96 }: { id: string; taille?: number | string }) {
  const d = dessin(id);
  const anneau = ANNEAUX[id.split("-")[1] ?? ""];
  return (
    <svg viewBox="0 0 100 100" width={taille} height={taille} aria-hidden focusable="false">
      <circle cx="50" cy="50" r="49" fill={d.fond} />
      {anneau && <circle cx="50" cy="50" r="45" fill="none" stroke={anneau} strokeWidth="8" />}
      <g transform={anneau ? "translate(50 50) scale(0.82) translate(-50 -50)" : undefined}>{d.svg}</g>
    </svg>
  );
}
