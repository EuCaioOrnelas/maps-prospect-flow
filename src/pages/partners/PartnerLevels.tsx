import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LevelBadge, LEVEL_META, type PartnerLevel } from "@/components/partners/LevelBadge";
import { PageHeader } from "@/components/partners/PageHeader";
import { Sparkles, TrendingUp, Users, DollarSign, Repeat, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { fmtBRL } from "@/lib/partnerFormat";
import { cn } from "@/lib/utils";

const LEVEL_ORDER: PartnerLevel[] = ["bronze", "silver", "gold", "platinum"];

interface LevelTier {
  key: PartnerLevel;
  thresholdClients: number;
  commissionPercent: number;
  perks: string[];
}

export default function PartnerLevels() {
  const { partner } = useOutletContext<any>();
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [mrrCents, setMrrCents] = useState(0);
  const [activeClients, setActiveClients] = useState(0);

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const [pRes, sRes, mrrRes, leadsRes] = await Promise.all([
        supabase.from("partners").select("*").eq("id", partner.id).maybeSingle(),
        supabase.from("partner_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.rpc("compute_partner_mrr", { p_partner_id: partner.id }),
        supabase
          .from("partner_leads")
          .select("id, is_paid, is_cancelled")
          .eq("partner_id", partner.id),
      ]);
      setPartnerData(pRes.data);
      setSettings(sRes.data);
      setMrrCents(Number(mrrRes.data || 0));
      const active = (leadsRes.data || []).filter((l: any) => l.is_paid && !l.is_cancelled).length;
      setActiveClients(active);
      setLoading(false);
    })();
  }, [partner?.id]);

  const tiers: LevelTier[] = useMemo(() => {
    if (!settings) return [];
    return [
      {
        key: "bronze",
        thresholdClients: 0,
        commissionPercent: Number(settings.bronze_commission_percent),
        perks: ["Acesso ao programa", "Materiais oficiais", "Saque a partir de R$ 100"],
      },
      {
        key: "silver",
        thresholdClients: settings.silver_threshold_clients,
        commissionPercent: Number(settings.silver_commission_percent),
        perks: ["Comissão maior em todas as vendas", "Selo Silver no perfil", "Suporte prioritário"],
      },
      {
        key: "gold",
        thresholdClients: settings.gold_threshold_clients,
        commissionPercent: Number(settings.gold_commission_percent),
        perks: ["Comissão Gold em todas as vendas", "Acesso antecipado a campanhas", "Convite para eventos exclusivos"],
      },
      {
        key: "platinum",
        thresholdClients: settings.platinum_threshold_clients ?? Math.max(settings.gold_threshold_clients * 2, 500),
        commissionPercent: Number(settings.platinum_commission_percent),
        perks: ["Comissão máxima do programa", "Co-marketing dedicado", "Gerente de parceria 1:1"],
      },
    ];
  }, [settings]);

  const currentLevel = (partnerData?.level || "bronze") as PartnerLevel;
  const currentIdx = LEVEL_ORDER.indexOf(currentLevel);
  const nextTier = tiers[currentIdx + 1];
  const currentTier = tiers[currentIdx];
  const customPercent = partnerData?.custom_commission_percent;
  const effectiveCommission = customPercent != null
    ? Number(customPercent)
    : currentTier?.commissionPercent ?? 0;

  const progressToNext = nextTier
    ? Math.min(100, (activeClients / Math.max(1, nextTier.thresholdClients)) * 100)
    : 100;
  const clientsRemaining = nextTier
    ? Math.max(0, nextTier.thresholdClients - activeClients)
    : 0;

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="h-9 w-48 bg-muted/40 rounded animate-pulse" />
        <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Níveis & Progresso"
        subtitle="Quanto mais clientes ativos você gerar, maior sua comissão por venda. Veja sua jornada completa."
        icon={Sparkles}
      />

      {/* HERO — Current level + progress to next */}
      <Card className="relative overflow-hidden border border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full blur-3xl opacity-60 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-60 w-60 rounded-full blur-3xl opacity-50 bg-gradient-to-tr from-primary/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent" />
        <CardContent className="relative p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
            {/* Left: current */}
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Seu nível atual
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <LevelBadge level={currentLevel} size="lg" />
                  <span className="text-2xl lg:text-3xl font-bold tracking-tight">
                    {LEVEL_META[currentLevel].label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MetricBox
                  icon={DollarSign}
                  label="Comissão atual"
                  value={`${effectiveCommission.toFixed(0)}%`}
                  hint={customPercent != null ? "personalizada" : "por venda"}
                  highlight
                />
                <MetricBox
                  icon={Users}
                  label="Clientes ativos"
                  value={activeClients}
                  hint="pagos e ativos"
                />
                <MetricBox
                  icon={Repeat}
                  label="MRR atribuído"
                  value={fmtBRL(mrrCents)}
                  hint="recorrente"
                />
              </div>
            </div>

            {/* Right: next tier progress */}
            {nextTier ? (
              <div className="space-y-4 lg:border-l lg:border-border/60 lg:pl-8">
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    Próximo nível
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <LevelBadge level={nextTier.key} size="md" />
                    <span className="text-sm font-medium text-muted-foreground">
                      sobe para <span className="text-foreground font-bold">{nextTier.commissionPercent.toFixed(0)}%</span> de comissão
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between text-xs">
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-bold text-base">{activeClients}</span>
                      <span className="text-muted-foreground"> / {nextTier.thresholdClients} clientes</span>
                    </span>
                    <span className="text-primary font-semibold">{progressToNext.toFixed(0)}%</span>
                  </div>
                  <Progress value={progressToNext} className="h-2.5" />
                  <p className="text-xs text-muted-foreground">
                    {clientsRemaining > 0 ? (
                      <>Faltam <span className="text-foreground font-semibold">{clientsRemaining}</span> {clientsRemaining === 1 ? "cliente ativo" : "clientes ativos"} para subir para {LEVEL_META[nextTier.key].label}.</>
                    ) : (
                      "Você atingiu a meta — o upgrade será revisado pelo time."
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="lg:border-l lg:border-border/60 lg:pl-8 space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Topo da carreira
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>Você é Platinum — comissão máxima do programa.</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* LEVEL LADDER */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Carreira completa
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiers.map((tier, idx) => {
            const isCurrent = tier.key === currentLevel;
            const isUnlocked = idx <= currentIdx;
            const meta = LEVEL_META[tier.key];
            const Icon = meta.icon;

            return (
              <Card
                key={tier.key}
                className={cn(
                  "relative overflow-hidden border border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300",
                  isCurrent
                    ? "hover:border-border/60"
                    : "hover:-translate-y-0.5 hover:border-border/60 hover:shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.15)]",
                  !isUnlocked && "opacity-75",
                )}
              >
                {/* soft accent glow blob — same pattern as StatCard */}
                <div className={cn("pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-50 bg-gradient-to-br to-transparent", `from-primary/15`)} />
                {isCurrent && (
                  <>
                    <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full blur-3xl opacity-60 bg-gradient-to-tr from-primary/20 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent" />
                    <div className="absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary ring-1 ring-primary/25">
                      Você está aqui
                    </div>
                  </>
                )}

                <CardContent className="relative p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("relative h-12 w-12 rounded-2xl flex items-center justify-center ring-1", meta.bg, meta.ring, meta.fg)}>
                      <Icon size={22} strokeWidth={2.25} />
                      {!isUnlocked && (
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background ring-1 ring-border/60 flex items-center justify-center">
                          <Lock size={10} className="text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-bold tracking-tight">{meta.label}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {tier.thresholdClients === 0
                          ? "Início"
                          : `≥ ${tier.thresholdClients} clientes ativos`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight">
                      {tier.commissionPercent.toFixed(0)}
                    </span>
                    <span className="text-base font-semibold text-muted-foreground">% comissão</span>
                  </div>

                  <ul className="space-y-1.5 pt-1 border-t border-border/40">
                    {tier.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2
                          size={13}
                          className={cn("mt-0.5 shrink-0", isUnlocked ? "text-emerald-500" : "text-muted-foreground/40")}
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA bottom */}
      {nextTier && (
        <Card className="relative overflow-hidden border-primary/20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full blur-3xl opacity-50 bg-gradient-to-tr from-primary/25 to-transparent" />
          <CardContent className="relative p-6 lg:p-7 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="space-y-1">
              <div className="text-base font-bold">
                Acelere sua jornada para {LEVEL_META[nextTier.key].label}
              </div>
              <p className="text-sm text-muted-foreground">
                Compartilhe seus links de campanha, ative sua audiência e suba de nível mais rápido. Cada cliente ativo conta.
              </p>
            </div>
            <a
              href="/partners"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-button shrink-0"
            >
              Compartilhar meu link <ArrowRight size={16} />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3.5",
        highlight && "border-primary/15",
      )}
    >
      {highlight && (
        <div className="pointer-events-none absolute -bottom-12 -right-10 h-28 w-28 rounded-full blur-2xl opacity-50 bg-gradient-to-tr from-primary/25 to-transparent" />
      )}
      <div className="relative flex items-center gap-2 mb-1">
        <Icon size={13} className={cn("text-muted-foreground", highlight && "text-primary")} />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="relative text-xl font-bold tracking-tight truncate">{value}</div>
      {hint && <div className="relative text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
