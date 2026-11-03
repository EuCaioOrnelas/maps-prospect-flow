import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquareQuote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = { flowId: string; from?: Date; to?: Date; channel?: "chatweb" | "whatsapp" | "all"; className?: string };

/** Resumo das avaliações (nó "Avaliação") de um fluxo. Só aparece quando há respostas. */
export function FlowRatingsSummary({ flowId, from, to, channel = "all", className }: Props) {
  const { data: rows = [] } = useQuery({
    queryKey: ["flow-ratings", flowId, from ? Math.floor(from.getTime() / 3600000) : 0, to ? Math.floor(to.getTime() / 3600000) : 0, channel],
    queryFn: async () => {
      let q = supabase
        .from("wa_flow_ratings")
        .select("id,score_numeric,score_max,score_text,bucket,suggestion_text,contact_phone,contact_name,responded_at")
        .eq("flow_id", flowId)
        .order("responded_at", { ascending: false })
        .limit(1000);
      if (from) q = q.gte("responded_at", from.toISOString());
      if (to) q = q.lte("responded_at", to.toISOString());
      if (channel === "chatweb") q = q.like("contact_phone", "cw:%");
      if (channel === "whatsapp") q = q.not("contact_phone", "like", "cw:%");
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  if (!rows.length) return null;

  const scored = rows.filter((r) => r.score_numeric != null && r.score_max);
  const avg5 = scored.length ? scored.reduce((a, r) => a + (Number(r.score_numeric) / Number(r.score_max)) * 5, 0) / scored.length : null;
  const count = (b: string) => rows.filter((r) => r.bucket === b).length;
  const buckets = [
    { k: "positive", l: "Positivas", v: count("positive"), c: "bg-primary" },
    { k: "neutral", l: "Neutras", v: count("neutral"), c: "bg-muted-foreground" },
    { k: "negative", l: "Negativas", v: count("negative"), c: "bg-destructive" },
  ];
  const comments = rows.filter((r) => r.suggestion_text).slice(0, 4);
  const web = rows.filter((r) => String(r.contact_phone || "").startsWith("cw:")).length;

  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className || ""}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-medium flex items-center gap-2"><Star size={15} className="text-primary" />Avaliações dos clientes</p>
        <span className="text-xs text-muted-foreground">{rows.length} resposta{rows.length > 1 ? "s" : ""}{channel === "all" ? ` · ${web} ChatWeb · ${rows.length - web} WhatsApp` : ""}</span>
      </div>
      <div className="grid sm:grid-cols-[160px_1fr] gap-5">
        <div>
          <p className="text-3xl font-bold tabular-nums">{avg5 != null ? avg5.toFixed(1) : "—"}<span className="text-sm font-normal text-muted-foreground"> / 5</span></p>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={14} className={avg5 != null && i <= Math.round(avg5) ? "fill-primary text-primary" : "text-muted-foreground/40"} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Nota média</p>
        </div>
        <div className="space-y-2">
          {buckets.map((b) => (
            <div key={b.k} className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{b.l}</span><span className="tabular-nums">{b.v} · {Math.round((b.v / rows.length) * 100)}%</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${b.c}`} style={{ width: `${(b.v / rows.length) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      {comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MessageSquareQuote size={13} />Comentários recentes</p>
          {comments.map((c) => (
            <div key={c.id} className="text-sm rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-medium">{c.score_text}</span> — {c.suggestion_text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
