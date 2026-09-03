import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CreditCard, Plus, QrCode, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  brl,
  mockAutoReload,
  mockBalance,
  mockCards,
  mockTransactions,
} from "@/data/wiizeApiMocks";

export default function ApiBilling() {
  const { toast } = useToast();
  const [cards, setCards] = useState(mockCards);
  const [auto, setAuto] = useState(mockAutoReload.enabled);
  const demo = () =>
    toast({
      title: "Interface de demonstração",
      description: "Os meios de pagamento serão habilitados na implementação do backend.",
    });

  return (
    <>
      <Helmet>
        <title>Billing — Wiize API</title>
        <meta name="description" content="Saldo, métodos de pagamento, histórico de transações e recarga automática do Wiize API." />
      </Helmet>

      <PageHeader
        title="Billing"
        description="Saldo, métodos de pagamento, histórico e recarga automática."
        actions={
          <Button asChild className="gap-2">
            <Link to="/api/credits">
              <Plus size={16} /> Adicionar saldo
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Saldo disponível" value={brl(mockBalance.balance)} hint="Sem mensalidade" icon={Wallet} />
        <StatCard label="Consumo do mês" value={brl(mockBalance.costPeriod)} hint="Últimos 30 dias" icon={Receipt} />
        <StatCard
          label="Recarga automática"
          value={auto ? "Ativa" : "Desativada"}
          hint={auto ? `Abaixo de ${brl(mockAutoReload.threshold)} → +${brl(mockAutoReload.amount)}` : "Configure em Créditos"}
          icon={CreditCard}
        />
      </div>

      <SectionCard
        title="Forma de pagamento padrão"
        description="Cartão utilizado para adição de saldo em 1 clique"
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={demo}>
            <Plus size={14} /> Adicionar cartão
          </Button>
        }
      >
        {cards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão cadastrado."
            description="Salve um cartão para adicionar saldo com um clique."
            action={<Button onClick={demo}>Adicionar cartão</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {cards.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-12 items-center justify-center rounded-md bg-muted text-[11px] font-semibold">
                    {c.brand}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {c.brand} •••• {c.last4}
                    </p>
                    <p className="text-xs text-muted-foreground">Expira em {c.expiry}</p>
                  </div>
                  {c.isDefault && (
                    <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">Principal</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={c.isDefault}
                    onClick={() =>
                      setCards((prev) => prev.map((x) => ({ ...x, isDefault: x.id === c.id })))
                    }
                  >
                    Tornar padrão
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setCards((prev) => prev.filter((x) => x.id !== c.id))}
                  >
                    Remover
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <QrCode size={16} className="text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium">Pagamento via PIX</p>
              <p className="text-xs text-muted-foreground">
                Adição de saldo por QR Code — disponível na próxima etapa.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">Em preparação</Badge>
        </div>
      </SectionCard>

      <SectionCard
        title="Recarga automática"
        description="Evite interrupções mantendo saldo mínimo na conta"
        actions={<Switch checked={auto} onCheckedChange={setAuto} aria-label="Recarga automática" />}
      >
        <p className="text-sm text-muted-foreground">
          Quando seu saldo ficar abaixo de {brl(mockAutoReload.threshold)}, adicionaremos{" "}
          {brl(mockAutoReload.amount)} automaticamente usando {mockAutoReload.method}.{" "}
          <Link to="/api/credits" className="font-medium text-primary hover:underline">
            Configurar
          </Link>
        </p>
      </SectionCard>

      <SectionCard icon={Receipt} title="Histórico de transações" description="Adições de saldo e recargas">
        {mockTransactions.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma transação realizada." />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-sm">{t.date}</TableCell>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell className="text-sm">{t.method}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(t.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">
                        {t.status}
                      </Badge>
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
