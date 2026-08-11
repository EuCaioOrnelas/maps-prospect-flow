import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import type { Sale } from "@/hooks/useSales";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  expired: "Expirado",
  cancelled: "Cancelado",
  renewed: "Renovado",
};

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "";

interface Props {
  sales: Sale[];
  memberNameById?: Record<string, string>;
}

export function ExportSalesButton({ sales, memberNameById = {} }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (sales.length === 0) {
      toast.error("Nenhuma venda para exportar com os filtros atuais");
      return;
    }
    setExporting(true);
    try {
      const rows = sales.map((s) => {
        const months = s.sale_type === "recurring" ? Number(s.contract_months || 1) : 1;
        const total = s.sale_type === "recurring" ? Number(s.value || 0) * months : Number(s.value || 0);
        return {
          "Nome do cliente": s.lead?.company_name || s.lead?.contact_name || s.title || "",
          Contato: s.lead?.contact_name || "",
          Telefone: s.lead?.phone || "",
          Valor: Number(s.value || 0),
          "Tempo de contrato":
            s.sale_type === "recurring" ? `${months} ${months === 1 ? "mês" : "meses"}` : "Venda única",
          "Valor total do contrato": total,
          "Data de início": fmtDate(s.start_date),
          "Data de fim": fmtDate(s.expiration_date),
          Status: STATUS_LABELS[s.status] || s.status,
          Responsável: s.responsible_user_id ? memberNameById[s.responsible_user_id] || "" : "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 30 }, { wch: 24 }, { wch: 18 }, { wch: 14 },
        { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vendas");
      XLSX.writeFile(wb, `vendas-wiize-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} venda(s) exportada(s)`);
    } catch (e) {
      console.error("[ExportSalesButton]", e);
      toast.error("Erro ao exportar planilha");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
      <FileSpreadsheet className="w-3.5 h-3.5" />
      Exportar planilha
    </Button>
  );
}
