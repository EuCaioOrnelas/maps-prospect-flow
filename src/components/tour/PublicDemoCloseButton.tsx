import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Close button for the public (no-login) demo.
 *
 * Rendered by the /tour-guiado page itself (NOT by the tour overlay) so it stays
 * clickable on every screen — including the welcome card and the final card,
 * and even after the tour overlay unmounts.
 */
export function PublicDemoCloseButton() {
  if (typeof document === "undefined") return null;

  const close = () => {
    try {
      document.body.classList.remove(
        "public-demo-mode",
        "tour-demo-cockpit",
        "tour-demo-lead",
        "tour-sidebar-open"
      );
    } catch {}
    // Full reload so the demo network guard and all demo fixtures are torn down.
    window.location.assign("/");
  };

  return createPortal(
    <div
      data-tour-ui="true"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 2147483647,
        isolation: "isolate",
        filter: "none",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        pointerEvents: "auto",
        opacity: 1,
      }}
    >
      <button
        type="button"
        aria-label="Fechar tour"
        onPointerDown={(e) => {
          e.stopPropagation();
          close();
        }}
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        className="inline-flex items-center gap-2 rounded-hover border-2 border-foreground/15 bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-[0_12px_36px_hsl(var(--foreground)/0.28)] transition hover:bg-muted"
        style={{ opacity: 1 }}
      >
        <X size={15} />
        Fechar tour
      </button>
    </div>,
    document.body
  );
}
