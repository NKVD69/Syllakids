import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { FournisseurSyllakids } from "./contexte";
import "./styles.css";

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <FournisseurSyllakids>
      <App />
    </FournisseurSyllakids>
  </StrictMode>,
);
