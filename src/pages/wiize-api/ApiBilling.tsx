import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Plus, QrCode, Receipt, Wallet, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/wiize-api/WiizeApiUI";
import { brl, brlForTokens } from "@/data/wiizeApi";
import { useApiTopups, useApiTransactions, useApiWallet } from "@/hooks/useWiizeApi";

const statusLabel: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  expired: "Expirado",
  canceled: "Cancelado",
  failed: "Falhou",
};

const typeLabel: Record<string, string> = {
  credit: "Recarga",
  debit: "Consumo",
  refund: "Estorno",
  adjustment: "Ajuste manual",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function ApiBilling() {
  const { data: wallet, isLoading } = useApiWallet();
  const { data: transactions = [] } = useApiTransactions();
  const { data: topups = [] } = useApiTopups();

  const spent = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + Math.abs(t.tokens || 0), 0);

  return (
    <>
      <Helmet>
        <title>Billing — Wiize API</title>
        <meta name="description" content="Saldo, recargas via PIX e histórico de transações do Wiize API." />
      </Helmet>

      <PageHeader
        title="Billing"
        description="Saldo, recargas via PIX e histórico financeiro da sua conta API."
        actions={
          <Button asChild className="gap-2">
            <Link to="/api/credits">
              <Plus size={16} /> Adicionar saldo
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Saldo disponível"
          value={brl(brlForTokens(wallet?.balance_tokens ?? 0))}
          hint="Sem mensalidade"
          icon={Wallet}
          loading={isLoading}
        />
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
      </div>

      <SectionCard icon={QrCode} title="Recargas PIX" description="Cobranças geradas na sua conta">
        {topups.length === 0 ? (
          <EmptyState
            icon={QrCode}
            title="Nenhuma recarga gerada."
            description="Adicione saldo via PIX para começar a usar a API."
            action={
              <Button asChild>
                <Link to="/api/credits">Adicionar saldo</Link>
              </Button>
            }
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
                    <TableCell className="text-right tabular-nums">{t.tokens.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={t.status === "paid" ? "default" : "outline"}
                        className={t.status === "paid" ? "bg-primary/10 text-[10px] text-primary hover:bg-primary/10" : "text-[10px]"}
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

      <SectionCard icon={Receipt} title="Extrato da carteira" description="Créditos, consumos e ajustes">
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
                    <TableCell className="text-sm text-muted-foreground">{t.description || "—"}</TableCell>
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
    </>
  );
}
