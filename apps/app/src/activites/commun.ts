import { useEffect } from "react";
import type { FichierUnite, Profil } from "../types";

export interface PropsActivite {
  f: FichierUnite;
  profil: Profil;
  onFini: () => void;
  /** Avancement à l'intérieur de l'activité (0 à 1), affiché dans la barre du haut. */
  avancer?: (fraction: number) => void;
}

/** Signale l'avancement de l'activité : `fait` éléments terminés sur `total`. */
export function useAvancement(avancer: PropsActivite["avancer"], fait: number, total: number) {
  useEffect(() => {
    avancer?.(total > 0 ? Math.min(1, Math.max(0, fait / total)) : 0);
  }, [avancer, fait, total]);
}

export function melanger<T>(t: readonly T[]): T[] {
  const r = [...t];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

export const auHasard = <T,>(t: readonly T[]): T => t[Math.floor(Math.random() * t.length)]!;
export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
