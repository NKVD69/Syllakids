import type { ReactNode } from "react";

interface Props {
  /** Nom lu par les lecteurs d'écran (l'enfant, lui, ne lit pas ce texte). */
  nom: string;
  onClick?: () => void;
  children: ReactNode;
  variante?: "principal" | "petit" | "actif";
  desactive?: boolean;
}

export function BoutonRond({ nom, onClick, children, variante, desactive }: Props) {
  return (
    <button type="button" className={`bouton-rond ${variante ?? ""}`} aria-label={nom} title={nom} onClick={onClick} disabled={desactive}>
      {children}
    </button>
  );
}
