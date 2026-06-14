import { useEffect, useRef } from "react";
import { Zap, FileText, ImageIcon, Film, Music } from "lucide-react";
import type { QuickReply } from "@/hooks/useQuickReplies";
import { cn } from "@/lib/utils";

interface Props {
  items: QuickReply[];
  query: string;
  activeIdx: number;
  onSelect: (item: QuickReply) => void;
  onHover: (idx: number) => void;
}

export function QuickReplyPicker({ items, query, activeIdx, onSelect, onHover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (items.length === 0) return null;

  const mediaIcon = (type?: string | null) => {
    if (type === "image") return <ImageIcon size={12} />;
    if (type === "video") return <Film size={12} />;
    if (type === "audio") return <Music size={12} />;
    if (type === "document") return <FileText size={12} />;
    return null;
  };

  return (
    <div className="absolute bottom-[58px] left-[8px] right-[8px] sm:left-[12px] sm:right-[12px] z-40 max-h-[260px] overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 flex-wrap">
        <Zap size={12} className="text-primary shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          Mensagens rápidas {query ? `· /${query}` : ""}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground hidden sm:inline">↑↓ navegar · Enter usar · Esc cancelar</span>
      </div>
      <div ref={containerRef}>
        {items.map((item, idx) => (
          <button
            key={item.id}
            data-idx={idx}
            onMouseEnter={() => onHover(idx)}
            onClick={() => onSelect(item)}
            className={cn(
              "w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors border-b border-border/40 last:border-b-0",
              idx === activeIdx ? "bg-primary/10" : "hover:bg-muted/60"
            )}
          >
            <code className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11px] font-mono font-semibold max-w-[90px] truncate">
              /{item.shortcut}
            </code>
            <div className="flex-1 min-w-0 overflow-hidden">
              {item.title && <p className="text-xs font-medium text-foreground truncate">{item.title}</p>}
              <p className="text-[11px] text-muted-foreground truncate">{item.content || "(sem texto)"}</p>
              {item.media_url && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  {mediaIcon(item.media_type)}
                  <span className="truncate">{item.media_filename || item.media_type}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

