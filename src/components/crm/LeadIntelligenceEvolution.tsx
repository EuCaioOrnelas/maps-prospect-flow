import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toIntel100, phoneKey8, intelLabel } from "@/lib/intelligence";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

/**
 * Evolucao da pontuacao de Inteligencia (0-100) de um lead.
 * Le o historico ja existente em `revenue_score_logs` — nada e recalculado aqui.
 */
export function LeadIntelligenceEvolution({ phone }: { phone?: string | null }) {
  const { accountOwnerId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["intel-evolution", accountOwnerId, phoneKey8(phone)],
    queryFn: async () => {
      if (!accountOwnerId || !phone) return null;
      const { data: leads } = await supabase
        .from("revenue_leads")
        .select("id, phone_e164")
        .eq("owner_user_id", accountOwnerId)
        .ilike("phone_e164", `%${phoneKey8(phone)}`)
        .limit(5);
      const lead = (leads || [])[0];
      if (!lead) return null;
      const { data: logs } = await supabase
        .from("revenue_score_logs")
        .select("event_type, points_applied, score_after, created_at")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(12);
      return (logs || []).reverse();
    },
    enabled: !!accountOwnerId && !!phone,
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!data || data.length === 0) return null;

  const points = data.map((l: any) => toIntel100(l.score_after));
  const last = points[points.length - 1] ?? 0;

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Evolução da pontuação
        </p>
      </div>
      <p className="text-sm font-medium tabular-nums text-foreground break-words">
        {points.join(" → ")}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Situação atual: {last}/100 · {intelLabel(last)}
      </p>
    </div>
  );
}
