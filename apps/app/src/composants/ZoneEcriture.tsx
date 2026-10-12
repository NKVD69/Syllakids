import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { calculerRepere, dessinerReglure, tracerChemin, versModele, type Repere } from "../trace/dessin";
import type { Point, Trait } from "../trace/evaluer";

export interface PoigneeEcriture {
  traits: () => Point[][];
  effacer: () => void;
}

interface Props {
  largeur: number;
  hauteur: number;
  /** Modèle affiché en gris clair, pour aider ou corriger. */
  fantome?: readonly Trait[];
  etat?: "juste" | "faux";
  nom: string;
  ref?: Ref<PoigneeEcriture>;
}

/** Case d'écriture au doigt ou au stylet, dans le repère des modèles de lettres. */
export function ZoneEcriture({ largeur, hauteur, fantome, etat, nom, ref }: Props) {
  const canevas = useRef<HTMLCanvasElement>(null);
  const traits = useRef<Point[][]>([]);
  const enCours = useRef<Point[] | null>(null);
  const stylet = useRef(false);
  const repere = useRef<Repere>(calculerRepere(largeur, hauteur));

  const dessiner = useCallback(() => {
    const c = canevas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const r = repere.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.largeur, r.hauteur);
    dessinerReglure(ctx, r, false);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (fantome) {
      ctx.strokeStyle = "#c3cbe0";
      ctx.lineWidth = Math.max(5, r.s * 7);
      fantome.forEach((t) => tracerChemin(ctx, r, t));
    }
    ctx.strokeStyle = etat === "faux" ? "#c8322e" : etat === "juste" ? "#2e9e5b" : "#1f5fbf";
    ctx.lineWidth = Math.max(5, r.s * 8);
    for (const t of [...traits.current, ...(enCours.current ? [enCours.current] : [])]) if (t.length > 1) tracerChemin(ctx, r, t);
  }, [fantome, etat]);

  useEffect(() => {
    const c = canevas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = largeur * dpr;
    c.height = hauteur * dpr;
    repere.current = calculerRepere(largeur, hauteur);
    dessiner();
  }, [largeur, hauteur, dessiner]);

  useImperativeHandle(ref, () => ({
    traits: () => traits.current,
    effacer: () => {
      traits.current = [];
      dessiner();
    },
  }), [dessiner]);

  const points = (e: React.PointerEvent<HTMLCanvasElement>): Point[] => {
    const rect = e.currentTarget.getBoundingClientRect();
    const evts = e.nativeEvent.getCoalescedEvents?.() ?? [];
    return (evts.length ? evts : [e.nativeEvent]).map((ev) => versModele(repere.current, ev.clientX - rect.left, ev.clientY - rect.top));
  };

  return (
    <canvas
      ref={canevas}
      className={`zone-trace case-ecriture ${etat ?? ""}`}
      style={{ width: largeur, height: hauteur }}
      aria-label={nom}
      onPointerDown={(e) => {
        if (e.pointerType === "pen") stylet.current = true;
        if (stylet.current && e.pointerType === "touch") return;
        e.currentTarget.setPointerCapture(e.pointerId);
        enCours.current = points(e);
        dessiner();
      }}
      onPointerMove={(e) => {
        if (!enCours.current) return;
        enCours.current.push(...points(e));
        dessiner();
      }}
      onPointerUp={() => {
        if (!enCours.current) return;
        traits.current.push(enCours.current);
        enCours.current = null;
        dessiner();
      }}
    />
  );
}
