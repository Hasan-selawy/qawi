import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure dark mode is active and add Google Fonts
document.documentElement.classList.add('dark');

const link = document.createElement('link');
link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(<App />);
