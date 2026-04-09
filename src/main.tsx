import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearRuntimeCaches, installRuntimeRecovery } from "./lib/runtimeRecovery";

installRuntimeRecovery();
void clearRuntimeCaches();

createRoot(document.getElementById("root")!).render(<App />);
