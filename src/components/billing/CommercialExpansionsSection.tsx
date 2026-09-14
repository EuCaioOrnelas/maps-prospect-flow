import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Minus, Plus, Rocket, QrCode, CreditCard, ArrowRight, Check, Crown, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBumpsForPlan,
  profileToBumpSelection,
  type OrderBumpId,
  type OrderBumpSelection,
} from "@/config/orderBumps";

interface Props {
  /** Profile do usuário (fonte dos extra_*). */
  profile: any;
  /** Provedor de pagamento ativo: "stripe" | "asaas". */
  provider: string | null | undefined;
  /** Possui assinatura mensal ativa. */
  canPurchase: boolean;
  onChanged?: () => void;
  /** Exibe atalhos de troca de plano quando usado no Perfil. */
  showPlanActions?: boolean;
}

const currency = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CommercialExpansionsSection({ profile, provider, canPurchase, onChanged, showPlanActions = false }: Props) {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<OrderBumpId | null>(null);

  const planKey = (profile?.plan || "free").toLowerCase();
  const bumps = getBumpsForPlan(planKey);
  const selection = profileToBumpSelection(profile);
  const isPix = (provider || "").toLowerCase() === "asaas";

  if (bumps.length === 0 && !showPlanActions) return null;

  const applyDelta = async (id: OrderBumpId, delta: number) => {
    const next: OrderBumpSelection = { ...selection, [id]: Math.max(0, selection[id] + delta) };
    setPending(id);
    try {
      const { data, error } = await supabase.functions.invoke("update-subscription-bumps", {
        body: { bumps: next },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      try { await refreshProfile(); } catch { /* noop */ }
      toast({
        title: delta > 0 ? "Expansão contratada!" : "Expansão removida",
        description: isPix
          ? "Sua cobrança PIX recorrente foi atualizada com o novo valor mensal."
          : "Sua assinatura no cartão foi atualizada e a cobrança é proporcional.",
      });
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Não foi possível atualizar", description: e.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const totalExtraCents = bumps.reduce((acc, b) => acc + b.monthlyPriceCents * selection[b.id], 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="relative overflow-hidden border-border/60 shadow-none">
        <CardHeader className="relative border-b border-border/60 bg-muted/20 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
                  <Rocket className="h-4 w-4 text-primary" />
                </div>
                Expanda sua operação
              </CardTitle>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Aumente a capacidade da sua conta sem interromper o trabalho da equipe. Pague apenas pelos recursos adicionais ativos.
              </p>
            </div>
            {canPurchase && (
              <Badge variant="outline" className="w-fit gap-1.5 bg-background text-[10px] font-medium">
                {isPix ? <QrCode className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                {isPix ? "Atualiza o próximo PIX" : "Ajuste proporcional no cartão"}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-5 p-4 sm:p-6">
          {bumps.length > 0 && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {bumps.map((b) => {
                const qty = selection[b.id];
                const busy = pending === b.id;
                const delivered = b.id === "numbers"
                  ? "+1 número e +1 colaborador"
                  : `+${b.step.toLocaleString("pt-BR")} ${b.unit}`;
                return (
                  <section key={b.id} className="flex min-w-0 flex-col border border-border/70 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60">
                        <b.icon className="h-4 w-4 text-primary" />
                      </div>
                      {qty > 0 && <Badge variant="secondary" className="text-[10px]">{qty} ativo{qty > 1 ? "s" : ""}</Badge>}
                    </div>
                    <div className="mt-4 min-h-[108px]">
                      <p className="text-sm font-semibold text-foreground">{b.title}</p>
                      <p className="mt-1 text-xs font-medium text-primary">{delivered}</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{b.description}</p>
                    </div>
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {currency(b.monthlyPriceCents)}
                        <span className="text-[11px] font-medium text-muted-foreground">/mês</span>
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex h-9 items-center rounded-md border border-border bg-background p-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-sm"
                            disabled={!canPurchase || busy || qty <= 0}
                            onClick={() => applyDelta(b.id, -1)}
                            aria-label={`Remover ${b.title}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-7 text-center text-sm font-bold tabular-nums">{qty}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-sm"
                            disabled={!canPurchase || busy}
                            onClick={() => applyDelta(b.id, 1)}
                            aria-label={`Adicionar ${b.title}`}
                          >
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          </Button>
                        </div>
                        <Button size="sm" className="h-9 gap-1.5 px-3 text-xs" disabled={!canPurchase || busy} onClick={() => applyDelta(b.id, 1)}>
                          Adicionar <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {showPlanActions && (
            <section className="grid gap-4 border border-border/70 bg-muted/20 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Crown className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {planKey === "start" ? "Desbloqueie a operação comercial completa" : planKey === "growth" ? "Plano Growth IA ativo" : "Escolha o plano ideal"}
                    </p>
                    {planKey === "growth" && <Badge variant="secondary" className="gap-1 text-[10px]"><Check className="h-3 w-3" /> Ativo</Badge>}
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                    {planKey === "start"
                      ? "Faça upgrade para Growth IA e libere geração de oportunidades, diagnóstico comercial e agentes de IA."
                      : "Compare planos, revise seus limites ou programe uma mudança para a próxima renovação."}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Upgrade imediato; downgrade na próxima renovação
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate(planKey === "start" ? "/upgrade?plan=growth" : "/minha-assinatura")} className="w-full gap-2 sm:w-auto">
                {planKey === "start" ? "Fazer upgrade" : "Gerenciar plano"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </section>
          )}

          {bumps.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Total de expansões ativas</p>
                <p className="text-[11px] text-muted-foreground">Valor recorrente somado ao seu plano</p>
              </div>
              <span className="text-base font-bold tabular-nums text-foreground">{currency(totalExtraCents)}/mês</span>
            </div>
          )}

          {!canPurchase && bumps.length > 0 && (
            <div className="flex items-start gap-2 border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Expansões ficam disponíveis para o dono de uma assinatura mensal ativa. Você pode revisar seu plano acima.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
