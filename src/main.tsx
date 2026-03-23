import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Cache Buster: limpa TODOS os caches e SWs para forçar versão nova ──
(async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
  } catch (e) {
    // Silencioso
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
