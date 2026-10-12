/**
 * Choix du profil quand plusieurs enfants utilisent l'appareil :
 * l'enfant touche son image ; sur la tablette de la classe, il touche ensuite ses 3 images secrètes.
 */
import { useEffect, useRef, useState } from "react";
import { naviguer } from "../App";
import type { ProfilEnfant } from "../appareil";
import { Avatar, IMAGES_SECRETES } from "../composants/Avatars";
import { BoutonRond } from "../composants/BoutonRond";
import { Cadenas, Maison } from "../composants/Icones";
import { useSyllakids } from "../contexte";

function ImagesSecretes({ profil, onRetour }: { profil: ProfilEnfant; onRetour: () => void }) {
  const { choisirProfil, dire } = useSyllakids();
  const attendu = (profil.codeImages ?? "").split("-").map(Number);
  const [touchees, setTouchees] = useState<number[]>([]);
  const erreurs = useRef(0);

  useEffect(() => void dire("CON-GEN-03"), [dire]);

  const toucher = (k: number) => {
    const n = [...touchees, k];
    setTouchees(n);
    if (n.length < 3) return;
    if (n.every((x, i) => x === attendu[i])) {
      void dire("CON-GEN-05");
      choisirProfil(profil.id);
      return;
    }
    erreurs.current++;
    void dire(erreurs.current >= 2 ? "CON-GEN-13" : "CON-GEN-04");
    window.setTimeout(() => setTouchees([]), 700);
  };

  return (
    <div className="scene">
      <Avatar id={profil.avatar} taille="13vmin" />
      <div className="points-secrets" aria-label={`${touchees.length} images touchées sur 3`}>
        {[0, 1, 2].map((k) => <span key={k} className={k < touchees.length ? "plein" : ""} />)}
      </div>
      <div className="grille-secrete">
        {IMAGES_SECRETES.map((img, k) => (
          <button key={img.id} type="button" aria-label={`Image ${img.nom}`} onClick={() => toucher(k)} disabled={touchees.length >= 3}>
            <Avatar id={img.id} taille="100%" />
          </button>
        ))}
      </div>
      <BoutonRond nom="Revenir au choix des enfants" variante="petit" onClick={onRetour}><Maison /></BoutonRond>
    </div>
  );
}

export function QuiEsTu() {
  const { appareil, choisirProfil, dire } = useSyllakids();
  const [choisi, setChoisi] = useState<ProfilEnfant | null>(null);
  const classe = appareil.mode === "classe";

  useEffect(() => {
    if (!choisi) void dire("CON-GEN-02");
  }, [choisi, dire]);

  return (
    <>
      <header className="barre">
        <span className="logo" aria-label="Syllakids"><span className="s1">SYLLA</span><span className="s2">KIDS</span></span>
        {classe && appareil.classe && <span className="nom-classe">{appareil.classe.nom}</span>}
        <span className="espace" />
        <BoutonRond nom="Espace adulte" variante="petit" onClick={() => naviguer("#/adulte")}><Cadenas /></BoutonRond>
      </header>
      <main className="cahier" style={{ flex: 1, display: "flex" }}>
        {choisi ? (
          <ImagesSecretes profil={choisi} onRetour={() => setChoisi(null)} />
        ) : (
          <div className="scene">
            <ul className="choix-profils" aria-label="Qui es-tu ?">
              {appareil.profils.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-label={p.prenom || "Enfant"}
                    onClick={() => (classe && p.codeImages ? setChoisi(p) : choisirProfil(p.id))}
                  >
                    <Avatar id={p.avatar} taille="100%" />
                    <span className="prenom">{p.prenom}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
