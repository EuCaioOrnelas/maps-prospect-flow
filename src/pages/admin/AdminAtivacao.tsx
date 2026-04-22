import { UserCheck, ArrowDown, Info, Users, MousePointerClick, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell,
} from "recharts";

/**
 * Página de Ativação.
 *
 * O FUNIL responde: "De cada 100 cadastros, quantos chegam até o uso real?"
 *   1) Cadastros Totais — usuários criados no banco (tabela profiles)
 *   2) Acessou o Dashboard — usuários que fizeram login depois do cadastro
 *      (proxy: updated_at > created_at, indica atividade pós-signup)
 *   3) Ativados — usaram pelo menos UMA feature (busca, mensagem, lead, fluxo
 *      ou campanha), ou seja, geraram valor real na plataforma.
 */

type FunnelRow = { label: string; value: number; color: string; tooltip: string };

export default function AdminAtivacao() {
  const [stats, setStats] = useState({
    total: 0,
    accessed: 0,
    activated: 0,
    activatedStripe: 0,
    activatedAsaas: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Pull all profiles with the columns we need
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, created_at, updated_at, payment_provider, plan, searches_used, trial_messages_sent, trial_leads_used, trial_flows_used, trial_campaigns_used");

      if (!profiles) { setLoading(false); return; }

      const total = profiles.length;

      // Acessou dashboard: updated_at é > 1min após created_at (login pós-signup)
      const accessed = profiles.filter((p: any) => {
        const c = new Date(p.created_at).getTime();
        const u = new Date(p.updated_at).getTime();
        return u - c > 60_000; // 1 min de margem
      }).length;

      // Ativados: usaram qualquer feature
      const activatedProfiles = profiles.filter((p: any) =>
        (p.searches_used ?? 0) > 0 ||
        (p.trial_messages_sent ?? 0) > 0 ||
        (p.trial_leads_used ?? 0) > 0 ||
        (p.trial_flows_used ?? 0) > 0 ||
        (p.trial_campaigns_used ?? 0) > 0
      );
      const activated = activatedProfiles.length;

      // Breakdown de pagantes ativados por provedor (Stripe Cartão / Asaas PIX)
      const activatedStripe = activatedProfiles.filter(
        (p: any) => p.payment_provider === "stripe" && p.plan && p.plan !== "free"
      ).length;
      const activatedAsaas = activatedProfiles.filter(
        (p: any) =>
          (p.payment_provider === "asaas" || p.payment_provider === "abacate_pay") &&
          p.plan &&
          p.plan !== "free"
      ).length;

      setStats({ total, accessed, activated, activatedStripe, activatedAsaas });
      setLoading(false);
    };
    load();
  }, []);

  const funnel: FunnelRow[] = [
    { label: "Cadastros Totais",   value: stats.total,     color: "hsl(217 91% 60%)",   tooltip: "Todas as contas criadas (tabela profiles)" },
    { label: "Acessou o Dashboard", value: stats.accessed, color: "hsl(262 83% 58%)",   tooltip: "Logaram após o cadastro (updated_at > created_at)" },
    { label: "Ativados",           value: stats.activated, color: "hsl(158 72% 38%)",   tooltip: "Usaram pelo menos uma feature: busca, mensagem, lead, fluxo ou campanha" },
  ];

  const activationRate = stats.total > 0 ? ((stats.activated / stats.total) * 100).toFixed(1) : "0";
  const accessRate     = stats.total > 0 ? ((stats.accessed  / stats.total) * 100).toFixed(1) : "0";
  const accessToActivation = stats.accessed > 0 ? ((stats.activated / stats.accessed) * 100).toFixed(1) : "0";

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ativação</h1>
            <p className="text-sm text-muted-foreground mt-1">
              De cadastro a primeiro uso da plataforma
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles size={12} className="text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Dados Reais</span>
          </div>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            icon={Users}
            color="text-blue-500"
            label="Taxa de Acesso"
            value={`${accessRate}%`}
            sub={`${stats.accessed.toLocaleString("pt-BR")} de ${stats.total.toLocaleString("pt-BR")} entraram`}
            loading={loading}
          />
          <MetricCard
            icon={UserCheck}
            color="text-emerald-500"
            label="Taxa de Ativação"
            value={`${activationRate}%`}
            sub={`${stats.activated.toLocaleString("pt-BR")} de ${stats.total.toLocaleString("pt-BR")} ativaram`}
            loading={loading}
            highlight
          />
          <MetricCard
            icon={MousePointerClick}
            color="text-violet-500"
            label="Acesso → Ativação"
            value={`${accessToActivation}%`}
            sub="Quem entrou e usou alguma feature"
            loading={loading}
          />
        </div>

        {/* Breakdown de pagantes ativados por provedor (Stripe Cartão + Asaas PIX) */}
        <Card className="border-border/40 bg-card/80 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pagantes Ativados por Provedor</CardTitle>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Total de assinantes pagantes que já usaram a plataforma — soma Stripe (Cartão) + Asaas (PIX).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Stripe (Cartão)</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.activatedStripe.toLocaleString("pt-BR")}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">assinantes ativados</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Asaas (PIX)</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.activatedAsaas.toLocaleString("pt-BR")}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">assinantes ativados</p>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Total Pagantes</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1">{(stats.activatedStripe + stats.activatedAsaas).toLocaleString("pt-BR")}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">Stripe + Asaas somados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual funnel chart */}
        <Card className="border-border/40 bg-card/80 rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Funil de Ativação</CardTitle>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Cada barra mostra quantos usuários chegaram até essa etapa.
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <Info size={14} className="text-muted-foreground/60" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">Como ler o funil</p>
                  <p className="text-muted-foreground">
                    A queda entre etapas indica onde você está perdendo usuários.
                    Se "Cadastros → Acesso" cai muito, há fricção no onboarding.
                    Se "Acesso → Ativação" cai, falta clareza sobre o primeiro valor.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="label" type="category" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={150} />
                      <RTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                          padding: "10px 14px",
                        }}
                        formatter={(v: number) => [v.toLocaleString("pt-BR") + " usuários", ""]}
                        labelFormatter={(l) => l}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={36}>
                        {funnel.map((row, i) => (
                          <Cell key={i} fill={row.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Drop-off rows below */}
                <div className="mt-6 space-y-2">
                  {funnel.map((step, i) => {
                    const prev = i > 0 ? funnel[i - 1].value : step.value;
                    const dropPct = prev > 0 ? ((1 - step.value / prev) * 100).toFixed(0) : "0";
                    return (
                      <div key={step.label}>
                        {i > 0 && (
                          <div className="flex items-center justify-center gap-2 py-1.5">
                            <ArrowDown size={12} className="text-muted-foreground/50" />
                            <span className="text-[10px] font-semibold text-red-500/80">−{dropPct}% perdidos</span>
                            <ArrowDown size={12} className="text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/20">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: step.color }} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{step.label}</p>
                              <p className="text-[10px] text-muted-foreground/70 truncate">{step.tooltip}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-foreground">{step.value.toLocaleString("pt-BR")}</p>
                            <p className="text-[10px] text-muted-foreground/60">
                              {stats.total > 0 ? ((step.value / stats.total) * 100).toFixed(1) : 0}% do topo
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Explanation */}
        <Card className="border-border/30 bg-muted/20 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Info size={14} className="text-primary" />
              </div>
              <div className="space-y-2 text-xs text-muted-foreground/80 leading-relaxed">
                <p><strong className="text-foreground">Como esse funil é calculado?</strong></p>
                <ul className="space-y-1.5 ml-2">
                  <li>• <strong className="text-foreground">Cadastros Totais:</strong> contagem direta da tabela <code className="text-primary">profiles</code>.</li>
                  <li>• <strong className="text-foreground">Acessou o Dashboard:</strong> usuários cuja última atividade (<code className="text-primary">updated_at</code>) é posterior à data de criação. Sinaliza que voltaram após o signup.</li>
                  <li>• <strong className="text-foreground">Ativados:</strong> usuários que executaram pelo menos uma busca, enviaram uma mensagem, criaram um lead, fluxo ou campanha — ou seja, geraram valor real.</li>
                </ul>
                <p className="pt-1">
                  <strong className="text-foreground">Quanto maior a queda</strong> entre etapas, mais fricção existe nessa transição. Foco em melhorar a etapa com maior drop-off.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function MetricCard({
  icon: Icon, color, label, value, sub, loading, highlight,
}: {
  icon: any; color: string; label: string; value: string; sub: string; loading: boolean; highlight?: boolean;
}) {
  return (
    <Card className={`border-border/40 bg-card/80 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md ${highlight ? "ring-1 ring-emerald-500/30" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-xl bg-muted/50">
            <Icon size={14} className={color} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        )}
        <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mt-2">{label}</p>
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
