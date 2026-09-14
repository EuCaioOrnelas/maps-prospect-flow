import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Minus, Plus, Rocket, QrCode, CreditCard, ArrowRight, Check, Crown, ShieldCheck, Sparkles, Zap, Copy, ReceiptText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ORDER_BUMPS,
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
  /** Renderiza somente o catálogo, sem criar outro card/cabeçalho ao redor. */
  directCatalog?: boolean;
}

const currency = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CommercialExpansionsSection({ profile, provider, canPurchase, onChanged, showPlanActions = false, directCatalog = false }: Props) {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<OrderBumpId | null>(null);
  const [purchaseQuantities, setPurchaseQuantities] = useState<OrderBumpSelection>({ numbers: 1, contacts: 1, opportunities: 1 });
  const [confirming, setConfirming] = useState<OrderBumpId | null>(null);
  const [pixCharge, setPixCharge] = useState<{ paymentId: string; brCode: string; brCodeBase64: string; desired: OrderBumpSelection } | null>(null);

  const planKey = (profile?.plan || "free").toLowerCase();
  const planBumps = getBumpsForPlan(planKey);
  const bumps = planBumps.length > 0 ? planBumps : ORDER_BUMPS;
  const planSupportsBumps = planBumps.length > 0;
  const selection = profileToBumpSelection(profile);
  const isPix = (provider || "").toLowerCase() === "asaas";

  const confirmingBump = useMemo(() => bumps.find((b) => b.id === confirming) || null, [bumps, confirming]);

  const applyDelta = async (id: OrderBumpId, delta: number) => {
    const next: OrderBumpSelection = { ...selection, [id]: Math.max(0, selection[id] + delta) };
    setPending(id);
    try {
      const { data, error } = await supabase.functions.invoke("update-subscription-bumps", {
        body: { bumps: next },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.requiresPayment) {
        setPixCharge({
          paymentId: data.paymentId,
          brCode: data.brCode,
          brCodeBase64: data.brCodeBase64,
          desired: next,
        });
        return;
      }
      try { await refreshProfile(); } catch { /* noop */ }
      toast({
        title: delta > 0 ? "Expansão contratada!" : "Expansão removida",
        description: "A cobrança atual foi confirmada e a renovação mensal já inclui a nova capacidade.",
      });
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Não foi possível atualizar", description: e.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const confirmPixPayment = async () => {
    if (!pixCharge || !confirmingBump) return;
    setPending(confirmingBump.id);
    try {
      const { data, error } = await supabase.functions.invoke("update-subscription-bumps", {
        body: { mode: "confirm-pix", paymentId: pixCharge.paymentId, bumps: pixCharge.desired },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.paid) {
        toast({ title: "Pagamento ainda não identificado", description: "Após pagar o PIX, aguarde alguns segundos e tente confirmar novamente." });
        return;
      }
      await refreshProfile().catch(() => undefined);
      toast({ title: "Capacidade adicionada!", description: "Pagamento confirmado e próximas renovações atualizadas." });
      setPixCharge(null);
      setConfirming(null);
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Não foi possível confirmar", description: e.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const purchase = async (id: OrderBumpId) => {
    const quantity = purchaseQuantities[id];
    setConfirming(null);
    await applyDelta(id, quantity);
  };

  const totalExtraCents = bumps.reduce((acc, b) => acc + b.monthlyPriceCents * selection[b.id], 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className={directCatalog ? "border-0 bg-transparent shadow-none" : "relative overflow-hidden rounded-md border-border/70 shadow-sm"}>
        {!directCatalog && <CardHeader className="relative border-b border-border/60 bg-muted/20 pb-5 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
                  <Rocket className="h-4 w-4 text-primary" />
                </div>
                Expanda sua operação
              </CardTitle>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Compre números, colaboradores, contatos e oportunidades sem trocar de plano. Ajuste a quantidade e confirme para atualizar sua assinatura.
              </p>
            </div>
            {canPurchase && (
              <Badge variant="outline" className="w-fit gap-1.5 bg-background text-[10px] font-medium">
                {isPix ? <QrCode className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                {isPix ? "Atualiza o próximo PIX" : "Ajuste proporcional no cartão"}
              </Badge>
            )}
          </div>
        </CardHeader>}

        <CardContent className={directCatalog ? "relative space-y-5 p-0" : "relative space-y-5 p-4 sm:p-6"}>
          {bumps.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {bumps.map((b, index) => {
                const activeQty = selection[b.id];
                const purchaseQty = purchaseQuantities[b.id];
                const busy = pending === b.id;
                const delivered = b.id === "numbers"
                  ? "+1 número e +1 colaborador"
                  : `+${b.step.toLocaleString("pt-BR")} ${b.unit}`;
                const totalPrice = b.monthlyPriceCents * purchaseQty;
                return (
                  <section key={b.id} className="group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-colors hover:border-primary/35">
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                          <b.icon className="h-5 w-5 text-primary" />
                        </div>
                        {activeQty > 0 && <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] text-primary">Já contratado</Badge>}
                      </div>
                      <div className="mt-5 flex-1">
                        <p className="text-base font-semibold text-foreground">{b.title}</p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary"><Zap className="h-3.5 w-3.5" />{delivered} por pacote</p>
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{b.description}</p>
                      </div>
                      <div className="mt-auto border-t border-border/60 pt-5">
                        <p className="text-2xl font-bold tabular-nums text-foreground">
                          {currency(b.monthlyPriceCents)}
                          <span className="ml-1 text-[11px] font-medium text-muted-foreground">/mês por pacote</span>
                        </p>
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div className="flex h-10 items-center rounded-md border border-border bg-muted/25 p-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-sm"
                              disabled={busy || purchaseQty <= 1}
                              onClick={() => setPurchaseQuantities((current) => ({ ...current, [b.id]: Math.max(1, current[b.id] - 1) }))}
                              aria-label={`Diminuir quantidade de ${b.title}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold tabular-nums">{purchaseQty}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-sm"
                              disabled={busy || purchaseQty >= 99}
                              onClick={() => setPurchaseQuantities((current) => ({ ...current, [b.id]: Math.min(99, current[b.id] + 1) }))}
                              aria-label={`Aumentar quantidade de ${b.title}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button size="sm" className="h-10 flex-1 gap-1.5 px-3 text-xs" disabled={!canPurchase || !planSupportsBumps || busy} onClick={() => setConfirming(b.id)}>
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Adicionar <ArrowRight className="h-3.5 w-3.5" /></>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {showPlanActions && (
            <section className="grid gap-4 rounded-lg border border-border/70 bg-muted/20 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Crown className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {planKey === "start" ? "Faça upgrade para o Growth IA" : planKey === "growth" ? "Gerencie ou altere seu plano" : "Escolha o plano ideal"}
                    </p>
                    {planKey === "growth" && <Badge variant="secondary" className="gap-1 text-[10px]"><Check className="h-3 w-3" /> Ativo</Badge>}
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                    {planKey === "start"
                      ? "Clique em Fazer upgrade para comparar o Growth IA e confirmar a mudança. A ativação é imediata após a aprovação do pagamento."
                      : "Clique em Gerenciar plano para revisar cobrança, comprar adicionais ou solicitar uma mudança para a próxima renovação."}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Upgrade imediato; downgrade na próxima renovação
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate(planKey === "start" ? "/upgrade?plan=growth" : planKey === "free" ? "/upgrade" : "/minha-assinatura")} className="w-full gap-2 sm:w-auto">
                {planKey === "start" ? "Fazer upgrade" : planKey === "free" ? "Escolher plano" : "Gerenciar plano"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </section>
          )}

          {bumps.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Investimento atual em capacidade adicional</p>
                <p className="text-[11px] text-muted-foreground">Valor mensal dos adicionais já contratados</p>
              </div>
              <span className="text-base font-bold tabular-nums text-foreground">{currency(totalExtraCents)}/mês</span>
            </div>
          )}

          {(!canPurchase || !planSupportsBumps) && bumps.length > 0 && (
            <div className="flex items-start gap-2 border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {!planSupportsBumps
                ? "Adicionais são contratados nos planos Atendimento, Growth IA e Enterprise. Altere seu plano para ativar esta capacidade."
                : "Expansões ficam disponíveis para o dono de uma assinatura mensal ativa. Você pode revisar seu plano acima."}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(confirmingBump)} onOpenChange={(open) => { if (!open && !pending) { setConfirming(null); setPixCharge(null); } }}>
        <AlertDialogContent className="rounded-lg border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>{pixCharge ? "Pague com PIX para concluir" : "Resumo da expansão"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pixCharge ? "A capacidade será liberada assim que o pagamento for confirmado." : "Revise os dados antes de adicionar à sua assinatura."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmingBump && !pixCharge && (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3"><ReceiptText className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Detalhes da adição</span></div>
              <dl className="space-y-3 p-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Capacidade</dt><dd className="text-right font-medium">{confirmingBump.title}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Quantidade</dt><dd className="font-medium">{purchaseQuantities[confirmingBump.id]} pacote(s)</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Valor adicionado</dt><dd className="font-medium">{currency(confirmingBump.monthlyPriceCents * purchaseQuantities[confirmingBump.id])}/mês</dd></div>
                <div className="flex justify-between gap-4 border-t border-border pt-3"><dt className="font-semibold">Novo investimento em adicionais</dt><dd className="font-bold text-primary">{currency(totalExtraCents + confirmingBump.monthlyPriceCents * purchaseQuantities[confirmingBump.id])}/mês</dd></div>
              </dl>
            </div>
          )}
          {pixCharge && (
            <div className="space-y-4">
              {pixCharge.brCodeBase64 && <div className="flex justify-center rounded-md border border-border bg-card p-4"><img src={pixCharge.brCodeBase64.startsWith("data:") ? pixCharge.brCodeBase64 : `data:image/png;base64,${pixCharge.brCodeBase64}`} alt="QR Code PIX da capacidade adicional" className="h-44 w-44" /></div>}
              <Button variant="outline" className="w-full gap-2" onClick={() => { navigator.clipboard.writeText(pixCharge.brCode); toast({ title: "Código PIX copiado" }); }}><Copy className="h-4 w-4" /> Copiar código PIX</Button>
            </div>
          )}
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            {isPix ? "Você paga a adição agora via PIX. Após a confirmação, o novo total também será aplicado às próximas renovações." : "O cartão será cobrado agora pelo ajuste proporcional deste ciclo. Nas próximas renovações, o valor mensal completo será incluído."}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(pending)}>Voltar</AlertDialogCancel>
            {pixCharge
              ? <AlertDialogAction disabled={Boolean(pending)} onClick={(event) => { event.preventDefault(); void confirmPixPayment(); }}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Já paguei, confirmar</AlertDialogAction>
              : <AlertDialogAction disabled={Boolean(pending)} onClick={(event) => { event.preventDefault(); if (confirmingBump) void purchase(confirmingBump.id); }}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirmar e pagar</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
