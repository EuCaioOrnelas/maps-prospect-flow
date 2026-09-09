import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Flame, AlertTriangle, Gauge, Users, ArrowRight } from "lucide-react";
import { useLeadIntelligence, NEXT_ACTION_LABELS, PRIORITY_LABELS } from "@/hooks/useLeadIntelligence";
import { INTEL_BANDS, phoneKey8 } from "@/lib/intelligence";

/**
 * Central de Inteligencia — visao consolidada.
 * Nenhum calculo novo: consome o resultado do motor central (intel_lead_profiles)
 * e a base ja normalizada 0-100 vinda da pagina.
 */
export interface IntelLeadRow {
  id: string;
  name: string | null;
  phone_e164: string;
  score_total: number;
  risk_state?: string | null;
  last_activity_at?: string | null;
}

const bandOf = (score: number) =>
  INTEL_BANDS.find((b) => score >= b.min && score <= b.max) || INTEL_BANDS[0];

export const IntelligenceOverview = ({
  leads,
  onSelectLead,
}: {
  leads: IntelLeadRow[];
  onSelectLead?: (lead: IntelLeadRow) => void;
}) => {
  const { profiles, getByPhone } = useLeadIntelligence();

  const stats = useMemo(() => {
    const total = leads.length;
    const avg = total ? Math.round(leads.reduce((s, l) => s + l.score_total, 0) / total) : 0;
    const ready = leads.filter((l) => l.score_total >= 81).length;
    const atRisk = leads.filter((l) => l.risk_state === "AT_RISK" || l.risk_state === "CRITICAL").length;

    const bands = INTEL_BANDS.map((b) => ({
      ...b,
      count: leads.filter((l) => l.score_total >= b.min && l.score_total <= b.max).length,
    }));

    const priorities = profiles.reduce<Record<string, number>>((acc, p) => {
      acc[p.priority] = (acc[p.priority] || 0) + 1;
      return acc;
    }, {});

    const actions = Object.entries(
      profiles.reduce<Record<string, number>>((acc, p) => {
        acc[p.next_best_action] = (acc[p.next_best_action] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const hot = profiles.filter((p) => p.is_hot).length;

    const top = [...leads].sort((a, b) => b.score_total - a.score_total).slice(0, 10);

    return { total, avg, ready, atRisk, bands, priorities, actions, hot, top, analyzed: profiles.length };
  }, [leads, profiles]);

  const kpis = [
    { label: "Contatos avaliados", value: stats.total, icon: Users },
    { label: "Média de oportunidade", value: `${stats.avg} de 100`, icon: Gauge },
    { label: "Prontos para venda", value: stats.ready, icon: Brain },
    { label: "Contatos quentes", value: stats.hot, icon: Flame },
    { label: "Em risco", value: stats.atRisk, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-card border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
              </div>
              <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribuição da carteira</CardTitle>
            <p className="text-xs text-muted-foreground">Quantos contatos existem em cada faixa de oportunidade.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.bands.map((b) => {
              const pct = stats.total ? Math.round((b.count / stats.total) * 100) : 0;
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{b.label} <span className="text-muted-foreground">({b.min}–{b.max})</span></span>
                    <span className="tabular-nums text-muted-foreground">{b.count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">O que fazer agora</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ações sugeridas pelo motor de inteligência para os contatos já analisados ({stats.analyzed}).
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.actions.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Ainda não há contatos analisados pelo motor. Assim que houver conversas, as ações aparecem aqui.
              </p>
            )}
            {stats.actions.map(([action, count]) => (
              <div key={action} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                <span className="text-xs text-foreground flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  {NEXT_ACTION_LABELS[action] || action}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              </div>
            ))}
            {Object.keys(stats.priorities).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {["P0", "P1", "P2", "P3", "P4"].map((p) =>
                  stats.priorities[p] ? (
                    <Badge key={p} variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {PRIORITY_LABELS[p]}: {stats.priorities[p]}
                    </Badge>
                  ) : null,
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Maiores oportunidades</CardTitle>
          <p className="text-xs text-muted-foreground">Os 10 contatos com maior pontuação de oportunidade hoje.</p>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {stats.top.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum contato pontuado ainda.</p>
          )}
          {stats.top.map((l, i) => {
            const intel = getByPhone(l.phone_e164);
            const band = bandOf(l.score_total);
            return (
              <button
                key={l.id || phoneKey8(l.phone_e164) + i}
                type="button"
                onClick={() => onSelectLead?.(l)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left"
              >
                <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{l.name || l.phone_e164}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {band.label}
                    {intel ? ` · ${NEXT_ACTION_LABELS[intel.next_best_action] || intel.next_best_action}` : ""}
                  </p>
                </div>
                <div className="w-24 h-1.5 rounded-full bg-muted/60 overflow-hidden hidden sm:block">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${l.score_total}%` }} />
                </div>
                <span className="text-sm font-semibold tabular-nums text-primary w-16 text-right">
                  {l.score_total} <span className="text-[10px] text-muted-foreground">/100</span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default IntelligenceOverview;
