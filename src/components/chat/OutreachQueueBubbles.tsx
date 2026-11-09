import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { QueuedOutreach } from "@/hooks/useOutreachQueue";

function remaining(iso: string, now: number) {
  const s = Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000));
  if (s <= 0) return "enviando agora";
  if (s < 90) return `em ${s}s`;
  return `em ${Math.ceil(s / 60)} min`;
}

export function OutreachQueueBubbles({ items, onCancel }: { items: QueuedOutreach[]; onCancel: (id: string) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!items.length) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col items-end gap-1.5 px-4 pb-2 sm:px-[63px]">
        {items.map(item => (
          <div key={item.id} className="group relative max-w-[65%] rounded-lg rounded-tr-none bg-muted/90 px-3 py-2 text-sm text-foreground shadow-sm">
            <p className="whitespace-pre-wrap break-words opacity-80 line-clamp-4">{item.content}</p>
            <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-default items-center gap-1" aria-label="Mensagem na fila de envio">
                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                    {remaining(item.scheduled_at, now)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs">
                  Mensagem enviando com intervalo inteligente. Será enviada automaticamente {remaining(item.scheduled_at, now)}.
                </TooltipContent>
              </Tooltip>
              {item.status === "pending" && (
                <button
                  type="button"
                  onClick={() => onCancel(item.id)}
                  className="rounded p-0.5 hover:bg-background/60 hover:text-foreground"
                  aria-label="Cancelar envio"
                  title="Cancelar envio"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
