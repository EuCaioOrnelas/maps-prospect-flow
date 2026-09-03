import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Minus, Plus, Rocket, QrCode, CreditCard } from "lucide-react";
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
}

const currency = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CommercialExpansionsSection({ profile, provider, canPurchase, onChanged }: Props) {
  const { refreshProfile } = useAuth();
  const [pending, setPending] = useState<OrderBumpId | null>(null);

  const planKey = (profile?.plan || "free").toLowerCase();
  const bumps = getBumpsForPlan(planKey);
  const selection = profileToBumpSelection(profile);
  const isPix = (provider || "").toLowerCase() === "asaas";

  if (bumps.length === 0) return null;

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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="border-border/50 shadow-md shadow-primary/[0.02] relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-500/[0.07] rounded-full blur-[70px]" />
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Rocket className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              Expansões comerciais
            </CardTitle>
            <Badge variant="outline" className="gap-1.5 text-[10px]">
              {isPix ? <QrCode className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
              {isPix ? "PIX recorrente automático" : "Cobrança no cartão em 1 clique"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Aumente seus limites de usuários, números, contatos e oportunidades sem trocar de plano.
            {isPix
              ? " O valor da sua cobrança PIX recorrente é atualizado automaticamente no próximo ciclo."
              : " A alteração entra na hora e é cobrada proporcionalmente no cartão."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {bumps.map((b) => {
              const qty = selection[b.id];
              const busy = pending === b.id;
              return (
                <div key={b.id} className="rounded-xl border border-border/50 bg-muted/20 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <b.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{b.title}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug flex-1">{b.description}</p>
                  <p className="text-xs font-bold text-foreground tabular-nums">
                    {currency(b.monthlyPriceCents)}
                    <span className="text-[10px] font-medium text-muted-foreground">/mês por {b.unit}</span>
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={!canPurchase || busy || qty <= 0}
                        onClick={() => applyDelta(b.id, -1)}
                        aria-label={`Remover ${b.title}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold tabular-nums w-6 text-center">{qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={!canPurchase || busy}
                        onClick={() => applyDelta(b.id, 1)}
                        aria-label={`Adicionar ${b.title}`}
                      >
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 text-[11px] px-2.5"
                      disabled={!canPurchase || busy}
                      onClick={() => applyDelta(b.id, 1)}
                    >
                      Contratar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-emerald-500/[0.04] p-3">
            <span className="text-xs text-muted-foreground">Total de expansões ativas</span>
            <span className="text-sm font-bold text-foreground tabular-nums">{currency(totalExtraCents)}/mês</span>
          </div>

          {!canPurchase && (
            <p className="text-[11px] text-muted-foreground/80">
              Expansões disponíveis apenas para assinaturas mensais ativas.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
