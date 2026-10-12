/**
 * Voix et lettres tracées de l'enfant, gardées sur l'appareil seulement avec l'accord des parents
 * (3 mois au plus), puis envoyées à l'enseignant si le partage est accepté (documents RGPD, T3).
 * Stockage IndexedDB (les enregistrements sont trop lourds pour localStorage).
 */
import type { Point } from "./trace/evaluer";

export interface Production {
  id: string;
  enfant: string;
  type: "voix" | "trace";
  /** Identifiant de l'item lu ou écrit (U07-M-VA), ou « lettre:M » pour le tracé d'une lettre. */
  item: string;
  /** Date ISO 8601. */
  le: string;
  mime?: string;
  audio?: Blob;
  /** Tracé : une case par lettre, chaque case est une liste de traits (coordonnées du modèle). */
  traits?: Point[][][];
  envoye: boolean;
}

/** Durée de conservation sur l'appareil. */
export const CONSERVATION_JOURS = 90;

export function estPerimee(p: Pick<Production, "le">, maintenant = new Date()): boolean {
  return new Date(p.le).getTime() < maintenant.getTime() - CONSERVATION_JOURS * 86_400_000;
}

const BASE = "syllakids";
const MAGASIN = "productions";

function ouvrir(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      if (typeof indexedDB === "undefined") return ok(null);
      const r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = () => {
        const s = r.result.createObjectStore(MAGASIN, { keyPath: "id" });
        s.createIndex("enfant", "enfant");
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

async function operation<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await ouvrir();
  if (!db) return undefined;
  return new Promise((ok) => {
    const tx = db.transaction(MAGASIN, mode);
    const req = f(tx.objectStore(MAGASIN));
    tx.oncomplete = () => {
      db.close();
      ok(req ? req.result : undefined);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      ok(undefined);
    };
  });
}

export async function ajouterProduction(p: Production): Promise<void> {
  await operation("readwrite", (s) => s.put(p));
}

export async function productionsDe(enfant: string): Promise<Production[]> {
  const r = await operation<Production[]>("readonly", (s) => s.index("enfant").getAll(enfant));
  return (r ?? []).sort((a, b) => b.le.localeCompare(a.le));
}

export async function marquerEnvoyee(id: string): Promise<void> {
  const db = await ouvrir();
  if (!db) return;
  await new Promise<void>((ok) => {
    const tx = db.transaction(MAGASIN, "readwrite");
    const s = tx.objectStore(MAGASIN);
    const g = s.get(id);
    g.onsuccess = () => {
      if (g.result) s.put({ ...g.result, envoye: true });
    };
    tx.oncomplete = tx.onerror = tx.onabort = () => {
      db.close();
      ok();
    };
  });
}

/** Efface les productions d'un enfant (retrait de l'accord, profil retiré de l'appareil). */
export async function effacerProductions(enfant: string): Promise<void> {
  const ids = (await productionsDe(enfant)).map((p) => p.id);
  if (ids.length) await operation("readwrite", (s) => void ids.forEach((id) => s.delete(id)));
}

/** Efface ce qui a plus de 3 mois. */
export async function purgerProductions(maintenant = new Date()): Promise<void> {
  const toutes = (await operation<Production[]>("readonly", (s) => s.getAll())) ?? [];
  const perimees = toutes.filter((p) => estPerimee(p, maintenant)).map((p) => p.id);
  if (perimees.length) await operation("readwrite", (s) => void perimees.forEach((id) => s.delete(id)));
}

export function versBase64(b: Blob): Promise<string> {
  return new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => ko(r.error);
    r.readAsDataURL(b);
  });
}

export function depuisBase64(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const octets = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
  return new Blob([octets], { type: mime });
}
