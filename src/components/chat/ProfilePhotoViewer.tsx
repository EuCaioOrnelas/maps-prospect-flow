import { createPortal } from "react-dom";
import { useEffect } from "react";
import { X, Download, RefreshCw, Loader2 } from "lucide-react";
import { downloadFromUrl } from "./ImageLightbox";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  url: string | null;
  name: string;
  subtitle?: string;
  initials: string;
  avatarColor: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onClose: () => void;
}

export function ProfilePhotoViewer({
  open, url, name, subtitle, initials, avatarColor, refreshing, onRefresh, onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col wa-lightbox-bg select-none animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="h-[60px] flex items-center justify-between px-4 wa-lightbox-header shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} title="Fechar" className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn shrink-0">
            <X size={22} />
          </button>
          <div className="min-w-0">
            <p className="text-[15px] font-medium truncate">{name}</p>
            {subtitle && <p className="text-[12px] truncate wa-lightbox-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button onClick={onRefresh} title="Atualizar foto de perfil" className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn">
              {refreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            </button>
          )}
          {url && (
            <button
              onClick={() => downloadFromUrl(url, `${name || "contato"}.jpg`)}
              title="Baixar"
              className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn"
            >
              <Download size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-10">
        <div className="flex flex-col items-center gap-5 animate-in zoom-in-95 duration-300">
          <div className="rounded-full p-[3px] bg-gradient-to-br from-primary/70 via-primary/20 to-transparent shadow-2xl">
            {url ? (
              <img
                src={url}
                alt={name}
                className="w-[min(72vw,420px)] h-[min(72vw,420px)] rounded-full object-cover bg-black/20"
              />
            ) : (
              <div className={cn(
                "w-[min(72vw,420px)] h-[min(72vw,420px)] rounded-full flex items-center justify-center text-white text-6xl font-medium",
                avatarColor,
              )}>
                {initials}
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-medium">{name}</p>
            {subtitle && <p className="text-white/60 text-sm mt-0.5 tabular-nums">{subtitle}</p>}
            {!url && <p className="text-white/50 text-xs mt-2">Este contato não tem foto de perfil visível.</p>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
