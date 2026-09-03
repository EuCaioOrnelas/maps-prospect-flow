import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Wallet,
  Receipt,
  Coins,
  QrCode,
  CreditCard,
  RefreshCw,
  Gift,
  SlidersHorizontal,
  Clock,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/wiize-api/WiizeApiUI";
import { BuyCreditsDialog } from "@/components/wiize-api/BuyCreditsDialog";
import { AutoReloadDialog } from "@/components/wiize-api/AutoReloadDialog";
import { brl, brlForTokens, tokensForAmount, WIIZE_TOKEN_PRICE } from "@/data/wiizeApi";
import {
  useApiTopups,
  useApiTransactions,
  useApiWallet,
  useUpdateWalletPrefs,
} from "@/hooks/useWiizeApi";

const statusLabel: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  expired: "Expirado",
  canceled: "Cancelado",
  failed: "Falhou",
};

const typeLabel: Record<string, string> = {
  CREDIT_PURCHASE: "Recarga",
  API_USAGE: "Consumo",
  REFUND: "Estorno",
  ADJUSTMENT: "Crédito concedido",
  BONUS: "Bônus",
  EXPIRATION: "Expiração",
  CHARGEBACK: "Chargeback",
  REVERSAL: "Reversão",
};


const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ApiBilling() {
  const { toast } = useToast();
  const { data: wallet, isLoading } = useApiWallet();
  const { data: transactions = [] } = useApiTransactions();
  const { data: topups = [] } = useApiTopups();
  const updatePrefs = useUpdateWalletPrefs();

  const [buyOpen, setBuyOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [lowBalance, setLowBalance] = useState<string | null>(null);

  const balance = wallet?.balance_tokens ?? 0;
  const spent = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "API_USAGE")
        .reduce((s, t) => s + Math.abs(t.tokens || 0), 0),
    [transactions],
  );
  const grants = useMemo(
    () => transactions.filter((t) => ["ADJUSTMENT", "BONUS", "REFUND"].includes(t.type)),
    [transactions],
  );


  const lowBalanceValue =
    lowBalance ?? String(brlForTokens(wallet?.low_balance_threshold_tokens ?? 500));

  const saveLowBalance = async () => {
    const n = Number(lowBalanceValue.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    try {
      await updatePrefs.mutateAsync({ low_balance_threshold_tokens: tokensForAmount(n) });
      toast({ title: "Preferências salvas" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Cobrança — Wiize API</title>
        <meta
          name="description"
          content="Saldo pré-pago, recargas via PIX, histórico de cobranças e preferências da sua conta Wiize API."
        />
      </Helmet>

      <PageHeader
        title="Cobrança"
        description="Pague pelo que usar. Sem mensalidade, sem contrato."
      />

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="methods">Formas de pagamento</TabsTrigger>
          <TabsTrigger value="history">Histórico de cobranças</TabsTrigger>
          <TabsTrigger value="grants">Créditos concedidos</TabsTrigger>
          <TabsTrigger value="prefs">Preferências</TabsTrigger>
        </TabsList>

        {/* Visão geral */}
        <TabsContent value="overview" className="space-y-5">
          <Card className="border-border/70 shadow-none">
            <CardContent className="p-5 sm:p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pague conforme o uso
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <span className="text-4xl font-semibold tracking-tight tabular-nums text-foreground">
                  {isLoading ? "—" : brl(brlForTokens(balance))}
                </span>
                <span className="pb-1.5 text-sm text-muted-foreground">
                  {balance.toLocaleString("pt-BR")} Wiize Tokens
                </span>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-hover bg-primary/10">
                    <RefreshCw size={16} className="text-primary" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      Recarga automática
                      <Badge
                        variant="outline"
                        className={
                          wallet?.auto_topup_enabled
                            ? "border-primary/30 bg-primary/10 text-[10px] text-primary"
                            : "text-[10px] text-muted-foreground"
                        }
                      >
                        {wallet?.auto_topup_enabled ? "ATIVA" : "DESATIVADA"}
                      </Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {wallet?.auto_topup_enabled
                        ? `Quando o saldo chegar em ${brl(brlForTokens(wallet.auto_topup_threshold_tokens))}, recarrega ${brl(wallet.auto_topup_amount_brl)}, com limite mensal de ${brl(wallet.auto_topup_monthly_limit_brl)}.`
                        : "Ative para nunca ficar sem saldo no meio de uma integração."}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAutoOpen(true)}>
                  Gerenciar recarga automática
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="gap-2" onClick={() => setBuyOpen(true)}>
                  <QrCode size={15} /> Comprar créditos
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total consumido"
              value={brl(brlForTokens(spent))}
              hint={`${spent.toLocaleString("pt-BR")} tokens`}
              icon={Receipt}
              loading={isLoading}
            />
            <StatCard
              label="Total recarregado"
              value={brl(brlForTokens(wallet?.lifetime_credited_tokens ?? 0))}
              hint="Desde o início da conta"
              icon={Coins}
              loading={isLoading}
            />
            <StatCard
              label="Preço do token"
              value={brl(WIIZE_TOKEN_PRICE)}
              hint="1 Wiize Token"
              icon={Wallet}
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <Info size={15} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.75} />
            Não existe mensalidade. Você adiciona saldo em reais e o consumo das APIs é debitado em
            Wiize Tokens a cada requisição bem-sucedida.
          </div>
        </TabsContent>

        {/* Formas de pagamento */}
        <TabsContent value="methods" className="space-y-5">
          <SectionCard
            icon={CreditCard}
            title="Formas de pagamento"
            description="Métodos disponíveis para adicionar saldo"
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-hover bg-primary/10">
                    <QrCode size={18} className="text-primary" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">PIX</p>
                    <p className="text-xs text-muted-foreground">
                      Confirmação em segundos e crédito automático no saldo
                    </p>
                  </div>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setBuyOpen(true)}>
                  Comprar créditos
                </Button>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4 opacity-70 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-hover bg-muted">
                    <CreditCard size={18} className="text-muted-foreground" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Cartão de crédito</p>
                    <p className="text-xs text-muted-foreground">
                      Em breve, com recarga automática no cartão
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1 self-start text-[10px] sm:self-auto">
                  <Clock size={10} /> Em breve
                </Badge>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={RefreshCw}
            title="Recarga automática"
            description="Mantenha o saldo sempre disponível"
            actions={
              <Button variant="outline" size="sm" onClick={() => setAutoOpen(true)}>
                Gerenciar
              </Button>
            }
          >
            <p className="text-sm text-muted-foreground">
              {wallet?.auto_topup_enabled
                ? `Ativa: recarrega ${brl(wallet.auto_topup_amount_brl)} quando o saldo chegar em ${brl(brlForTokens(wallet.auto_topup_threshold_tokens))}.`
                : "Desativada. Ative para gerar uma recarga PIX automaticamente quando o saldo ficar baixo."}
            </p>
          </SectionCard>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="history" className="space-y-5">
          <SectionCard icon={QrCode} title="Recargas" description="Cobranças geradas na sua conta">
            {topups.length === 0 ? (
              <EmptyState
                icon={QrCode}
                title="Nenhuma recarga gerada."
                description="Adicione saldo via PIX para começar a usar a API."
                action={<Button onClick={() => setBuyOpen(true)}>Comprar créditos</Button>}
              />
            ) : (
              <div className="-mx-5 overflow-x-auto px-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topups.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-sm">{fmtDate(t.created_at)}</TableCell>
                        <TableCell className="text-sm uppercase">{t.method}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(t.amount_brl)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.tokens.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={t.status === "paid" ? "default" : "outline"}
                            className={
                              t.status === "paid"
                                ? "bg-primary/10 text-[10px] text-primary hover:bg-primary/10"
                                : "text-[10px]"
                            }
                          >
                            {statusLabel[t.status] || t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={Receipt}
            title="Extrato da carteira"
            description="Créditos, consumos e ajustes"
          >
            {transactions.length === 0 ? (
              <EmptyState icon={Receipt} title="Nenhuma movimentação registrada." />
            ) : (
              <div className="-mx-5 overflow-x-auto px-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-sm">{fmtDate(t.created_at)}</TableCell>
                        <TableCell className="text-sm">{typeLabel[t.type] || t.type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.description || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.tokens > 0 ? `+${t.tokens}` : t.tokens}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {t.balance_after?.toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Créditos concedidos */}
        <TabsContent value="grants">
          <SectionCard
            icon={Gift}
            title="Créditos concedidos"
            description="Bônus, cortesias e estornos aplicados pela Wiize"
          >
            {grants.length === 0 ? (
              <EmptyState
                icon={Gift}
                title="Nenhum crédito concedido."
                description="Bônus promocionais e estornos aparecem aqui automaticamente."
              />
            ) : (
              <div className="-mx-5 overflow-x-auto px-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grants.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-sm">{fmtDate(t.created_at)}</TableCell>
                        <TableCell className="text-sm">{typeLabel[t.type] || t.type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.description || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {brl(brlForTokens(t.tokens))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.tokens > 0 ? `+${t.tokens}` : t.tokens}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Preferências */}
        <TabsContent value="prefs">
          <SectionCard
            icon={SlidersHorizontal}
            title="Preferências de cobrança"
            description="Alertas e limites da sua carteira"
          >
            <div className="max-w-sm space-y-4">
              <div className="space-y-2">
                <Label htmlFor="low-balance" className="text-xs">
                  Avisar quando o saldo ficar abaixo de (R$)
                </Label>
                <Input
                  id="low-balance"
                  value={lowBalanceValue}
                  inputMode="decimal"
                  onChange={(e) => setLowBalance(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enviamos um e-mail assim que o saldo cruzar esse limite.
                </p>
              </div>
              <Button onClick={saveLowBalance} disabled={updatePrefs.isPending} className="gap-2">
                {updatePrefs.isPending && <Loader2 size={14} className="animate-spin" />}
                Salvar preferências
              </Button>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <BuyCreditsDialog open={buyOpen} onOpenChange={setBuyOpen} />
      <AutoReloadDialog open={autoOpen} onOpenChange={setAutoOpen} wallet={wallet} />
    </>
  );
}
