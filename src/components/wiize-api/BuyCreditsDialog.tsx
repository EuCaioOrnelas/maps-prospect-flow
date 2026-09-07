import { useEffect, useMemo, useRef, useState } from "react";
import {
  QrCode,
  CreditCard,
  Copy,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
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
} from "@/data/wiizeApi";
import {
  acceptApiTerms,
  cancelTopup,
  checkTopupStatus,
  fetchPendingTopup,
  fetchTermsAcceptance,
  useCreateTopup,
  useCreateCardTopup,
  useChargeSavedCard,
  useApiPaymentMethods,
  useSetDefaultPaymentMethod,
  type ApiTopup,
} from "@/hooks/useWiizeApi";

type Step = "method" | "amount" | "payment" | "done";
type CardMode = "new" | "saved";

function qrSrc(image: string) {
  return image.startsWith("data:") ? image : `data:image/png;base64,${image}`;
}

export function BuyCreditsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Elements stripe={stripePromise}>
      <BuyCreditsDialogInner open={open} onOpenChange={onOpenChange} />
    </Elements>
  );
}

function BuyCreditsDialogInner({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
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
  const [custom, setCustom] = useState("100");
  const [accepted, setAccepted] = useState(false);
  const [termsSaved, setTermsSaved] = useState<boolean | null>(null);
  const [topup, setTopup] = useState<ApiTopup | null>(null);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Card form state
  const [cardMode, setCardMode] = useState<CardMode>("saved");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardHolder, setCardHolder] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [paying, setPaying] = useState(false);
  const cardFormRef = useRef<StripeCardFormHandle>(null);

  const amount = useMemo(() => {
    const v = selected === "custom" ? Number(custom.replace(",", ".")) : selected;
    return Number.isFinite(v) ? v : 0;
  }, [selected, custom]);

  const tokens = tokensForAmount(amount);
  const invalid = amount < MIN_TOPUP_BRL || amount > MAX_TOPUP_BRL;

  useEffect(() => {
    if (!open) {
      setStep("method");
      setTopup(null);
      setMethod("pix");
      setCardMode(savedMethods.length ? "saved" : "new");
      setSelectedCardId(savedMethods.find((m) => m.is_default)?.id || savedMethods[0]?.id || null);
      return;
    }
    let active = true;
    (async () => {
      const [acceptedAt, pending] = await Promise.all([
        fetchTermsAcceptance().catch(() => null),
        fetchPendingTopup().catch(() => null),
      ]);
      if (!active) return;
      setTermsSaved(!!acceptedAt);
      setAccepted(!!acceptedAt);
      if (pending) {
        setTopup(pending);
        setMethod(pending.method === "card" ? "card" : "pix");
        setStep("payment");
      }
    })();
    return () => {
      active = false;
    };
  }, [open, savedMethods]);

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

  const ensureTerms = async () => {
    if (!termsSaved) {
      await acceptApiTerms();
      setTermsSaved(true);
    }
  };

  const handlePixGenerate = async () => {
    try {
      await ensureTerms();
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
      toast({ title: "Stripe ainda está carregando", variant: "destructive" });
      return;
    }
    setPaying(true);
    try {
      await ensureTerms();

      if (cardMode === "saved" && selectedCardId) {
        await setDefault.mutateAsync(selectedCardId);
        const result = await chargeSaved.mutateAsync(amount);
        if (result.status === "paid") {
          setStep("done");
          qc.invalidateQueries({ queryKey: ["wiize-api"] });
          return;
        }
        if (result.status === "requires_action" && result.client_secret) {
          const confirm = await stripe.confirmCardPayment(result.client_secret);
          if (confirm.error) throw new Error(confirm.error.message || "Falha na autenticação 3D Secure.");
          if (confirm.paymentIntent?.status !== "succeeded") throw new Error("Pagamento não confirmado.");
          setStep("done");
          qc.invalidateQueries({ queryKey: ["wiize-api"] });
          return;
        }
        setTopup(result.topup);
        setStep("payment");
        return;
      }

      // Novo cartão
      const paymentMethodId = await cardFormRef.current!.createPaymentMethod({
        name: cardHolder,
        email: "",
      });

      const setup = await createCardTopup.mutateAsync({ amount_brl: amount, save_card: saveCard });
      setTopup(setup.topup);

      const confirm = await stripe.confirmCardPayment(setup.client_secret, {
        payment_method: paymentMethodId,
        ...(saveCard ? { setup_future_usage: "off_session" } : {}),
      });

      if (confirm.error) throw new Error(confirm.error.message || "Falha no pagamento do cartão.");
      if (confirm.paymentIntent?.status === "succeeded") {
        setStep("done");
        qc.invalidateQueries({ queryKey: ["wiize-api"] });
      } else {
        setStep("payment");
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
    setStep("amount");
  };

  const canPayCard = method === "card" && (
    (cardMode === "saved" && selectedCardId) ||
    (cardMode === "new" && cardComplete && cardHolder.length > 2)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "method" && "Comprar créditos"}
            {step === "amount" && "Escolha o valor"}
            {step === "payment" && (method === "card" ? "Processando cartão" : "Pagamento PIX")}
            {step === "done" && "Saldo creditado"}
          </DialogTitle>
          <DialogDescription>
            {step === "method" && "Selecione a forma de pagamento da recarga."}
            {step === "amount" && "O valor é convertido em Wiize Tokens na hora do pagamento."}
            {step === "payment" && (method === "card" ? "Confirmando o pagamento com o banco emissor…" : "Pague o QR Code para creditar o saldo automaticamente.")}
            {step === "done" && "Pagamento confirmado com sucesso."}
          </DialogDescription>
        </DialogHeader>

        {/* Passo 1 — método */}
        {step === "method" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setMethod("pix");
                setStep("amount");
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-hover bg-primary/10">
                <QrCode size={18} className="text-primary" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">PIX</span>
                <span className="block text-xs text-muted-foreground">Confirmação em segundos, sem taxas adicionais</span>
              </span>
              <ArrowRight size={16} className="text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod("card");
                setStep("amount");
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-hover bg-primary/10">
                <CreditCard size={18} className="text-primary" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Cartão de crédito</span>
                <span className="block text-xs text-muted-foreground">Pague agora e salve para recargas automáticas</span>
              </span>
              <ArrowRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Passo 2 — valor */}
        {step === "amount" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {creditPackages.map((p) => (
                <button
                  key={p.amount}
                  type="button"
                  onClick={() => setSelected(p.amount)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    selected === p.amount ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="text-base font-semibold text-foreground">{brl(p.amount)}</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {tokensForAmount(p.amount).toLocaleString("pt-BR")} tokens
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="buy-custom" className="text-xs">Valor personalizado</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="buy-custom"
                  value={custom}
                  inputMode="decimal"
                  className="max-w-[180px]"
                  onFocus={() => setSelected("custom")}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    setSelected("custom");
                  }}
                />
                <span className="text-sm text-muted-foreground">{tokens.toLocaleString("pt-BR")} Wiize Tokens</span>
              </div>
              {invalid && (
                <p className="text-xs text-destructive">
                  Informe um valor entre {brl(MIN_TOPUP_BRL)} e {brl(MAX_TOPUP_BRL)}.
                </p>
              )}
            </div>

            {/* Termos */}
            {termsSaved === false && (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
                <Checkbox
                  id="buy-terms"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="buy-terms" className="text-xs font-normal leading-relaxed text-muted-foreground">
                  Li e aceito os{" "}
                  <a href="/termos" target="_blank" className="text-primary underline underline-offset-2">Termos de Uso</a>{" "}
                  e a{" "}
                  <a href="/privacidade" target="_blank" className="text-primary underline underline-offset-2">Política de Privacidade</a>
                  . Os créditos são pré-pagos, não expiram e não são reembolsáveis após o consumo.
                </Label>
              </div>
            )}

            {/* Card form (se cartão) */}
            {method === "card" && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                {savedMethods.length > 0 && (
                  <div className="space-y-2">
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
                              selectedCardId === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
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
                      </div>
                    )}
                  </div>
                )}

                {cardMode === "new" && (
                  <div className="space-y-3">
                    <StripeCardForm
                      ref={cardFormRef}
                      cardHolder={cardHolder}
                      onCardHolderChange={setCardHolder}
                      onCardChange={(d) => setCardComplete(!!d.complete)}
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
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStep("method")}>
                <ArrowLeft size={14} /> Voltar
              </Button>
              {method === "pix" ? (
                <Button className="gap-2" disabled={invalid || !accepted || createTopup.isPending} onClick={handlePixGenerate}>
                  {createTopup.isPending ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
                  Gerar QR Code
                </Button>
              ) : (
                <Button className="gap-2" disabled={invalid || !accepted || paying || !canPayCard} onClick={handleCardPayment}>
                  {paying ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                  Pagar {brl(amount)}
                </Button>
              )}
            </div>

            {termsSaved && (
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Ao prosseguir você concorda com os{" "}
                <a href="/termos" target="_blank" className="text-primary underline underline-offset-2">Termos de Uso</a>{" "}
                e a{" "}
                <a href="/privacidade" target="_blank" className="text-primary underline underline-offset-2">Política de Privacidade</a>
                .
              </p>
            )}
          </div>
        )}

        {/* Passo 3 — pagamento */}
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
                    <p className="text-xs text-muted-foreground">{topup.tokens.toLocaleString("pt-BR")} Wiize Tokens</p>
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
              </div>
            )}

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin text-primary" />
              Aguardando confirmação do pagamento…
            </p>

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={discard}>Cancelar recarga</Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={manualCheck} disabled={checking}>
                {checking && <Loader2 size={13} className="animate-spin" />} Já paguei
              </Button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Pode fechar esta janela: o saldo é creditado automaticamente quando o pagamento for confirmado.
            </p>
          </div>
        )}

        {/* Passo 4 — concluído */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 size={22} className="text-primary" />
            </span>
            <p className="text-sm font-medium text-foreground">Saldo creditado na sua conta</p>
            <p className="max-w-xs text-xs text-muted-foreground">Seus Wiize Tokens já estão disponíveis para uso imediato nas chamadas da API.</p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>Concluir</Button>
          </div>
        )}

        <p className="flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <ShieldCheck size={13} className="text-primary" /> Pagamento processado com criptografia e conciliação automática.
        </p>
      </DialogContent>
    </Dialog>
  );
}
