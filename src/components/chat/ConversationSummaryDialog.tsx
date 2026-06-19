import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertCircle, RefreshCw, Copy, MessageSquareText, Target, AlertTriangle, Activity, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getChatAvatarColor, getChatInitials } from "@/lib/chatAvatar";
import { format, parseISO } from "date-fns";
import type { ChatMessage } from "@/hooks/useChat";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactAvatar?: string | null;
  messages?: ChatMessage[];
};

type Section = { icon: any; title: string; body: string };

// Parse the AI markdown bullets into structured sections so we can render a nice card.
function parseSummary(raw: string): Section[] {
  if (!raw) return [];
  const sectionMap: { keys: string[]; icon: any; title: string }[] = [
    { keys: ["objetivo", "objetivos"], icon: Target, title: "Objetivos do cliente" },
    { keys: ["pedido", "pedidos", "objeç", "objecao", "objeção", "objeções"], icon: AlertTriangle, title: "Pedidos & Objeções" },
    { keys: ["status"], icon: Activity, title: "Status atual" },
    { keys: ["próximo", "proximo", "próximos", "proximos", "passos", "sugest"], icon: ArrowRight, title: "Próximos passos" },
  ];

  // Split by markdown bullets like "- **Title**: body"
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out: Section[] = [];
  for (const line of lines) {
    const clean = line.replace(/^[-*•]\s*/, "").replace(/^\d+[\.\)]\s*/, "");
    const m = clean.match(/^\*{0,2}([^*:]+?)\*{0,2}\s*[:\-–]\s*(.+)$/);
    if (!m) continue;
    const header = m[1].toLowerCase();
    const body = m[2].replace(/\*\*/g, "").trim();
    const found = sectionMap.find((s) => s.keys.some((k) => header.includes(k)));
    if (found) out.push({ icon: found.icon, title: found.title, body });
  }
  return out;
}

function previewText(m: ChatMessage): string {
  if (m.content) return m.content;
  if (m.media_caption) return m.media_caption;
  if (m.message_type === "image") return "📷 Imagem";
  if (m.message_type === "audio") return "🎤 Áudio";
  if (m.message_type === "video") return "🎬 Vídeo";
  if (m.message_type === "document") return "📎 Documento";
  return `[${m.message_type}]`;
}

export function ConversationSummaryDialog({ open, onOpenChange, conversationId, contactName, contactPhone, contactAvatar, messages }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !conversationId) return;
    setSummary(""); setError(null); setUsage(null);
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId]);

  const run = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-summarize", {
        body: { conversation_id: conversationId },
      });
      if (error) {
        try {
          const ctx: any = (error as any).context;
          const body = ctx ? await ctx.json() : null;
          if (body?.error === "daily_limit") {
            setError(`Limite diário atingido (${body.used}/${body.limit}). Tente novamente amanhã.`);
            setLoading(false);
            return;
          }
        } catch { /* ignore */ }
        setError(error.message || "Falha ao gerar resumo.");
        setLoading(false);
        return;
      }
      setSummary(data?.summary ?? "");
      if (data?.usage) setUsage(data.usage);
    } catch (e: any) {
      setError(e?.message || "Erro inesperado");
      toast.error("Erro ao gerar resumo");
    } finally {
      setLoading(false);
    }
  };

  const sections = useMemo(() => parseSummary(summary), [summary]);

  const lastMessages = useMemo(() => {
    const arr = messages ?? [];
    return arr.slice(-6);
  }, [messages]);

  const initials = getChatInitials(contactName || null, contactPhone || "");
  const color = getChatAvatarColor(contactPhone || "");

  const copyAll = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    toast.success("Resumo copiado");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
          <DialogHeader className="space-y-0">
            <div className="flex items-start gap-3">
              <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white text-[15px] font-medium overflow-hidden", color)}>
                {contactAvatar ? (
                  <img src={contactAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold uppercase tracking-wide">
                    <Sparkles size={12} /> Resumo IA
                  </div>
                </div>
                <DialogTitle className="text-[17px] font-semibold mt-1 truncate">
                  {contactName || contactPhone || "Conversa"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Análise executiva da conversa gerada com IA
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                <Loader2 size={28} className="relative animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Analisando a conversa…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex gap-2.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {/* Summary sections */}
          {!loading && !error && summary && (
            <div className="space-y-3">
              {sections.length > 0 ? (
                sections.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={i}
                      className="group flex gap-3 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon size={17} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          {s.title}
                        </p>
                        <p className="text-[13.5px] text-foreground leading-relaxed">
                          {s.body}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Recent messages preview */}
          {lastMessages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <MessageSquareText size={14} className="text-muted-foreground" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Últimas mensagens
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                {lastMessages.map((m) => {
                  const isOut = m.direction === "outbound";
                  return (
                    <div key={m.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm",
                          isOut
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words line-clamp-4">{previewText(m)}</p>
                        <p className={cn("mt-1 text-[10px] opacity-70", isOut ? "text-right" : "text-left")}>
                          {format(parseISO(m.created_at), "dd/MM HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {usage ? `${usage.used}/${usage.limit} resumos hoje` : "Resumo gerado por IA"}
          </span>
          <div className="flex gap-2">
            {summary && !loading && (
              <Button variant="ghost" size="sm" onClick={copyAll} className="gap-1.5">
                <Copy size={14} /> Copiar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={run} disabled={loading} className="gap-1.5">
              <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Gerar novamente
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
