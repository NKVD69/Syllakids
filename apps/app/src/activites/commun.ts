import type { FichierUnite, Profil } from "../types";

export interface PropsActivite {
  f: FichierUnite;
  profil: Profil;
  onFini: () => void;
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
