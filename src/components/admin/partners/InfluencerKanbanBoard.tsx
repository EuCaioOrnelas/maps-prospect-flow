import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChannelAvatar } from "@/components/admin/partners/ChannelAvatar";
import { INFLUENCER_KANBAN_COLUMNS, prospectOutreachLabel } from "@/lib/influencerOutreach";
import { Mail, MessageSquare, Sparkles } from "lucide-react";

interface Props {
  prospects: any[];
  emailOf: (p: any) => { contact: any | null; email: string };
  onStatusChange: (id: string, status: string) => void | Promise<void>;
  onOpen: (p: any) => void;
  onThread: (p: any) => void;
  onApproach: (p: any, email: string) => void;
}

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : null;

export function InfluencerKanbanBoard({
  prospects, emailOf, onStatusChange, onOpen, onThread, onApproach,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const columnOf = (p: any) => {
    const s = p.status ?? "novo";
    return INFLUENCER_KANBAN_COLUMNS.some((c) => c.value === s) ? s : INFLUENCER_KANBAN_COLUMNS[0].value;
  };

  const drop = async (status: string) => {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const current = prospects.find((p) => p.id === id);
    if (!current || columnOf(current) === status) return;
    await onStatusChange(id, status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {INFLUENCER_KANBAN_COLUMNS.map((col) => {
        const items = prospects.filter((p) => columnOf(p) === col.value);
        return (
          <div
            key={col.value}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.value); }}
            onDragLeave={() => setOverCol((c) => (c === col.value ? null : c))}
            onDrop={() => drop(col.value)}
            className={`w-[290px] shrink-0 rounded-2xl border p-3 space-y-3 transition-colors ${
              overCol === col.value ? "border-primary/50 bg-primary/[0.05]" : "border-border bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold">{col.label}</p>
              <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
            </div>

            <div className="space-y-2.5 min-h-[80px]">
              {items.length === 0 && (
                <p className="text-[11px] text-muted-foreground px-1 py-4 text-center">
                  Arraste um influenciador para cá
                </p>
              )}
              {items.map((p) => {
                const { email } = emailOf(p);
                const sentAt = fmtDate(p.last_contacted_at ?? p.last_email_sent_at);
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onClick={() => onOpen(p)}
                    className={`rounded-xl border border-border bg-background p-3 space-y-2.5 cursor-grab active:cursor-grabbing ${
                      dragId === p.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <ChannelAvatar src={p.thumbnail_url} name={p.channel_name} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.channel_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {p.platform === "instagram" ? "Instagram" : "YouTube"}
                          {p.channel_handle ? ` · ${p.channel_handle}` : ""}
                        </p>
                      </div>
                    </div>

                    <p className={`text-[11px] break-all ${email ? "text-primary" : "text-muted-foreground"}`}>
                      {email || "Sem e-mail"}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">{prospectOutreachLabel(p.status)}</Badge>
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          aria-label="Abrir conversa" onClick={() => onThread(p)}>
                          <MessageSquare size={13} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          aria-label="Criar abordagem com IA" onClick={() => onApproach(p, email)}>
                          <Sparkles size={13} className="text-primary" />
                        </Button>
                      </div>
                    </div>

                    {p.status === "email_enviado" && (
                      <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Mail size={11} className="text-primary" />
                        E-mail enviado{sentAt ? ` · ${sentAt}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
