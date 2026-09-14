import type { jsPDF as JsPdfType } from "jspdf";

export interface BillingInvoiceData {
  id: string;
  value: number;
  status: string;
  billingType: string;
  dueDate: string;
  paymentDate: string | null;
  description: string;
  customerName?: string | null;
  customerEmail?: string | null;
  planName?: string | null;
}

const date = (value: string | null) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export async function downloadBillingInvoicePdf(invoice: BillingInvoiceData) {
  const { jsPDF } = await import("jspdf");
  const doc: JsPdfType = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFillColor(16, 148, 105);
  doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("WIIZE", 18, 17);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Comprovante de cobrança", 18, 25);

  doc.setTextColor(20, 24, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Fatura", 18, 52);
  doc.setFontSize(10);
  doc.setTextColor(95, 102, 115);
  doc.text(`Identificador: ${invoice.id}`, 18, 60);

  const rows = [
    ["Cliente", invoice.customerName || "Cliente Wiize"],
    ["E-mail", invoice.customerEmail || "—"],
    ["Plano", invoice.planName || invoice.description || "Assinatura Wiize"],
    ["Forma de pagamento", invoice.billingType === "PIX" ? "PIX Automático" : invoice.billingType],
    ["Vencimento", date(invoice.dueDate)],
    ["Pagamento", date(invoice.paymentDate)],
    ["Status", invoice.status],
  ];

  let y = 76;
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      doc.setFillColor(247, 248, 250);
      doc.rect(18, y - 6, 174, 12, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(95, 102, 115);
    doc.text(label, 22, y + 1);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 24, 32);
    doc.text(String(value), 78, y + 1, { maxWidth: 108 });
    y += 13;
  });

  doc.setDrawColor(220, 224, 230);
  doc.line(18, y + 2, 192, y + 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 22, y + 15);
  doc.setTextColor(16, 148, 105);
  doc.setFontSize(20);
  doc.text(money(invoice.value), 192, y + 15, { align: "right" });

  doc.setTextColor(95, 102, 115);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Documento gerado pela Wiize com base nos dados oficiais da cobrança.", 18, 278);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 18, 284);
  doc.save(`fatura-wiize-${invoice.id}.pdf`);
}