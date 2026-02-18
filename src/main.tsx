import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Cache Buster: limpa caches antigos silenciosamente ──
// Garante que usuários sempre vejam a versão mais recente após deploy
(async () => {
  try {
    // 1. Forçar atualização do Service Worker se existir
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
        // Se tem SW esperando, ativar imediatamente
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }

    // 2. Limpar caches antigos do CacheStorage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const currentVersion = document.querySelector('meta[name="version"]')?.getAttribute('content');
      for (const name of cacheNames) {
        // Manter apenas workbox caches atuais, limpar o resto
        if (name.includes('temp') || name.includes('old') || name.includes('precache')) {
          await caches.delete(name);
        }
      }
    }
  } catch (e) {
    // Silencioso - não atrapalha o usuário
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
