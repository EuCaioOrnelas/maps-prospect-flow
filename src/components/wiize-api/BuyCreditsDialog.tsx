import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wallet,
  CreditCard,
  Copy,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { StripeCardForm, type StripeCardFormHandle } from "@/components/checkout/StripeCardForm";

import {
  brl,
  creditPackages,
  MAX_TOPUP_BRL,
  MIN_TOPUP_BRL,
  tokensForAmount,
  WIIZE_TOKEN_PRICE,
} from "@/data/wiizeApi";
import {
  cancelTopup,
  checkTopupStatus,
  fetchPendingTopup,
  resumeCardTopup,
  useCreateTopup,
  useCreateCardTopup,
  useChargeSavedCard,
  useApiPaymentMethods,
  useSetDefaultPaymentMethod,
  type ApiTopup,
} from "@/hooks/useWiizeApi";

type Step = "method" | "amount" | "card" | "payment" | "done";
type CardMode = "new" | "saved";

function qrSrc(image: string) {
  return image.startsWith("data:") ? image : `data:image/png;base64,${image}`;
}

/** Máscara simples de reais inteiros: "1234" -> "R$ 1.234" */
function maskBRL(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (!digits) return "";
  return `R$ ${Number(digits).toLocaleString("pt-BR")}`;
}

function unmaskBRL(masked: string) {
  const digits = masked.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function BuyCreditsDialog({
  open,
  onOpenChange,
  resumeTopup = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  resumeTopup?: ApiTopup | null;
}) {
  return (
    <Elements stripe={stripePromise}>
      <BuyCreditsDialogInner open={open} onOpenChange={onOpenChange} resumeTopup={resumeTopup} />
    </Elements>
  );
}

function BuyCreditsDialogInner({
  open,
  onOpenChange,
  resumeTopup,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  resumeTopup?: ApiTopup | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const stripe = useStripe();
  const elements = useElements();
  const createTopup = useCreateTopup();
  const createCardTopup = useCreateCardTopup();
  const chargeSaved = useChargeSavedCard();
  const { data: savedMethods = [] } = useApiPaymentMethods();
  const setDefault = useSetDefaultPaymentMethod();

  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [selected, setSelected] = useState<number | "custom">(50);
  const [custom, setCustom] = useState("R$ 100");
  const [topup, setTopup] = useState<ApiTopup | null>(null);
  const [pending, setPending] = useState<ApiTopup | null>(null);
  const [checking, setChecking] = useState(false);
  const [needs3ds, setNeeds3ds] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Cartão
  const [cardMode, setCardMode] = useState<CardMode>("saved");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardHolder, setCardHolder] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [cvcFocused, setCvcFocused] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [paying, setPaying] = useState(false);
  const cardFormRef = useRef<StripeCardFormHandle>(null);

  const amount = useMemo(
    () => (selected === "custom" ? unmaskBRL(custom) : selected),
    [selected, custom],
  );

  const tokens = tokensForAmount(amount);
  const invalid = amount < MIN_TOPUP_BRL || amount > MAX_TOPUP_BRL;

  useEffect(() => {
    if (!open) {
      setStep("method");
      setTopup(null);
      setPending(null);
      setMethod("pix");
      setNeeds3ds(null);
      setCardMode(savedMethods.length ? "saved" : "new");
      setSelectedCardId(savedMethods.find((m) => m.is_default)?.id || savedMethods[0]?.id || null);
      return;
    }
    let active = true;
    (async () => {
      const pendingTopup = resumeTopup ?? (await fetchPendingTopup().catch(() => null));
      if (!active) return;
      setPending(pendingTopup ?? null);
      if (resumeTopup) {
        setTopup(resumeTopup);
        setMethod(resumeTopup.method === "card" ? "card" : "pix");
        setStep("payment");
        if (resumeTopup.method === "card") void tryResume3ds(resumeTopup.id);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, savedMethods, resumeTopup]);

  /** Se o usuário saiu para o app do banco e voltou, recupera o desafio 3DS. */
  const tryResume3ds = async (topupId: string) => {
    try {
      const r = await resumeCardTopup(topupId);
      if (r.status === "succeeded" || r.status === "paid") {
        setStep("done");
        qc.invalidateQueries({ queryKey: ["wiize-api"] });
        return;
      }
      if ((r.status === "requires_action" || r.status === "requires_source_action") && r.client_secret) {
        setNeeds3ds(r.client_secret);
      }
    } catch {
      /* silencioso: o polling continua */
    }
  };

  const runCardAction = async (clientSecret: string) => {
    if (!stripe) return;
    setPaying(true);
    try {
      const confirm = await stripe.handleCardAction(clientSecret);
      if (confirm.error) throw new Error(confirm.error.message || "Falha na confirmação do banco.");
      const done = await stripe.confirmCardPayment(clientSecret);
      if (done.error) throw new Error(done.error.message || "Falha na confirmação do banco.");
      if (done.paymentIntent?.status === "succeeded") {
        setNeeds3ds(null);
        setStep("done");
        qc.invalidateQueries({ queryKey: ["wiize-api"] });
      }
    } catch (e) {
      toast({
        title: "Confirmação não concluída",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (step !== "payment" || !topup) return;
    const tick = async () => {
      try {
        const status = await checkTopupStatus(topup.id);
        if (status === "paid") {
          setStep("done");
          qc.invalidateQueries({ queryKey: ["wiize-api"] });
        } else if (status === "canceled") {
          setTopup(null);
          setStep("amount");
        }
      } catch {
        /* retry */
      }
    };
    tick();
    pollRef.current = window.setInterval(tick, 6000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [step, topup, qc]);

  const handlePixGenerate = async () => {
    try {
      const created = await createTopup.mutateAsync(amount);
      setTopup(created);
      setStep("payment");
    } catch (e) {
      toast({
        title: "Não foi possível gerar o PIX",
        description: e instanceof Error ? e.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const handleCardPayment = async () => {
    if (!stripe || !elements) {
      toast({ title: "Estamos preparando o pagamento, aguarde um instante", variant: "destructive" });
      return;
    }
    setPaying(true);
    try {
      // Cartão já salvo: cobrança em 1 clique, sem novo 3DS (já autenticado na 1ª compra).
      if (cardMode === "saved" && selectedCardId) {
        await setDefault.mutateAsync(selectedCardId);
        const result = await chargeSaved.mutateAsync(amount);
        if (result.status === "paid") {
          setStep("done");
          qc.invalidateQueries({ queryKey: ["wiize-api"] });
          return;
        }
        setTopup(result.topup);
        setStep("payment");
        if (result.status === "requires_action" && result.client_secret) {
          setNeeds3ds(result.client_secret);
          await runCardAction(result.client_secret);
        }
        return;
      }

      // Primeiro cartão: 3DS obrigatório.
      const paymentMethodId = await cardFormRef.current!.createPaymentMethod({
        name: cardHolder,
        email: "",
      });

      const setup = await createCardTopup.mutateAsync({ amount_brl: amount, save_card: saveCard });
      setTopup(setup.topup);
      setStep("payment");
      setNeeds3ds(setup.client_secret);

      const confirm = await stripe.confirmCardPayment(setup.client_secret, {
        payment_method: paymentMethodId,
        ...(saveCard ? { setup_future_usage: "off_session" as const } : {}),
      });

      if (confirm.error) throw new Error(confirm.error.message || "Falha no pagamento do cartão.");
      if (confirm.paymentIntent?.status === "succeeded") {
        setNeeds3ds(null);
        setStep("done");
        qc.invalidateQueries({ queryKey: ["wiize-api"] });
      }
    } catch (e) {
      toast({
        title: "Erro no pagamento",
        description: e instanceof Error ? e.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  const copyPix = async () => {
    if (!topup?.pix_payload) return;
    await navigator.clipboard.writeText(topup.pix_payload);
    toast({ title: "Código PIX copiado" });
  };

  const manualCheck = async () => {
    if (!topup) return;
    setChecking(true);
    try {
      const status = await checkTopupStatus(topup.id);
      if (status === "paid") {
        setStep("done");
        qc.invalidateQueries({ queryKey: ["wiize-api"] });
      } else {
        toast({
          title: "Pagamento ainda não identificado",
          description: "Assim que for compensado o saldo entra automaticamente.",
        });
      }
    } finally {
      setChecking(false);
    }
  };

  const discard = async () => {
    if (!topup) return;
    await cancelTopup(topup.id).catch(() => null);
    qc.invalidateQueries({ queryKey: ["wiize-api", "topups"] });
    setTopup(null);
    setNeeds3ds(null);
    setStep("amount");
  };

  const canPayCard =
    (cardMode === "saved" && !!selectedCardId) ||
    (cardMode === "new" && cardComplete && cardHolder.trim().length > 2);

  const termsNote = (
    <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
      Ao continuar você concorda com os{" "}
      <a href="/termos" target="_blank" className="text-primary underline underline-offset-2">
        Termos de Uso
      </a>{" "}
      e a{" "}
      <a href="/privacidade" target="_blank" className="text-primary underline underline-offset-2">
        Política de Privacidade
      </a>
      . Créditos pré-pagos, sem validade e não reembolsáveis após o consumo.
    </p>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "method" && "Comprar créditos"}
            {step === "amount" && "Escolha o valor"}
            {step === "card" && "Dados do cartão"}
            {step === "payment" && (method === "card" ? "Confirmando pagamento" : "Pagamento PIX")}
            {step === "done" && "Saldo creditado"}
          </DialogTitle>
          <DialogDescription>
            {step === "method" && "Selecione a forma de pagamento da recarga."}
            {step === "amount" && "O valor é convertido em Wiize Tokens na hora do pagamento."}
            {step === "card" && "Seus dados vão direto e criptografados para a operadora."}
            {step === "payment" &&
              (method === "card"
                ? "Confirmando o pagamento com o banco emissor…"
                : "Pague o QR Code para creditar o saldo automaticamente.")}
            {step === "done" && "Pagamento confirmado com sucesso."}
          </DialogDescription>
        </DialogHeader>

        {/* Passo 1 — método */}
        {step === "method" && (
          <div className="space-y-3">
            {pending && (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Cobrança pendente de {brl(pending.amount_brl)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Você pode finalizá-la ou seguir com uma nova recarga.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTopup(pending);
                    setMethod(pending.method === "card" ? "card" : "pix");
                    setStep("payment");
                    if (pending.method === "card") void tryResume3ds(pending.id);
                  }}
                >
                  Finalizar
                </Button>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setMethod("pix");
                setStep("amount");
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-primary/[0.03]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-hover bg-primary/10">
                <Wallet size={18} className="text-primary" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">PIX</span>
                <span className="block text-xs text-muted-foreground">
                  Confirmação em segundos, sem taxas adicionais
                </span>
              </span>
              <ArrowRight size={16} className="text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod("card");
                setStep("amount");
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-primary/[0.03]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-hover bg-primary/10">
                <CreditCard size={18} className="text-primary" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Cartão de crédito</span>
                <span className="block text-xs text-muted-foreground">
                  Pague agora e salve para recargas automáticas
                </span>
              </span>
              <ArrowRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Passo 2 — valor */}
        {step === "amount" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {creditPackages.map((p) => {
                const active = selected === p.amount;
                return (
                  <button
                    key={p.amount}
                    type="button"
                    onClick={() => setSelected(p.amount)}
                    className={cn(
                      "relative rounded-xl border p-3 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    {active && (
                      <CheckCircle2 size={16} className="absolute right-3 top-3 text-primary" />
                    )}
                    <div className="text-base font-semibold text-foreground">{brl(p.amount)}</div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {tokensForAmount(p.amount).toLocaleString("pt-BR")} tokens
                    </p>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelected("custom")}
                className={cn(
                  "relative rounded-xl border p-3 text-left transition-colors",
                  selected === "custom" ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                {selected === "custom" && (
                  <CheckCircle2 size={16} className="absolute right-3 top-3 text-primary" />
                )}
                <div className="text-base font-semibold text-foreground">Outro valor</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  De {brl(MIN_TOPUP_BRL)} a {brl(MAX_TOPUP_BRL)}
                </p>
              </button>
            </div>

            {selected === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="buy-custom" className="text-xs">
                  Valor personalizado (em reais)
                </Label>
                <Input
                  id="buy-custom"
                  value={custom}
                  inputMode="numeric"
                  placeholder="R$ 100"
                  className="max-w-[200px]"
                  onFocus={() => setSelected("custom")}
                  onChange={(e) => {
                    setCustom(maskBRL(e.target.value));
                    setSelected("custom");
                  }}
                />
                {invalid && (
                  <p className="text-xs text-destructive">
                    Informe um valor entre {brl(MIN_TOPUP_BRL)} e {brl(MAX_TOPUP_BRL)}.
                  </p>
                )}
              </div>
            )}

            {/* Resumo da compra */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium text-foreground">Resumo da compra</p>
              <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Wiize Tokens</span>
                  <span className="font-medium text-foreground">
                    {tokens.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Preço por token</span>
                  <span>{brl(WIIZE_TOKEN_PRICE)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Forma de pagamento</span>
                  <span>{method === "pix" ? "PIX" : "Cartão de crédito"}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-semibold text-foreground">{brl(amount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStep("method")}>
                <ArrowLeft size={14} /> Voltar
              </Button>
              {method === "pix" ? (
                <Button className="gap-2" disabled={invalid || createTopup.isPending} onClick={handlePixGenerate}>
                  {createTopup.isPending ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
                  Gerar QR Code
                </Button>
              ) : (
                <Button className="gap-2" disabled={invalid} onClick={() => setStep("card")}>
                  Continuar <ArrowRight size={15} />
                </Button>
              )}
            </div>

            {termsNote}
          </div>
        )}

        {/* Passo 3 — cartão */}
        {step === "card" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {tokens.toLocaleString("pt-BR")} Wiize Tokens
              </span>
              <span className="text-sm font-semibold text-foreground">{brl(amount)}</span>
            </div>


            <div className="rounded-xl border border-border bg-muted/20 p-4">
              {savedMethods.length > 0 && (
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">Cartões salvos</p>
                    <button
                      type="button"
                      onClick={() => setCardMode(cardMode === "saved" ? "new" : "saved")}
                      className="text-xs text-primary hover:underline"
                    >
                      {cardMode === "saved" ? "Usar outro cartão" : "Voltar aos salvos"}
                    </button>
                  </div>

                  {cardMode === "saved" && (
                    <div className="space-y-2">
                      {savedMethods.map((m) => (
                        <label
                          key={m.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                            selectedCardId === m.id ? "border-primary bg-primary/5" : "border-border",
                          )}
                        >
                          <input
                            type="radio"
                            name="saved-card"
                            checked={selectedCardId === m.id}
                            onChange={() => setSelectedCardId(m.id)}
                            className="accent-primary"
                          />
                          <CreditCard size={16} className="text-muted-foreground" />
                          <span className="min-w-0 flex-1 text-sm text-foreground">
                            {m.brand?.toUpperCase()} •••• {m.last4}
                          </span>
                          {m.is_default && (
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <Star size={10} /> Padrão
                            </Badge>
                          )}
                        </label>
                      ))}
                      <p className="text-[11px] text-muted-foreground">
                        Cartões já verificados não pedem a confirmação do banco novamente.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {cardMode === "new" && (
                <div className="space-y-3">
                  <StripeCardForm
                    ref={cardFormRef}
                    cardHolder={cardHolder}
                    nameCase="title"
                    onCardHolderChange={setCardHolder}
                    onCardChange={(d) => setCardComplete(!!d.complete)}
                    onCvcFocus={() => setCvcFocused(true)}
                    onCvcBlur={() => setCvcFocused(false)}
                    disabled={paying}
                  />
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="save-card"
                      checked={saveCard}
                      onCheckedChange={(v) => setSaveCard(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="save-card" className="text-xs font-normal text-muted-foreground">
                      Salvar cartão como padrão para recargas automáticas e compras com 1 clique
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Na primeira compra o banco pede uma confirmação (3D Secure). Nas próximas, não.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStep("amount")}>
                <ArrowLeft size={14} /> Voltar
              </Button>
              <Button className="gap-2" disabled={invalid || paying || !canPayCard} onClick={handleCardPayment}>
                {paying ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                Pagar {brl(amount)}
              </Button>
            </div>

            {termsNote}
          </div>
        )}

        {/* Passo 4 — pagamento */}
        {step === "payment" && topup && (
          <div className="space-y-4">
            {method === "pix" ? (
              <>
                <div className="flex flex-col items-center gap-4">
                  {topup.pix_qr_image ? (
                    <img
                      src={qrSrc(topup.pix_qr_image)}
                      alt="QR Code PIX da recarga Wiize API"
                      className="h-48 w-48 rounded-xl border border-border bg-white p-2"
                    />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                      Use o código copia e cola abaixo
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{brl(topup.amount_brl)}</p>
                    <p className="text-xs text-muted-foreground">
                      {topup.tokens.toLocaleString("pt-BR")} Wiize Tokens
                    </p>
                  </div>
                </div>

                {topup.pix_payload && (
                  <>
                    <p className="max-h-24 overflow-y-auto break-all rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {topup.pix_payload}
                    </p>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={copyPix}>
                      <Copy size={14} /> Copiar código PIX
                    </Button>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <Loader2 size={28} className="animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">Aguardando confirmação do banco</p>
                <p className="text-xs text-muted-foreground">
                  {brl(topup.amount_brl)} · {topup.tokens.toLocaleString("pt-BR")} tokens
                </p>
                {needs3ds && (
                  <Button className="mt-1 gap-2" disabled={paying} onClick={() => runCardAction(needs3ds)}>
                    {paying && <Loader2 size={14} className="animate-spin" />}
                    Abrir confirmação do banco
                  </Button>
                )}
              </div>
            )}

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin text-primary" />
              Aguardando confirmação do pagamento…
            </p>

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={discard}>
                Cancelar recarga
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={manualCheck} disabled={checking}>
                {checking && <Loader2 size={13} className="animate-spin" />} Já paguei
              </Button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Pode fechar esta janela: o saldo é creditado automaticamente quando o pagamento for confirmado.
            </p>
          </div>
        )}

        {/* Passo 5 — concluído */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 size={22} className="text-primary" />
            </span>
            <p className="text-sm font-medium text-foreground">Saldo creditado na sua conta</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Seus Wiize Tokens já estão disponíveis para uso imediato nas chamadas da API.
            </p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Concluir
            </Button>
          </div>
        )}

        <p className="flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <ShieldCheck size={13} className="text-primary" /> Pagamento processado com criptografia e
          conciliação automática.
        </p>
      </DialogContent>
    </Dialog>
  );
}
