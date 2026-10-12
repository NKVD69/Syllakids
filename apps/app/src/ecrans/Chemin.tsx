import { useEffect } from "react";
import { naviguer } from "../App";
import { Avatar } from "../composants/Avatars";
import { BoutonRond } from "../composants/BoutonRond";
import { Cadenas, Coche, Etoile } from "../composants/Icones";
import { UNITES } from "../contenu";
import { useSyllakids } from "../contexte";
import { estOuverte, tempsDuJour } from "../progression";
import { jour } from "../revisions";

const ORDRE = UNITES.map((u) => u.unite.id);

export function Chemin() {
  const { progression, dire, appareil, profil, choisirProfil } = useSyllakids();
  // durée maximale par jour, réglée par l'adulte : on s'arrête là pour aujourd'hui
  const dureeMax = progression.reglages.dureeMax ?? 0;
  const pause = dureeMax > 0 && tempsDuJour(progression, jour()) >= dureeMax * 60;
  useEffect(() => {
    if (pause) void dire("CON-GEN-12");
  }, [pause, dire]);
  const courante = ORDRE.find((id) => !progression.terminees.includes(id) && estOuverte(progression, ORDRE, id));
  const max5ans = progression.reglages.profil === "5ans" ? 9 : 14;

  return (
    <>
      <header className="barre">
        <span className="logo" aria-label="Syllakids"><span className="s1">SYLLA</span><span className="s2">KIDS</span></span>
        <span className="espace" />
        {appareil.profils.length > 1 && profil && (
          <button type="button" className="avatar-barre" aria-label={`Changer d'enfant (${profil.prenom || "enfant"})`} onClick={() => choisirProfil(null)}>
            <Avatar id={profil.avatar} taille={56} />
          </button>
        )}
        <BoutonRond nom="Espace adulte" variante="petit" onClick={() => naviguer("#/adulte")}><Cadenas /></BoutonRond>
      </header>
      <main className={`cahier${pause ? " en-pause" : ""}`} style={{ flex: 1 }}>
        <ol className="chemin" aria-label="Chemin des sons">
          {UNITES.filter((u) => u.unite.rang <= max5ans).map(({ unite: u }) => {
            const ouverte = estOuverte(progression, ORDRE, u.id);
            const faite = progression.terminees.includes(u.id);
            const classe = ["etape", u.bloc === "voyelles" ? "voyelles" : "", !ouverte ? "fermee" : "", u.id === courante ? "courante" : ""].join(" ");
            const nom = u.bloc === "bilan" ? "Bilan de lecture" : `Son ${u.titre}`;
            return (
              <li key={u.id} style={{ listStyle: "none" }}>
                <button
                  type="button"
                  className={classe}
                  aria-label={ouverte ? nom : `${nom}, pas encore ouvert`}
                  onClick={() => (pause ? dire("CON-GEN-12") : ouverte ? naviguer(`#/unite/${u.id}`) : dire("CON-PROG-06"))}
                  style={{ width: "100%" }}
                >
                  {u.bloc === "voyelles" ? "AEIOU" : u.bloc === "bilan" ? <Etoile /> : u.titre}
                  {faite && <span className="badge"><Coche /></span>}
                  {ouverte && !faite && u.bloc !== "bilan" && (
                    <span className="seances" aria-hidden>
                      {[0, 1].map((k) => <i key={k} className={(progression.seances[u.id] ?? 0) > k ? "faite" : ""} />)}
                    </span>
                  )}
                  {!ouverte && <span className="badge"><Cadenas /></span>}
                </button>
              </li>
            );
          })}
        </ol>
        {pause && (
          <button type="button" className="pause-du-jour" aria-label="C'est fini pour aujourd'hui" onClick={() => void dire("CON-GEN-12")}>
            <Avatar id="lune" taille="100%" />
          </button>
        )}
      </main>
    </>
  );
}
