import { naviguer } from "../App";
import { BoutonRond } from "../composants/BoutonRond";
import { Cadenas, Coche, Etoile } from "../composants/Icones";
import { UNITES } from "../contenu";
import { useSyllakids } from "../contexte";
import { estOuverte } from "../progression";

const ORDRE = UNITES.map((u) => u.unite.id);

export function Chemin() {
  const { progression, dire } = useSyllakids();
  const courante = ORDRE.find((id) => !progression.terminees.includes(id) && estOuverte(progression, ORDRE, id));
  const max5ans = progression.reglages.profil === "5ans" ? 9 : 14;

  return (
    <>
      <header className="barre">
        <span className="logo" aria-label="Syllakids"><span className="s1">SYLLA</span><span className="s2">KIDS</span></span>
        <span className="espace" />
        <BoutonRond nom="Espace adulte" variante="petit" onClick={() => naviguer("#/adulte")}><Cadenas /></BoutonRond>
      </header>
      <main className="cahier" style={{ flex: 1 }}>
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
                  onClick={() => (ouverte ? naviguer(`#/unite/${u.id}`) : dire("CON-PROG-06"))}
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
      </main>
    </>
  );
}
