import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Download, Trash2, CalendarClock, Repeat, DollarSign } from "lucide-react";
import { useSales, type Sale } from "@/hooks/useSales";
import { SalesKPIs } from "./SalesKPIs";
import { RegisterSaleDialog } from "./RegisterSaleDialog";
import { toast } from "sonner";

interface LeadSalesBlockProps {
  leadId: string;
  leadName?: string;
  registerOpen?: boolean;
  onRegisterOpenChange?: (open: boolean) => void;
  initialValue?: number;
  initialTitle?: string;
  onSaleCreated?: () => void;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

const statusLabel: Record<string, { label: string; tone: string }> = {
  active: { label: "Ativo", tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  expired: { label: "Expirado", tone: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelado", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  renewed: { label: "Renovado", tone: "bg-primary/10 text-primary border-primary/30" },
};

export function LeadSalesBlock({
  leadId,
  leadName,
  registerOpen,
  onRegisterOpenChange,
  initialValue,
  initialTitle,
  onSaleCreated,
}: LeadSalesBlockProps) {
  const { sales, metrics, deleteSale, getAttachmentUrl, fetchSales } = useSales(leadId);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const dialogOpen = registerOpen ?? internalDialogOpen;
  const setDialogOpen = onRegisterOpenChange ?? setInternalDialogOpen;

  const handleDownload = async (path: string) => {
    const url = await getAttachmentUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Não foi possível abrir o arquivo");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta venda?")) return;
    await deleteSale(id);
    toast.success("Venda removida");
  };

  if (dialogOpen) {
    return (
      <RegisterSaleDialog
        open
        embedded
        embeddedLayout="page"
        onOpenChange={setDialogOpen}
        leadId={leadId}
        leadName={leadName}
        initialValue={initialValue}
        initialTitle={initialTitle}
        onCreated={() => {
          fetchSales();
          onSaleCreated?.();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Vendas & Receita</h3>
          <p className="text-xs text-muted-foreground">Histórico financeiro com este cliente</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nova venda
        </Button>
      </div>

      <SalesKPIs
        totalRevenue={metrics.totalRevenue}
        mrr={metrics.mrr}
        activeSales={metrics.activeSales}
        projected12mo={metrics.projected12mo}
        nextExpiration={metrics.nextExpiration}
        compact
      />

      {sales.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <DollarSign className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Ao mover este lead para "Fechado (Ganho)", você poderá registrar a venda.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {sales.map((s: Sale) => {
            const st = statusLabel[s.status] || statusLabel.active;
            const total = s.sale_type === "recurring" ? s.value * (s.contract_months || 1) : s.value;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm truncate">{s.title || "Venda sem título"}</h4>
                      <Badge variant="outline" className={st.tone}>{st.label}</Badge>
                      {s.sale_type === "recurring" && (
                        <Badge variant="outline" className="gap-1">
                          <Repeat className="w-3 h-3" />
                          {s.contract_months}m
                        </Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">{s.sale_type === "recurring" ? "Mensal" : "Valor"}</p>
                        <p className="font-semibold text-foreground">{fmtMoney(s.value)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total contrato</p>
                        <p className="font-semibold text-foreground">{fmtMoney(total)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Início</p>
                        <p className="font-medium">{fmtDate(s.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          Expira
                        </p>
                        <p className="font-medium">{fmtDate(s.expiration_date)}</p>
                      </div>
                    </div>
                    {(s.receipt_url || s.contract_url) && (
                      <div className="flex gap-2 mt-3">
                        {s.receipt_url && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDownload(s.receipt_url!)}>
                            <FileText className="w-3 h-3 mr-1" /> Comprovante
                          </Button>
                        )}
                        {s.contract_url && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDownload(s.contract_url!)}>
                            <Download className="w-3 h-3 mr-1" /> Contrato
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
