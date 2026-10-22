import { useEffect, useState } from "react";
import { reglerVoix } from "./audio";
import { useSyllakids } from "./contexte";
import { Chemin } from "./ecrans/Chemin";
import { EspaceAdulte } from "./ecrans/EspaceAdulte";
import { EcranUnite } from "./ecrans/EcranUnite";
import { Parametres } from "./ecrans/Parametres";
import { QuiEsTu } from "./ecrans/QuiEsTu";

function useRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const f = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return hash;
}

export function naviguer(chemin: string) {
  window.location.hash = chemin;
}

export function App() {
  const route = useRoute();
  const { progression, profil, appareil } = useSyllakids();
  const r = progression.reglages;
  const o = appareil.options ?? {};

  // réglages d'affichage : classes sur le corps de page, lues par la feuille de style
  // (sur l'écran des paramètres, l'aperçu porte lui-même les réglages de l'enfant choisi)
  const parametres = route === "#/parametres";
  useEffect(() => {
    const b = document.body.classList;
    b.toggle("dys", !parametres && r.dys);
    b.toggle("sans-couleurs", !parametres && r.couleurs === false);
    b.toggle("sans-arcs", !parametres && r.arcs === false);
    b.toggle("grand-texte", !parametres && !!r.grandTexte);
    b.toggle("sans-regle", o.regle === false);
  }, [parametres, r.dys, r.couleurs, r.arcs, r.grandTexte, o.regle]);

  useEffect(() => reglerVoix(!!o.voixLente), [o.voixLente]);

  if (route.startsWith("#/adulte")) return <EspaceAdulte route={route} />;
  if (route === "#/parametres") return <Parametres />;
  if (!profil) return <QuiEsTu />;
  const unite = route.match(/^#\/unite\/(U\d{2})$/);
  if (unite) return <EcranUnite key={`${profil.id}-${unite[1]}`} id={unite[1]!} />;
  return <Chemin />;
}
