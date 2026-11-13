import { useEffect, useState } from "react";
import { Hourglass, X } from "lucide-react";
import type { QueuedOutreach } from "@/hooks/useOutreachQueue";

function remaining(iso: string, now: number) {
  const s = Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000));
  if (s <= 0) return "enviando agora…";
  if (s < 90) return `sai em ${s}s`;
  return `sai em ${Math.ceil(s / 60)} min`;
}

/**
 * Abordagens aguardando o intervalo inteligente. Visual próprio (borda tracejada,
 * selo "Na fila" e contagem visível) para não confundir com mensagem não enviada.
 */
export function OutreachQueueBubbles({ items, onCancel }: { items: QueuedOutreach[]; onCancel: (id: string) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!items.length) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  return (
    <div className="flex flex-col items-end gap-1.5 px-4 pb-2 sm:px-[63px]">
      {items.map(item => (
        <div
          key={item.id}
          title="Abordagem na fila: será enviada automaticamente com intervalo inteligente para proteger seu número."
          className="relative max-w-[65%] rounded-lg rounded-tr-none border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-sm text-foreground"
        >
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <Hourglass className="h-3.5 w-3.5 animate-pulse" />
            <span>Na fila de envio · {remaining(item.scheduled_at, now)}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-foreground/80 line-clamp-4">{item.content}</p>
          {item.status === "pending" && (
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => onCancel(item.id)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-3 w-3" /> Cancelar envio
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
