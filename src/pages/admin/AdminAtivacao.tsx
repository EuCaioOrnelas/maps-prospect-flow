import { UserCheck, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAtivacao() {
  const [stats, setStats] = useState({ total: 0, withCampaign: 0, withSearch: 0, withAgent: 0, activated: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { count: total } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const { count: withSearch } = await supabase.from("profiles").select("id", { count: "exact", head: true }).gt("searches_used", 0);
      const { count: withAgent } = await supabase.from("ai_agents").select("id", { count: "exact", head: true });

      setStats({
        total: total || 0,
        withCampaign: 0,
        withSearch: withSearch || 0,
        withAgent: withAgent || 0,
        activated: withSearch || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const funnel = [
    { label: "Cadastros Totais", value: stats.total },
    { label: "Fizeram Busca", value: stats.withSearch },
    { label: "Criaram Agente IA", value: stats.withAgent },
    { label: "Ativados", value: stats.activated },
  ];

  const activationRate = stats.total > 0 ? ((stats.activated / stats.total) * 100).toFixed(1) : "0";

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ativação</h1>
        <p className="text-sm text-muted-foreground mt-1">Funil de ativação e engajamento de novos usuários</p>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Taxa de Ativação</p>
          {loading ? <Skeleton className="h-10 w-32" /> : (
            <p className="text-4xl font-bold text-foreground">{activationRate}%</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Funil de Ativação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : (
            funnel.map((step, i) => {
              const prevValue = i > 0 ? funnel[i - 1].value : step.value;
              const dropRate = prevValue > 0 ? ((1 - step.value / prevValue) * 100).toFixed(0) : "0";
              return (
                <div key={step.label}>
                  {i > 0 && (
                    <div className="flex items-center justify-center py-1">
                      <ArrowDown size={14} className="text-muted-foreground" />
                      <span className="text-xs text-red-400 ml-1">-{dropRate}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <span className="text-sm font-medium text-foreground">{step.label}</span>
                    <span className="text-lg font-bold text-foreground">{step.value.toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
