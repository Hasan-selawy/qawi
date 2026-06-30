import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root")!;

// In production the page is prerendered to static HTML at build time, so we
// hydrate the existing markup (keeps the hero painted = fast LCP/FCP).
// In dev the #root is empty, so fall back to a normal client render.
if (container.firstElementChild) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
