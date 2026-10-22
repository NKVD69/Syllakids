import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoutonRond } from "../composants/BoutonRond";
import { Coche, Gomme } from "../composants/Icones";
import { ENCOURAGEMENTS, TRACES, consigne } from "../contenu";
import { useSyllakids } from "../contexte";
import { evaluer, SOUPLESSE, type Etape, type Point, type Trait } from "../trace/evaluer";
import { auHasard, pause, type PropsActivite } from "./commun";
import { calculerRepere, dessinerReglure, pointDepart, positionsNumeros, tracerChemin, versModele, type Repere } from "../trace/dessin";

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

/** E1 Trace la lettre : observer, repasser, tracer avec le point de départ, puis sans aide. */
export function TraceLettre({ f, profil, onFini }: PropsActivite) {
  const { dire, conserver, progression } = useSyllakids();
  const lettres = useMemo(
    () => (f.unite.rang === 0 ? (profil === "5ans" ? ["A", "I"] : ["A", "I", "O", "É"]) : f.unite.graphemes.map((g) => g.g)),
    [f, profil],
  );
  const phases = profil === "5ans" ? PHASES_5ANS : PHASES_6ANS;
  const [iLettre, setILettre] = useState(0);
  const [iPhase, setIPhase] = useState(0);
  const [message, setMessage] = useState("");
  const lettre = lettres[iLettre]!;
  const phase = phases[iPhase]!;
  const modele = useMemo<Trait[]>(() => (TRACES[lettre]?.traits ?? []).map((t) => t.map(([x, y]) => [x, y] as const)), [lettre]);

  const canevas = useRef<HTMLCanvasElement>(null);
  const boite = useRef<HTMLDivElement>(null);
  const repere = useRef<Repere>(calculerRepere(600, 460));
  const traits = useRef<Point[][]>([]);
  const enCours = useRef<Point[] | null>(null);
  const stylet = useRef(false);
  const essais = useRef(0);
  const minuteur = useRef<number | undefined>(undefined);
  const animation = useRef(1);
  const occupe = useRef(false);

  const dessiner = useCallback(() => {
    const c = canevas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const r = repere.current;
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.clearRect(0, 0, r.largeur, r.hauteur);
    dessinerReglure(ctx, r);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (phase === "observer" || phase === "repasser") {
      ctx.strokeStyle = phase === "observer" ? "#4a5878" : "#a8b4cf";
      ctx.lineWidth = Math.max(6, r.s * 7);
      ctx.setLineDash(phase === "repasser" ? [r.s * 4, r.s * 5] : []);
      const total = modele.length;
      modele.forEach((t, k) => {
        const avance = phase === "observer" ? Math.min(1, Math.max(0, animation.current * total - k)) : 1;
        if (avance > 0) tracerChemin(ctx, r, t, avance);
      });
      ctx.setLineDash([]);
      const places = positionsNumeros(modele);
      // du dernier au premier : le « 1 » reste toujours visible au-dessus
      [...modele].reverse().forEach((t, j) => {
        const k = total - 1 - j;
        pointDepart(ctx, r, t, total > 1 ? k + 1 : undefined, places[k]);
      });
    } else if (phase === "guide" && modele[0]) {
      const k = Math.min(traits.current.length, modele.length - 1);
      pointDepart(ctx, r, modele[k]!, modele.length > 1 ? k + 1 : undefined);
    }
    ctx.strokeStyle = "#1f5fbf";
    ctx.lineWidth = Math.max(8, r.s * 8);
    for (const t of [...traits.current, ...(enCours.current ? [enCours.current] : [])]) if (t.length > 1) tracerChemin(ctx, r, t);
  }, [modele, phase]);

  // dimensionner le canevas
  useEffect(() => {
    const ajuster = () => {
      const b = boite.current, c = canevas.current;
      if (!b || !c) return;
      const largeur = Math.min(b.clientWidth, 720);
      const hauteur = Math.max(260, Math.min(window.innerHeight - 290, largeur * 0.8));
      const dpr = window.devicePixelRatio || 1;
      c.width = largeur * dpr; c.height = hauteur * dpr;
      c.style.width = `${largeur}px`; c.style.height = `${hauteur}px`;
      repere.current = calculerRepere(largeur, hauteur);
      dessiner();
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, [dessiner]);

  // consigne et animation de la phase
  useEffect(() => {
    traits.current = [];
    setMessage(consigne(CONSIGNE[phase]));
    void dire(phase === "repasser" || phase === "observer" ? CONSIGNE[phase] : profil === "5ans" ? "CON-E1-COURT" : CONSIGNE[phase]);
    if (phase !== "observer") {
      animation.current = 1;
      dessiner();
      return;
    }
    let debut: number | undefined;
    let id = 0;
    const duree = 1400 * modele.length;
    const pas = (t: number) => {
      debut ??= t;
      animation.current = Math.min(1, (t - debut) / duree);
      dessiner();
      if (animation.current < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    const suite = window.setTimeout(() => setIPhase((p) => p + 1), duree + 1600);
    return () => { cancelAnimationFrame(id); clearTimeout(suite); };
  }, [phase, lettre, modele.length, dessiner, dire, profil]);

  async function verifier() {
    if (occupe.current || phase === "observer") return;
    occupe.current = true;
    const r = evaluer(modele, traits.current, phase, progression.reglages.traceSouple ? SOUPLESSE : 1);
    // la lettre écrite à la dernière étape (sans aide, ou guidée à 5 ans) est gardée si l'accord le permet
    if (iPhase === phases.length - 1 && essais.current === 0) {
      conserver({ type: "trace", item: `lettre:${lettre}`, traits: [traits.current.map((t) => [...t])] });
    }
    if (r.ok) {
      essais.current = 0;
      setMessage(consigne("CON-TR-13"));
      await dire(auHasard(ENCOURAGEMENTS));
      await pause(400);
      avancer();
    } else {
      essais.current += 1;
      setMessage(consigne(r.message));
      await dire(r.message);
      await pause(500);
      traits.current = [];
      dessiner();
      if (essais.current >= ESSAIS_MAX) {
        essais.current = 0;
        avancer();
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
    const evts = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    return (evts.length ? evts : [e.nativeEvent]).map((ev) => versModele(repere.current, ev.clientX - rect.left, ev.clientY - rect.top));
  };

  return (
    <div className="scene" style={{ gap: 10, paddingTop: 12, paddingBottom: 12 }}>
      <div ref={boite} style={{ width: "100%", display: "grid", placeItems: "center" }}>
        <canvas
          ref={canevas}
          className="zone-trace"
          aria-label={`Zone pour tracer la lettre ${lettre}`}
          onPointerDown={(e) => {
            if (phase === "observer" || occupe.current) return;
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
