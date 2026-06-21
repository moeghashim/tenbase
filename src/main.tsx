import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

if ("tenbaseDesktop" in window || navigator.userAgent.includes("Electron")) {
  document.documentElement.classList.add("desktop-app");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
