import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Wallet, Coins, Zap, Info, Plus, QrCode, Copy, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader, StatCard, SectionCard } from "@/components/wiize-api/WiizeApiUI";
import {
  brl,
  brlForTokens,
  creditPackages,
  MAX_TOPUP_BRL,
  MIN_TOPUP_BRL,
  tokensForAmount,
  WIIZE_TOKEN_PRICE,
} from "@/data/wiizeApi";
import {
  checkTopupStatus,
  useApiPricing,
  useApiWallet,
  useCreateTopup,
  type ApiTopup,
} from "@/hooks/useWiizeApi";
import { useQueryClient } from "@tanstack/react-query";

export default function ApiCredits() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: wallet, isLoading } = useApiWallet();
  const { data: pricing = [] } = useApiPricing();
  const createTopup = useCreateTopup();

  const [selected, setSelected] = useState<number | "custom">(50);
  const [custom, setCustom] = useState("100");
  const [topup, setTopup] = useState<ApiTopup | null>(null);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<number | null>(null);

  const amount = useMemo(() => {
    const v = selected === "custom" ? Number(custom.replace(",", ".")) : selected;
    return Number.isFinite(v) ? v : 0;
  }, [selected, custom]);

  const tokens = tokensForAmount(amount);
  const invalid = amount < MIN_TOPUP_BRL || amount > MAX_TOPUP_BRL;
  const balanceTokens = wallet?.balance_tokens ?? 0;

  useEffect(() => {
    if (!topup || paid) return;
    const tick = async () => {
      try {
        const status = await checkTopupStatus(topup.id);
        if (status === "paid") {
          setPaid(true);
          qc.invalidateQueries({ queryKey: ["wiize-api"] });
          toast({ title: "Pagamento confirmado", description: "Seu saldo foi creditado." });
        }
      } catch {
        /* silencioso: nova tentativa no próximo ciclo */
      }
    };
    pollRef.current = window.setInterval(tick, 6000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [topup, paid, qc, toast]);

  const handleCreate = async () => {
    try {
      const created = await createTopup.mutateAsync(amount);
      setPaid(false);
      setTopup(created);
    } catch (e) {
      toast({
        title: "Não foi possível gerar o PIX",
        description: e instanceof Error ? e.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const copyPix = async () => {
    if (!topup?.pix_payload) return;
    await navigator.clipboard.writeText(topup.pix_payload);
    toast({ title: "Código PIX copiado" });
  };

  return (
    <>
      <Helmet>
        <title>Créditos — Wiize API</title>
        <meta name="description" content="Adicione saldo à sua conta e use a inteligência da Wiize conforme precisar." />
      </Helmet>

      <PageHeader title="Créditos" description="Adicione saldo via PIX e use a inteligência da Wiize conforme precisar." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Saldo atual"
          value={brl(brlForTokens(balanceTokens))}
          hint="Disponível para consumo"
          icon={Wallet}
          loading={isLoading}
        />
        <StatCard
          label="Wiize Tokens"
          value={balanceTokens.toLocaleString("pt-BR")}
          hint="Equivalente ao saldo atual"
          icon={Coins}
          loading={isLoading}
        />
        <StatCard label="Preço do token" value={brl(WIIZE_TOKEN_PRICE)} hint="1 Wiize Token" icon={Zap} />
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info size={15} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.75} />
        Não existe mensalidade. Você adiciona saldo em reais e o consumo das APIs é debitado em Wiize Tokens.
      </div>

      {topup && !paid && (
        <SectionCard
          icon={QrCode}
          title="Pagamento PIX"
          description={`${brl(topup.amount_brl)} • ${topup.tokens.toLocaleString("pt-BR")} tokens`}
          actions={
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setTopup(null)}>
              <X size={14} /> Fechar
            </Button>
          }
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {topup.pix_qr_image && (
              <img
                src={`data:image/png;base64,${topup.pix_qr_image}`}
                alt="QR Code PIX para recarga da Wiize API"
                className="h-44 w-44 rounded-lg border border-border bg-background p-2"
              />
            )}
            <div className="min-w-0 flex-1 space-y-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin text-primary" />
                Aguardando confirmação do pagamento…
              </p>
              {topup.pix_payload && (
                <>
                  <p className="break-all rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {topup.pix_payload}
                  </p>
                  <Button size="sm" variant="outline" className="gap-2" onClick={copyPix}>
                    <Copy size={14} /> Copiar código PIX
                  </Button>
                </>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {paid && (
        <SectionCard icon={CheckCircle2} title="Saldo creditado" description="Pagamento confirmado com sucesso">
          <p className="text-sm text-muted-foreground">
            Seus Wiize Tokens já estão disponíveis para uso nas chamadas da API.
          </p>
        </SectionCard>
      )}

      <SectionCard icon={Plus} title="Adicionar saldo" description={`Mínimo ${brl(MIN_TOPUP_BRL)} • máximo ${brl(MAX_TOPUP_BRL)}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          {creditPackages.map((p) => (
            <button
              key={p.amount}
              onClick={() => setSelected(p.amount)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected === p.amount ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">{brl(p.amount)}</span>
                {p.highlight && <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">{p.label}</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {tokensForAmount(p.amount).toLocaleString("pt-BR")} Wiize Tokens
              </p>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="custom-amount" className="text-xs">Valor personalizado</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              id="custom-amount"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setSelected("custom");
              }}
              onFocus={() => setSelected("custom")}
              inputMode="decimal"
              className="max-w-[180px]"
              placeholder="100"
            />
            <span className="text-sm text-muted-foreground">
              {tokens.toLocaleString("pt-BR")} Wiize Tokens
            </span>
          </div>
          {invalid && (
            <p className="text-xs text-destructive">
              Informe um valor entre {brl(MIN_TOPUP_BRL)} e {brl(MAX_TOPUP_BRL)}.
            </p>
          )}
        </div>

        <Button className="mt-5 gap-2" disabled={invalid || createTopup.isPending} onClick={handleCreate}>
          {createTopup.isPending ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          Gerar PIX de {brl(amount)}
        </Button>
      </SectionCard>

      <SectionCard icon={Coins} title="Preços por operação" description="Consumo em Wiize Tokens por chamada">
        <ul className="divide-y divide-border/70">
          {pricing.map((p: { operation: string; label: string | null; tokens: number }) => (
            <li key={p.operation} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{p.label || p.operation}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.operation}</p>
              </div>
              <div className="text-right">
                <p className="text-sm tabular-nums text-foreground">{p.tokens} tokens</p>
                <p className="text-xs text-muted-foreground">{brl(brlForTokens(p.tokens))}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}
