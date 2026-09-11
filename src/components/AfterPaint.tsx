import { ReactNode, useEffect, useState } from "react";

/**
 * Renderiza os filhos apenas depois que o navegador terminou o primeiro paint
 * (requestIdleCallback com fallback). Usado para overlays e tags que não fazem
 * parte do conteúdo crítico da página.
 */
export const AfterPaint = ({ children, timeout = 2000 }: { children: ReactNode; timeout?: number }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = () => !cancelled && setReady(true);
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(run, { timeout });
    } else {
      const t = window.setTimeout(run, 300);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [timeout]);

  if (!ready) return null;
  return <>{children}</>;
};
