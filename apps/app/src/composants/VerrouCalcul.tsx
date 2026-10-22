/** Accès réservé aux adultes : un calcul de CE1 (voir verrou.ts). */
import { useEffect, useState } from "react";
import { ATTENTE_MS, ESSAIS_AVANT_ATTENTE, questionCE1 } from "../verrou";

export function VerrouCalcul({ titre, onOuvert }: { titre: string; onOuvert: () => void }) {
  const [question, setQuestion] = useState(() => questionCE1());
  const [reponse, setReponse] = useState("");
  const [erreurs, setErreurs] = useState(0);
  const [attente, setAttente] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (attente <= 0) return;
    const t = window.setTimeout(() => setAttente((a) => Math.max(0, a - 1000)), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  return (
    <form
      className="verrou"
      onSubmit={(e) => {
        e.preventDefault();
        if (attente > 0 || reponse.trim() === "") return;
        if (Number(reponse) === question.reponse) return onOuvert();
        const n = erreurs + 1;
        setErreurs(n);
        setReponse("");
        setQuestion(questionCE1());
        if (n % ESSAIS_AVANT_ATTENTE === 0) {
          setAttente(ATTENTE_MS);
          setMessage("Trop d'erreurs : patientez 30 secondes.");
        } else setMessage("Ce n'est pas le bon résultat. Voici un autre calcul.");
      }}
    >
      <p>{titre}</p>
      <p className="question-calcul">
        <label htmlFor="reponse-calcul">Combien font {question.texte} ?</label>{" "}
        <input id="reponse-calcul" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={reponse}
          onChange={(e) => setReponse(e.target.value.replace(/\D/g, "").slice(0, 3))} disabled={attente > 0} autoFocus />{" "}
        <button className="bouton-texte" type="submit" disabled={attente > 0}>Ouvrir</button>
      </p>
      {message && <p className="petit" role="status">{attente > 0 ? `Trop d'erreurs : patientez ${Math.ceil(attente / 1000)} secondes.` : message}</p>}
    </form>
  );
}
