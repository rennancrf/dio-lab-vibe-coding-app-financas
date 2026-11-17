import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { FinanceProvider } from "./store/useFinance";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento #root não encontrado");
}

createRoot(root).render(
  <StrictMode>
    <FinanceProvider>
      <App />
    </FinanceProvider>
  </StrictMode>,
);
