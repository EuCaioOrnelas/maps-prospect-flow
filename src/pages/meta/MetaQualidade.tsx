import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Activity } from "lucide-react";

const kpis = [
  { label: "Quality rating", value: "HIGH", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Health score", value: "92/100", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Templates reprovados", value: "2", color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Bloqueios", value: "0", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Taxa de denúncias", value: "0.4%", color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Taxa de bloqueio", value: "0.2%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Status WABA", value: "Ativo", color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

const alerts = [
  {
    severity: "high" as const,
    icon: ShieldAlert,
    title: "Risco de limitação no número +55 11 99999-3333",
    desc: "Quality rating caiu para LOW. Reduza volume e revise templates ativos nas próximas 24h.",
  },
  {
    severity: "medium" as const,
    icon: AlertTriangle,
    title: "Queda de qualidade detectada",
    desc: "Campanha 'Black Friday' apresentou aumento de 18% em respostas negativas.",
  },
  {
    severity: "medium" as const,
    icon: AlertCircle,
    title: "Spam alto em template 'lembrete_proposta'",
    desc: "5 denúncias nas últimas 48h. Considere pausar ou ajustar a copy.",
  },
  {
    severity: "low" as const,
    icon: CheckCircle2,
    title: "Operação saudável no número Comercial Principal",
    desc: "Quality HIGH mantida há 14 dias consecutivos.",
  },
];

const sevColors: Record<string, string> = {
  high: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export default function MetaQualidade() {
  return (
    <MetaLayout title="Qualidade & Saúde" description="Monitore quality rating, denúncias e saúde da WABA.">
      <MetaPageHeader title="Qualidade & Saúde" description="Visão consolidada da saúde operacional da sua WABA." />

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 border-border/60">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
            <p className={`text-lg font-semibold mt-2 ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5 border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-primary" />
          <h3 className="text-sm font-semibold">Health score detalhado</h3>
        </div>
        <div className="space-y-4">
          {[
            { label: "Quality rating", value: 95 },
            { label: "Engajamento médio", value: 82 },
            { label: "Saúde dos templates", value: 88 },
            { label: "Estabilidade da WABA", value: 96 },
            { label: "Reputação dos números", value: 79 },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-foreground font-medium">{item.label}</span>
                <span className="tabular-nums text-muted-foreground">{item.value}/100</span>
              </div>
              <Progress value={item.value} className="h-1.5" />
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Alertas operacionais</h3>
        <div className="space-y-2">
          {alerts.map((a) => (
            <Card key={a.title} className={`p-4 border ${sevColors[a.severity]}`}>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center shrink-0">
                  <a.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <Badge variant="outline" className="capitalize text-[10px] shrink-0">{a.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MetaLayout>
  );
}
