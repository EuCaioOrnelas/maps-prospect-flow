import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useLeadIntelligenceProfile,
  NEXT_ACTION_LABELS,
  PRIORITY_LABELS,
  STAGE_LABELS,
  BEHAVIOR_LABELS,
  MOMENTUM_LABELS,
} from "@/hooks/useLeadIntelligence";
import {
  Brain, Target, Flame, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Sparkles, Building2, Gauge,
} from "lucide-react";

interface Props {
  phone?: string | null;
  className?: string;
}

function Dimension({ label, value, suffix = "/100" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground leading-tight">
        {value}
        <span className="text-[11px] font-normal text-muted-foreground">{suffix}</span>
      </p>
      <div className="mt-1.5 h-1 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function LeadIntelligencePanel({ phone, className }: Props) {
  const { data: intel, isLoading } = useLeadIntelligenceProfile(phone);

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border/60 bg-card p-4", className)}>
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!intel) {
    return (
      <div className={cn("rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center", className)}>
        <Brain className="w-5 h-5 mx-auto text-muted-foreground mb-1.5" />
        <p className="text-xs text-muted-foreground">
          A inteligência ainda não tem dados suficientes sobre este contato.
        </p>
      </div>
    );
  }

  const MomentumIcon =
    intel.momentum_state.includes("RISING") ? TrendingUp :
    intel.momentum_state.includes("DECLINING") ? TrendingDown : Minus;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Cabeçalho: oportunidade + prioridade + ação */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-[18px] h-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Inteligência Wiize
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {intel.company_name || "Contato"}
                {intel.niche ? <span className="text-muted-foreground font-normal"> · {intel.niche}</span> : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {intel.is_hot && (
              <Badge className="bg-primary text-primary-foreground gap-1 rounded-md">
                <Flame className="w-3 h-3" /> Quente
              </Badge>
            )}
            <Badge variant="outline" className="rounded-md">
              {PRIORITY_LABELS[intel.priority] || intel.priority}
            </Badge>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-primary">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Oportunidade {intel.opportunity_score}/100</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5">
            <MomentumIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">
              {MOMENTUM_LABELS[intel.momentum_state] || intel.momentum_state}
              {intel.momentum_value !== 0 && (
                <span className="tabular-nums text-muted-foreground"> ({intel.momentum_value > 0 ? "+" : ""}{intel.momentum_value})</span>
              )}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{STAGE_LABELS[intel.stage] || intel.stage}</span>
          </span>
        </div>

        <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-primary/80 font-medium">Próxima ação</p>
          <p className="text-sm font-semibold text-foreground">
            {NEXT_ACTION_LABELS[intel.next_best_action] || intel.next_best_action}
          </p>
        </div>
      </div>

      {/* Dimensões */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Dimension label="Fit" value={intel.fit_score} />
        <Dimension label="Intenção" value={intel.intent_score} />
        <Dimension label="Engajamento" value={intel.engagement_score} />
        <Dimension label="Qualidade" value={intel.quality_score} />
        <Dimension label="Risco" value={intel.risk_score} />
        <Dimension label="Semelhança" value={intel.pattern_match_score} suffix="%" />
      </div>

      {/* Comportamento */}
      {intel.behaviors?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Comportamento
          </p>
          <div className="flex flex-wrap gap-1.5">
            {intel.behaviors.map((b) => (
              <Badge key={b} variant="secondary" className="rounded-md text-[11px]">
                {BEHAVIOR_LABELS[b] || b}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Por que está assim */}
      {intel.factors?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Principais fatores
          </p>
          <ul className="space-y-1.5">
            {intel.factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span className="capitalize-first">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Riscos */}
      {intel.risk_factors?.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium mb-2">
            Atenção
          </p>
          <ul className="space-y-1.5">
            {intel.risk_factors.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Diagnóstico da empresa */}
      {intel.diagnosis_summary && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Diagnóstico da empresa
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{intel.diagnosis_summary}</p>
        </div>
      )}
    </div>
  );
}
