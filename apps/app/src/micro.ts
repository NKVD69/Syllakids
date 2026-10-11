/**
 * Micro : enregistrement court de la voix de l'enfant (activité R1) et niveau sonore (activité R2).
 * Rien n'est envoyé : les enregistrements restent en mémoire, sur l'appareil, le temps de l'activité.
 */
export async function ouvrirMicro(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return null;
  }
}

export function fermerMicro(flux: MediaStream | null) {
  flux?.getTracks().forEach((t) => t.stop());
}

/** Mesure le volume (0 à 1) du flux à intervalles réguliers. Renvoie une fonction d'arrêt. */
export function suivreNiveau(flux: MediaStream, surNiveau: (niveau: number) => void): () => void {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(flux);
  const analyseur = ctx.createAnalyser();
  analyseur.fftSize = 1024;
  source.connect(analyseur);
  const donnees = new Float32Array(analyseur.fftSize);
  let actif = true;
  const boucle = () => {
    if (!actif) return;
    analyseur.getFloatTimeDomainData(donnees);
    let somme = 0;
    for (const v of donnees) somme += v * v;
    surNiveau(Math.min(1, Math.sqrt(somme / donnees.length) * 4));
    requestAnimationFrame(boucle);
  };
  void ctx.resume().then(boucle);
  return () => {
    actif = false;
    source.disconnect();
    void ctx.close();
  };
}

export const SEUIL_VOIX = 0.06;

/** Enregistre jusqu'à 5 secondes ; s'arrête seul après un silence qui suit la parole. */
export function enregistrer(flux: MediaStream, surNiveau?: (n: number) => void, dureeMax = 5000): Promise<Blob | null> {
  return new Promise((resolu) => {
    if (typeof MediaRecorder === "undefined") return resolu(null);
    const morceaux: Blob[] = [];
    const rec = new MediaRecorder(flux);
    let parle = false;
    let dernierSon = performance.now();
    const debut = performance.now();
    const arreterNiveau = suivreNiveau(flux, (n) => {
      surNiveau?.(n);
      const t = performance.now();
      if (n > SEUIL_VOIX) {
        parle = true;
        dernierSon = t;
      }
      if (rec.state === "recording" && ((parle && t - dernierSon > 900) || t - debut > dureeMax)) rec.stop();
    });
    rec.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
    rec.onstop = () => {
      arreterNiveau();
      resolu(morceaux.length ? new Blob(morceaux, { type: rec.mimeType }) : null);
    };
    rec.start();
  });
}

export function lireEnregistrement(blob: Blob): Promise<void> {
  return new Promise((fin) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    const terminer = () => {
      URL.revokeObjectURL(url);
      fin();
    };
    a.onended = terminer;
    a.onerror = terminer;
    a.play().catch(terminer);
  });
}
