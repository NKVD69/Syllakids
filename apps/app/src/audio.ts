/**
 * Lecture des sons.
 * 1. Fichier enregistré : audio/<id>.m4a (contenu généré par IA, consignes enregistrées par le développeur).
 * 2. En attendant les fichiers : synthèse vocale du navigateur, à titre provisoire seulement.
 *    Elle prononce mal les phonèmes isolés : ne jamais publier avec ce repli.
 */
const cache = new Map<string, HTMLAudioElement | null>();
let enCours: HTMLAudioElement | null = null;

function voixFrancaise(): SpeechSynthesisVoice | undefined {
  const voix = window.speechSynthesis?.getVoices() ?? [];
  return voix.find((v) => v.lang === "fr-FR") ?? voix.find((v) => v.lang.startsWith("fr"));
}

function arreter() {
  enCours?.pause();
  enCours = null;
  window.speechSynthesis?.cancel();
}

async function fichier(id: string): Promise<HTMLAudioElement | null> {
  if (cache.has(id)) return cache.get(id)!;
  const url = `./audio/${id}.m4a`;
  try {
    const r = await fetch(url, { method: "HEAD" });
    const a = r.ok && (r.headers.get("content-type") ?? "").startsWith("audio") ? new Audio(url) : null;
    cache.set(id, a);
    return a;
  } catch {
    cache.set(id, null);
    return null;
  }
}

export interface OptionsLecture {
  /** Texte à dire si le fichier n'existe pas encore. */
  texte: string;
  /** Appelé à chaque mot prononcé (karaoké), quand le moteur le permet. */
  surMot?: (indexCaractere: number) => void;
  lent?: boolean;
}

export async function jouer(id: string, options: OptionsLecture): Promise<void> {
  arreter();
  const a = await fichier(id);
  if (a) {
    enCours = a;
    a.currentTime = 0;
    await new Promise<void>((fin) => {
      a.onended = () => fin();
      a.onerror = () => fin();
      a.play().catch(() => fin());
    });
    return;
  }
  if (!("speechSynthesis" in window)) return;
  await new Promise<void>((resolu) => {
    // garde-fou : certains moteurs ne signalent jamais la fin de la lecture
    const garde = window.setTimeout(() => resolu(), 1500 + options.texte.length * 110);
    const fin = () => {
      clearTimeout(garde);
      resolu();
    };
    const u = new SpeechSynthesisUtterance(options.texte.toLocaleLowerCase("fr-FR"));
    u.lang = "fr-FR";
    const v = voixFrancaise();
    if (v) u.voice = v;
    u.rate = options.lent ? 0.7 : 0.9;
    u.onboundary = (e) => options.surMot?.(e.charIndex);
    u.onend = () => fin();
    u.onerror = () => fin();
    window.speechSynthesis.speak(u);
  });
}

/** Approximation provisoire d'un phonème isolé pour la synthèse vocale. */
export function texteDuSon(grapheme: string, type: string): string {
  if (type === "voyelle") return grapheme;
  return `${grapheme}${grapheme}${grapheme}`; // à remplacer par le fichier du phonème
}
