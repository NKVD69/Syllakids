import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { FournisseurCompte } from "./compte";
import { FournisseurSyllakids } from "./contexte";
import "./styles.css";

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <FournisseurCompte>
      <FournisseurSyllakids>
        <App />
      </FournisseurSyllakids>
    </FournisseurCompte>
  </StrictMode>,
);
