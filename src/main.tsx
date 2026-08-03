import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearRuntimeCaches, installRuntimeRecovery } from "./lib/runtimeRecovery";
import { installErrorReporter } from "./lib/errorReporter";
import { installPublicDemoNetworkGuard, isPublicDemoPath } from "./lib/publicDemo";

// Public demo (/tour-guiado): isolate the page from the backend BEFORE the app boots.
if (isPublicDemoPath()) {
  installPublicDemoNetworkGuard();
}

installErrorReporter();


// Cache bust version - increment to force cache clear on all clients
const CACHE_VERSION = "2026-06-22-meta-guide-recovery";
const STORED_VERSION_KEY = "wiize:cache-version";

installRuntimeRecovery();

// Force cache clear if version changed
(async () => {
  try {
    const storedVersion = localStorage.getItem(STORED_VERSION_KEY);
    if (storedVersion !== CACHE_VERSION) {
      console.log("[cache] Version changed, clearing all caches...");
      await clearRuntimeCaches();
      localStorage.setItem(STORED_VERSION_KEY, CACHE_VERSION);
      // Reload once to fetch fresh assets
      if (storedVersion !== null) {
        window.location.reload();
        return;
      }
    } else {
      void clearRuntimeCaches();
    }
  } catch {
    void clearRuntimeCaches();
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
