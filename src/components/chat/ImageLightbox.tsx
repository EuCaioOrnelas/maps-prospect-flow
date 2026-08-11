import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, Forward, Reply, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ChatMessage } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

export interface ImageLightboxProps {
  open: boolean;
  images: ChatMessage[];          // ordered list of image messages of this conversation
  initialMessageId: string | null;
  contactName: string;
  contactSubtitle?: string;
  onClose: () => void;
  onReply?: (msg: ChatMessage) => void;
  onForward?: (msg: ChatMessage) => void;
}

export async function downloadFromUrl(url: string, filename?: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || url.split("/").pop()?.split("?")[0] || "arquivo";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    // fallback: open in new tab
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function ImageLightbox({ open, images, initialMessageId, contactName, contactSubtitle, onClose, onReply, onForward }: ImageLightboxProps) {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Sync index with initialMessageId / open
  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, images.findIndex(m => m.id === initialMessageId));
    setIndex(i);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [open, initialMessageId, images]);

  const go = useCallback((delta: number) => {
    setIndex(prev => {
      const next = Math.min(images.length - 1, Math.max(0, prev + delta));
      return next;
    });
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [images.length]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") setScale(s => Math.min(5, s + 0.25));
      else if (e.key === "-") setScale(s => Math.max(1, s - 0.25));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, go, onClose]);

  if (!open || images.length === 0) return null;
  const current = images[index];
  if (!current) return null;

  const handleDoubleClick = () => {
    setScale(s => (s > 1 ? 1 : 2));
    setOffset({ x: 0, y: 0 });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    draggingRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const d = draggingRef.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };
  const onMouseUp = () => { draggingRef.current = null; };

  const handleDownload = () => downloadFromUrl(current.media_url || "", current.media_filename || `imagem-${current.id}.jpg`);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col wa-lightbox-bg select-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 wa-lightbox-header shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} title="Fechar" className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn shrink-0">
            <X size={22} />
          </button>
          <div className="min-w-0">
            <p className="text-[15px] font-medium truncate">{contactName}</p>
            {contactSubtitle && <p className="text-[12px] truncate wa-lightbox-subtitle">{contactSubtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onReply && (
            <button onClick={() => onReply(current)} title="Responder" className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn">
              <Reply size={18} />
            </button>
          )}
          {onForward && (
            <button onClick={() => onForward(current)} title="Encaminhar" className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn">
              <Forward size={18} />
            </button>
          )}
          <button onClick={() => setScale(s => Math.max(1, s - 0.25))} title="Diminuir zoom" className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn">
            <ZoomOut size={18} />
          </button>
          <button onClick={() => setScale(s => Math.min(5, s + 0.25))} title="Aumentar zoom" className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn">
            <ZoomIn size={18} />
          </button>
          <button onClick={handleDownload} title="Baixar" className="w-10 h-10 rounded-[11px] flex items-center justify-center wa-lightbox-btn">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        {index > 0 && (
          <button onClick={() => go(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-[14px] wa-lightbox-nav flex items-center justify-center z-10 transition-colors">
            <ChevronLeft size={28} />
          </button>
        )}
        {index < images.length - 1 && (
          <button onClick={() => go(1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-[14px] wa-lightbox-nav flex items-center justify-center z-10 transition-colors">
            <ChevronRight size={28} />
          </button>
        )}
        <img
          src={current.media_url || ""}
          alt=""
          onDoubleClick={handleDoubleClick}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: draggingRef.current ? "none" : "transform 0.25s ease",
            cursor: scale > 1 ? (draggingRef.current ? "grabbing" : "grab") : "zoom-in",
            maxWidth: "92vw",
            maxHeight: "calc(100vh - 220px)",
          }}
          className="object-contain"
        />
      </div>

      {/* Bottom thumbnail strip */}
      <div className="h-[110px] wa-lightbox-strip shrink-0 px-3 z-10">
        <div className="h-full flex items-center gap-2 overflow-x-auto wa-scrollbar">
          {images.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { setIndex(i); setScale(1); setOffset({ x: 0, y: 0 }); }}
              className={cn(
                "shrink-0 h-[82px] w-[82px] rounded-md overflow-hidden border-2 transition-all",
                i === index ? "border-[#00a884] scale-100" : "border-transparent opacity-60 hover:opacity-100"
              )}
              title={format(parseISO(m.created_at), "dd/MM/yyyy HH:mm")}
            >
              <img src={m.media_url || ""} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
