import { useState, useMemo } from "react";
import { Calculator, DollarSign, TrendingUp, AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useRevenueDashboardStats, useRevenueSettings } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

const RevenueSimulator = () => {
  const { data: stats, isLoading } = useRevenueDashboardStats();
  const { data: settings } = useRevenueSettings();

  const defaults = useMemo(() => ({
    ticket: settings?.default_ticket_value || 3000,
    rateCold: settings?.default_close_rate_cold || 0.005,
    rateEngaged: settings?.default_close_rate_engaged || 0.05,
    rateHot: settings?.default_close_rate_hot || 0.15,
    rateVeryHot: settings?.default_close_rate_very_hot || 0.35,
  }), [settings]);

  const [sim, setSim] = useState<typeof defaults | null>(null);
  const current = sim || defaults;

  const buckets = stats?.bucketCounts || { COLD: 0, ENGAGED: 0, HOT: 0, VERY_HOT: 0 };

  const calcRevenue = (params: typeof defaults) =>
    buckets.COLD * params.ticket * params.rateCold +
    buckets.ENGAGED * params.ticket * params.rateEngaged +
    buckets.HOT * params.ticket * params.rateHot +
    buckets.VERY_HOT * params.ticket * params.rateVeryHot;

  const receitaAtual = calcRevenue(defaults);
  const receitaSimulada = calcRevenue(current);
  const diff = receitaAtual > 0 ? ((receitaSimulada - receitaAtual) / receitaAtual) * 100 : 0;

  const handleReset = () => setSim(null);

  const update = (key: keyof typeof defaults, value: number) => {
    setSim((prev) => ({ ...(prev || defaults), [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator size={24} /> Simulador de Receita
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajuste parâmetros e veja o impacto na receita esperada em tempo real
          </p>
        </div>
        {sim && (
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw size={14} /> Resetar
          </Button>
        )}
      </div>

      {/* Results comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign size={14} /> Receita Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{fmt(receitaAtual)}</p>
            <p className="text-xs text-muted-foreground mt-1">Com parâmetros configurados</p>
          </CardContent>
        </Card>

        <Card className={cn("border-border/50", sim ? "bg-primary/5 border-primary/30" : "bg-card")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp size={14} /> Receita Simulada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-3xl font-bold", sim ? "text-primary" : "text-foreground")}>{fmt(receitaSimulada)}</p>
            <p className="text-xs text-muted-foreground mt-1">Com parâmetros ajustados</p>
          </CardContent>
        </Card>

        <Card className={cn("border-border/50", diff > 0 ? "bg-primary/5 border-primary/30" : diff < 0 ? "bg-destructive/5 border-destructive/30" : "bg-card")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {diff >= 0 ? <TrendingUp size={14} /> : <AlertTriangle size={14} />} Diferença
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-3xl font-bold", diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-foreground")}>
              {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {diff > 0 ? `+${fmt(receitaSimulada - receitaAtual)}` : diff < 0 ? fmt(receitaSimulada - receitaAtual) : "Sem alteração"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simulator controls */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Parâmetros</CardTitle>
          <CardDescription>Arraste os controles para simular cenários diferentes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Ticket */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Ticket Médio</Label>
              <span className="text-sm font-bold text-foreground">{fmt(current.ticket)}</span>
            </div>
            <Slider
              value={[current.ticket]}
              onValueChange={([v]) => update("ticket", v)}
              min={500}
              max={50000}
              step={500}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>R$ 500</span>
              <span>R$ 50.000</span>
            </div>
          </div>

          {/* Close rates */}
          {([
            { key: "rateCold" as const, label: "🧊 Taxa Conversão Frio", count: buckets.COLD },
            { key: "rateEngaged" as const, label: "☀️ Taxa Conversão Morno", count: buckets.ENGAGED },
            { key: "rateHot" as const, label: "💬 Taxa Conversão Engajado", count: buckets.HOT },
            { key: "rateVeryHot" as const, label: "🔥 Taxa Conversão Quente", count: buckets.VERY_HOT },
          ]).map(({ key, label, count }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">{label} ({count} leads)</Label>
                <span className="text-sm font-bold text-foreground">{pct(current[key])}</span>
              </div>
              <Slider
                value={[current[key] * 100]}
                onValueChange={([v]) => update(key, v / 100)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Per bucket breakdown */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Detalhamento por Nível</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {([
              { bucket: "VERY_HOT", label: "🔥 Quente", count: buckets.VERY_HOT, rate: current.rateVeryHot, origRate: defaults.rateVeryHot },
              { bucket: "HOT", label: "💬 Engajado", count: buckets.HOT, rate: current.rateHot, origRate: defaults.rateHot },
              { bucket: "ENGAGED", label: "☀️ Morno", count: buckets.ENGAGED, rate: current.rateEngaged, origRate: defaults.rateEngaged },
              { bucket: "COLD", label: "🧊 Frio", count: buckets.COLD, rate: current.rateCold, origRate: defaults.rateCold },
            ]).map(({ bucket, label, count, rate, origRate }) => {
              const simValue = count * current.ticket * rate;
              const origValue = count * defaults.ticket * origRate;
              const bucketDiff = origValue > 0 ? ((simValue - origValue) / origValue) * 100 : 0;

              return (
                <div key={bucket} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{count} leads × {pct(rate)} × {fmt(current.ticket)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{fmt(simValue)}</p>
                    {sim && bucketDiff !== 0 && (
                      <p className={cn("text-xs font-medium", bucketDiff > 0 ? "text-primary" : "text-destructive")}>
                        {bucketDiff > 0 ? "+" : ""}{bucketDiff.toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueSimulator;
