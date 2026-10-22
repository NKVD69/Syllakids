import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoutonRond } from "../composants/BoutonRond";
import { Coche, Gomme } from "../composants/Icones";
import { ENCOURAGEMENTS, TRACES, consigne } from "../contenu";
import { useSyllakids } from "../contexte";
import { evaluer, SOUPLESSE, type Etape, type Point, type Trait } from "../trace/evaluer";
import { auHasard, pause, type PropsActivite } from "./commun";
import { dessinerReglure, pointDepart, positionsNumeros, repereCase, repereLigne, tracerChemin, versModele, type Repere } from "../trace/dessin";

type Phase = "observer" | Etape;
const PHASES_6ANS: Phase[] = ["observer", "repasser", "guide", "libre"];
const PHASES_5ANS: Phase[] = ["observer", "repasser", "guide"];
const CONSIGNE: Record<Phase, string> = {
  observer: "CON-E1-OBSERVER",
  repasser: "CON-E1-REPASSER",
  guide: "CON-E1-GUIDE",
  libre: "CON-E1-LIBRE",
};
const ESSAIS_MAX = 3;
/** Nombre de lettres identiques sur la ligne, à chaque étape (comme une ligne de cahier). */
export const LETTRES_PAR_LIGNE = { "5ans": 3, "6ans": 5 } as const;
/** Durée de l'animation de la première lettre, par trait, puis apparition des suivantes. */
const MS_PAR_TRAIT = 1400;
const MS_PAR_COPIE = 350;

/**
 * E1 Trace la lettre : une ligne de lettres identiques, à chaque étape : observer, repasser,
 * tracer avec le point de départ, puis sans aide. L'enfant trace les lettres de la ligne l'une après l'autre.
 */
export function TraceLettre({ f, profil, onFini }: PropsActivite) {
  const { dire, conserver, progression } = useSyllakids();
  const lettres = useMemo(
    () => (f.unite.rang === 0 ? (profil === "5ans" ? ["A", "I"] : ["A", "I", "O", "É"]) : f.unite.graphemes.map((g) => g.g)),
    [f, profil],
  );
  const n = LETTRES_PAR_LIGNE[profil];
  const phases = profil === "5ans" ? PHASES_5ANS : PHASES_6ANS;
  const [iLettre, setILettre] = useState(0);
  const [iPhase, setIPhase] = useState(0);
  const [iCase, setICase] = useState(0);
  const [message, setMessage] = useState("");
  const lettre = lettres[iLettre]!;
  const phase = phases[iPhase]!;
  const modele = useMemo<Trait[]>(() => (TRACES[lettre]?.traits ?? []).map((t) => t.map(([x, y]) => [x, y] as const)), [lettre]);

  const canevas = useRef<HTMLCanvasElement>(null);
  const boite = useRef<HTMLDivElement>(null);
  const ligne = useRef<Repere>(repereLigne(900, 300, n));
  /** Traits de la lettre en cours (repère du modèle). */
  const traits = useRef<Point[][]>([]);
  /** Lettres déjà tracées sur la ligne, case par case. */
  const faites = useRef<Point[][][]>([]);
  const enCours = useRef<Point[] | null>(null);
  const caseRef = useRef(0);
  caseRef.current = iCase;
  const stylet = useRef(false);
  const essais = useRef(0);
  const minuteur = useRef<number | undefined>(undefined);
  const animation = useRef(Infinity);
  const occupe = useRef(false);

  const dessiner = useCallback(() => {
    const c = canevas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const l = ligne.current;
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.clearRect(0, 0, l.largeur, l.hauteur);
    dessinerReglure(ctx, l);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const courante = caseRef.current;
    // numéros des traits : assez écartés pour que les pastilles ne se recouvrent pas, quelle que soit la taille
    const numeros = positionsNumeros(modele, Math.max(16, 32 / l.s));

    // la case à tracer est légèrement colorée
    if (phase !== "observer" && courante < n) {
      const r = repereCase(l, courante);
      ctx.fillStyle = "rgba(31, 95, 191, 0.07)";
      ctx.fillRect(r.x0 - 14 * r.s, r.y0 - 32 * r.s, 128 * r.s, 152 * r.s);
    }

    for (let k = 0; k < n; k++) {
      const r = repereCase(l, k);
      if (phase === "observer") {
        // la première lettre se trace sous les yeux de l'enfant, les copies apparaissent ensuite
        const t = animation.current;
        const d0 = MS_PAR_TRAIT * modele.length;
        const avanceLettre = k === 0 ? Math.min(1, t / d0) : t >= d0 + MS_PAR_COPIE * k ? 1 : 0;
        if (avanceLettre <= 0) continue;
        ctx.strokeStyle = "#4a5878";
        ctx.lineWidth = Math.max(5, r.s * 7);
        modele.forEach((tr, j) => {
          const avance = Math.min(1, Math.max(0, avanceLettre * modele.length - j));
          if (avance > 0) tracerChemin(ctx, r, tr, avance);
        });
        if (k === 0) [...modele].reverse().forEach((tr, j) => {
          const i = modele.length - 1 - j;
          pointDepart(ctx, r, tr, modele.length > 1 ? i + 1 : undefined, numeros[i]);
        });
        continue;
      }
      if (phase === "repasser" && k >= courante) {
        ctx.strokeStyle = "#a8b4cf";
        ctx.lineWidth = Math.max(5, r.s * 7);
        ctx.setLineDash([r.s * 4, r.s * 5]);
        modele.forEach((tr) => tracerChemin(ctx, r, tr));
        ctx.setLineDash([]);
        if (k === courante) [...modele].reverse().forEach((tr, j) => {
          const i = modele.length - 1 - j;
          pointDepart(ctx, r, tr, modele.length > 1 ? i + 1 : undefined, numeros[i]);
        });
      }
      if (phase === "guide" && k === courante && modele[0]) {
        const i = Math.min(traits.current.length, modele.length - 1);
        pointDepart(ctx, r, modele[i]!, modele.length > 1 ? i + 1 : undefined);
      }
      // ce que l'enfant a tracé
      const siens = k < courante ? faites.current[k] ?? [] : k === courante ? [...traits.current, ...(enCours.current ? [enCours.current] : [])] : [];
      ctx.strokeStyle = "#1f5fbf";
      ctx.lineWidth = Math.max(6, r.s * 8);
      for (const tr of siens) if (tr.length > 1) tracerChemin(ctx, r, tr);
    }
  }, [modele, phase, n]);

  // dimensionner le canevas : une ligne de n lettres
  useEffect(() => {
    const ajuster = () => {
      const b = boite.current, c = canevas.current;
      if (!b || !c) return;
      const largeur = Math.min(b.clientWidth, 1000);
      const l0 = repereLigne(largeur, 10_000, n);
      const sMax = Math.max(0.4, (window.innerHeight - 280) / 200);
      const s = Math.min(l0.s, sMax);
      const hauteur = Math.max(170, Math.round(100 * s * 1.95));
      const dpr = window.devicePixelRatio || 1;
      c.width = largeur * dpr; c.height = hauteur * dpr;
      c.style.width = `${largeur}px`; c.style.height = `${hauteur}px`;
      ligne.current = repereLigne(largeur, hauteur, n);
      dessiner();
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, [dessiner, n]);

  // consigne et animation de chaque étape
  useEffect(() => {
    traits.current = [];
    faites.current = [];
    essais.current = 0;
    caseRef.current = 0;
    setICase(0);
    setMessage(consigne(CONSIGNE[phase]));
    void dire(phase === "repasser" || phase === "observer" ? CONSIGNE[phase] : profil === "5ans" ? "CON-E1-COURT" : CONSIGNE[phase]);
    if (phase !== "observer") {
      animation.current = Infinity;
      dessiner();
      return;
    }
    let debut: number | undefined;
    let id = 0;
    const duree = MS_PAR_TRAIT * modele.length + MS_PAR_COPIE * n;
    const pas = (t: number) => {
      debut ??= t;
      animation.current = t - debut;
      dessiner();
      if (animation.current < duree) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    const suite = window.setTimeout(() => setIPhase((p) => p + 1), duree + 1600);
    return () => { cancelAnimationFrame(id); clearTimeout(suite); };
  }, [phase, lettre, modele.length, dessiner, dire, profil, n]);

  useEffect(() => dessiner(), [iCase, dessiner]);

  /** Passe à la lettre suivante de la ligne, ou à l'étape suivante quand la ligne est finie. */
  async function caseSuivante() {
    faites.current[caseRef.current] = traits.current;
    traits.current = [];
    essais.current = 0;
    const k = caseRef.current + 1;
    if (k < n) {
      caseRef.current = k;
      setICase(k);
      return;
    }
    caseRef.current = n;
    setICase(n);
    // la ligne écrite à la dernière étape est gardée si l'accord le permet
    if (iPhase === phases.length - 1) conserver({ type: "trace", item: `lettre:${lettre}`, traits: faites.current.map((c) => c.map((t) => [...t])) });
    await dire(auHasard(ENCOURAGEMENTS));
    await pause(400);
    avancer();
  }

  async function verifier() {
    if (occupe.current || phase === "observer" || caseRef.current >= n) return;
    occupe.current = true;
    const r = evaluer(modele, traits.current, phase, progression.reglages.traceSouple ? SOUPLESSE : 1);
    if (r.ok) {
      setMessage(consigne("CON-TR-13"));
      await pause(250);
      await caseSuivante();
    } else {
      essais.current += 1;
      setMessage(consigne(r.message));
      await dire(r.message);
      await pause(500);
      if (essais.current >= ESSAIS_MAX) await caseSuivante();
      else {
        traits.current = [];
        dessiner();
      }
    }
    occupe.current = false;
  }

  function avancer() {
    if (iPhase + 1 < phases.length) setIPhase(iPhase + 1);
    else if (iLettre + 1 < lettres.length) { setILettre(iLettre + 1); setIPhase(0); }
    else onFini();
  }

  const position = (e: React.PointerEvent<HTMLCanvasElement>): Point[] => {
    const rect = e.currentTarget.getBoundingClientRect();
    const r = repereCase(ligne.current, caseRef.current);
    const evts = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    return (evts.length ? evts : [e.nativeEvent]).map((ev) => versModele(r, ev.clientX - rect.left, ev.clientY - rect.top));
  };

  const r = repereCase(ligne.current, Math.min(iCase, n - 1));
  return (
    <div className="scene" style={{ gap: 10, paddingTop: 12, paddingBottom: 12 }}>
      <div ref={boite} style={{ width: "100%", display: "grid", placeItems: "center" }}>
        <canvas
          ref={canevas}
          className="zone-trace"
          aria-label={`Ligne pour tracer ${n} fois la lettre ${lettre}, lettre ${Math.min(iCase + 1, n)} sur ${n}`}
          data-case={iCase}
          data-s={r.s}
          data-x0={r.x0}
          data-y0={r.y0}
          onPointerDown={(e) => {
            if (phase === "observer" || occupe.current || caseRef.current >= n) return;
            if (e.pointerType === "pen") stylet.current = true;
            if (stylet.current && e.pointerType === "touch") return; // rejet de la paume
            e.currentTarget.setPointerCapture(e.pointerId);
            clearTimeout(minuteur.current);
            enCours.current = position(e);
            dessiner();
          }}
          onPointerMove={(e) => {
            if (!enCours.current) return;
            enCours.current.push(...position(e));
            dessiner();
          }}
          onPointerUp={() => {
            if (!enCours.current) return;
            traits.current.push(enCours.current);
            enCours.current = null;
            dessiner();
            if (traits.current.length >= modele.length) {
              minuteur.current = window.setTimeout(verifier, 700);
            }
          }}
        />
      </div>
      <p className="message" aria-live="polite">{message}</p>
      <div className="actions">
        <BoutonRond nom="Effacer" onClick={() => { traits.current = []; dessiner(); }} desactive={phase === "observer"}><Gomme /></BoutonRond>
        <BoutonRond nom="J'ai fini" variante="principal" onClick={verifier} desactive={phase === "observer"}><Coche /></BoutonRond>
      </div>
    </div>
  );
}
