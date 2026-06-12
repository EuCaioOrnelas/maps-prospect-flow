import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string | null;
  contactName?: string | null;
};

export function ConversationSummaryDialog({ open, onOpenChange, conversationId, contactName }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !conversationId) return;
    setSummary(""); setError(null); setUsage(null);
    void run();
  }, [open, conversationId]);

  const run = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-summarize", {
        body: { conversation_id: conversationId },
      });
      if (error) {
        // Supabase wraps non-2xx
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles size={18} className="text-primary" />
            Resumo da conversa{contactName ? ` — ${contactName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[160px] py-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Gerando resumo...
            </div>
          )}
          {!loading && error && (
            <div className="flex gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {!loading && !error && summary && (
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{summary}</div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {usage ? `Usos hoje: ${usage.used}/${usage.limit}` : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button size="sm" onClick={run} disabled={loading}>Gerar novamente</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
