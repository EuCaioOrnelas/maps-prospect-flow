import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Wallet, Coins, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader, StatCard, SectionCard } from "@/components/wiize-api/WiizeApiUI";
import {
  brl,
  mockAutoReload,
  mockBalance,
  mockCreditPackages,
  tokensForAmount,
  WIIZE_TOKEN_PRICE,
} from "@/data/wiizeApiMocks";

export default function ApiCredits() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<number | "custom">(50);
  const [custom, setCustom] = useState("100");
  const [auto, setAuto] = useState(mockAutoReload.enabled);
  const [threshold, setThreshold] = useState(String(mockAutoReload.threshold));
  const [reloadAmount, setReloadAmount] = useState(String(mockAutoReload.amount));

  const amount = useMemo(() => {
    const v = selected === "custom" ? Number(custom.replace(",", ".")) : selected;
    return Number.isFinite(v) ? v : 0;
  }, [selected, custom]);

  const tokens = tokensForAmount(amount);
  const belowMin = amount < 30;

  return (
    <>
      <Helmet>
        <title>Créditos — Wiize API</title>
        <meta name="description" content="Adicione saldo à sua conta e use a inteligência da Wiize conforme precisar." />
      </Helmet>

      <PageHeader
        title="Créditos"
        description="Adicione saldo à sua conta e use a inteligência da Wiize conforme precisar."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Saldo atual" value={brl(mockBalance.balance)} hint="Disponível para consumo" icon={Wallet} />
        <StatCard
          label="Wiize Tokens"
          value={mockBalance.tokensAvailable.toLocaleString("pt-BR")}
          hint="Equivalente ao saldo atual"
          icon={Coins}
        />
        <StatCard label="Preço do token" value={brl(WIIZE_TOKEN_PRICE)} hint="1 Wiize Token" icon={Zap} />
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info size={15} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.75} />
        Não existe mensalidade. Você adiciona saldo em reais e o consumo das APIs é debitado em
        Wiize Tokens — saldo e tokens são exibidos separadamente para total clareza.
      </div>

      <SectionCard title="Adicionar saldo" description="Escolha um pacote ou defina o valor desejado">
        <div className="grid gap-3 sm:grid-cols-3">
          {mockCreditPackages.map((p) => (
            <button
              key={p.amount}
              onClick={() => setSelected(p.amount)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-colors",
                selected === p.amount
                  ? "border-primary bg-primary/[0.04]"
                  : "border-border hover:bg-muted/40",
              )}
            >
              {p.highlight && (
                <Badge className="absolute right-3 top-3 bg-primary/10 text-[10px] text-primary hover:bg-primary/10">
                  Mais popular
                </Badge>
              )}
              <div className="text-xl font-semibold tracking-tight">{brl(p.amount)}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{p.label}</div>
              <div className="mt-3 text-xs tabular-nums text-muted-foreground">
                ≈ {Math.floor(tokensForAmount(p.amount)).toLocaleString("pt-BR")} tokens
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="custom-amount">Quanto deseja adicionar?</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="custom-amount"
                  inputMode="decimal"
                  className="pl-9"
                  value={custom}
                  onFocus={() => setSelected("custom")}
                  onChange={(e) => {
                    setSelected("custom");
                    setCustom(e.target.value);
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Valor mínimo de R$ 30,00.</p>
            </div>

            <div className="flex-1 rounded-lg bg-muted/50 p-3.5">
              <p className="text-xs text-muted-foreground">Você receberá aproximadamente</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {Math.floor(tokens || 0).toLocaleString("pt-BR")} Wiize Tokens
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">1 Wiize Token = R$ 0,15</p>
            </div>
          </div>

          <Button
            className="mt-4 w-full sm:w-auto"
            disabled={belowMin}
            onClick={() =>
              toast({
                title: "Interface de demonstração",
                description: "O pagamento será habilitado na implementação do backend.",
              })
            }
          >
            Adicionar saldo
          </Button>
          {belowMin && (
            <p className="mt-2 text-xs text-destructive">Informe um valor igual ou superior a R$ 30,00.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Recarga automática"
        description="Evite interrupções adicionando saldo automaticamente quando sua conta atingir um limite."
        actions={<Switch checked={auto} onCheckedChange={setAuto} aria-label="Recarga automática" />}
      >
        <div className={cn("grid gap-4 sm:grid-cols-3", !auto && "pointer-events-none opacity-50")}>
          <div className="space-y-2">
            <Label htmlFor="threshold">Quando o saldo estiver abaixo de</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input id="threshold" className="pl-9" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reload">Adicionar automaticamente</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input id="reload" className="pl-9" value={reloadAmount} onChange={(e) => setReloadAmount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Método de pagamento</Label>
            <div className="flex h-10 items-center rounded-md border border-input px-3 text-sm text-muted-foreground">
              {mockAutoReload.method}
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-muted/50 px-3.5 py-3 text-xs text-muted-foreground">
          Quando seu saldo ficar abaixo de {brl(Number(threshold) || 0)}, adicionaremos{" "}
          {brl(Number(reloadAmount) || 0)} automaticamente.
        </p>
      </SectionCard>
    </>
  );
}
