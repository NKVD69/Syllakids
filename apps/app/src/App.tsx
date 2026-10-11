import { useEffect, useState } from "react";
import { useSyllakids } from "./contexte";
import { Chemin } from "./ecrans/Chemin";
import { EspaceAdulte } from "./ecrans/EspaceAdulte";
import { EcranUnite } from "./ecrans/EcranUnite";

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
  const { progression } = useSyllakids();

  useEffect(() => {
    document.body.classList.toggle("dys", progression.reglages.dys);
  }, [progression.reglages.dys]);

  const unite = route.match(/^#\/unite\/(U\d{2})$/);
  if (unite) return <EcranUnite key={unite[1]} id={unite[1]!} />;
  if (route === "#/adulte") return <EspaceAdulte />;
  return <Chemin />;
}
