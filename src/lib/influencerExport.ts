import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { fmtNum } from "@/lib/influencerProspecting";

const dt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "Não informado";

const contacts = (p: any) =>
  [p.contact_email, p.instagram_url, p.website_url].filter(Boolean).join(" | ") || "Não informado";

export function prospectsToRows(rows: any[]) {
  return rows.map((p) => ({
    Nome: p.channel_name || "Não informado",
    Handle: p.channel_handle || "Não informado",
    "Link do canal": p.channel_url || "Não informado",
    Contatos: contacts(p),
    Inscritos: Number(p.subscriber_count ?? 0),
    "Views médias": Number(p.avg_recent_views ?? 0),
    "Último vídeo": dt(p.latest_video_at),
    "Fit Score": Number(p.fit_score ?? 0),
    Categoria: p.fit_category || "Não informado",
    Recomendação: p.ai_recommendation || "Não informado",
    Status: p.status || "novo",
    "Principal motivo": p.ai_summary || "Não informado",
  }));
}

export function exportProspectsXlsx(rows: any[], filename = "influenciadores") {
  const ws = XLSX.utils.json_to_sheet(prospectsToRows(rows));
  ws["!cols"] = [
    { wch: 28 }, { wch: 18 }, { wch: 40 }, { wch: 42 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 60 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Influenciadores");
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportProspectsPdf(rows: any[], filename = "influenciadores") {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  let y = margin;

  const header = () => {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Influenciadores prospectados", margin, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${rows.length} canais · gerado em ${new Date().toLocaleString("pt-BR")}`,
      margin,
      y + 14,
    );
    y += 34;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    cols.forEach((c) => doc.text(c.label, c.x, y));
    y += 6;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 10;
    doc.setFont("helvetica", "normal");
  };

  const cols = [
    { label: "Canal", x: margin, w: 110 },
    { label: "Contatos", x: margin + 115, w: 150 },
    { label: "Inscritos", x: margin + 272, w: 55 },
    { label: "Views méd.", x: margin + 332, w: 60 },
    { label: "Últ. vídeo", x: margin + 397, w: 55 },
    { label: "Fit", x: margin + 457, w: 30 },
    { label: "Motivo", x: margin + 492, w: pageW - margin * 2 - 492 + margin },
  ];

  header();

  rows.forEach((p) => {
    const cells = [
      doc.splitTextToSize(String(p.channel_name || "Não informado"), cols[0].w),
      doc.splitTextToSize(contacts(p), cols[1].w),
      [fmtNum(p.subscriber_count)],
      [fmtNum(p.avg_recent_views)],
      [dt(p.latest_video_at)],
      [`${p.fit_score ?? 0}`],
      doc.splitTextToSize(String(p.ai_summary || "Não informado"), cols[6].w),
    ];
    const lines = Math.max(...cells.map((c) => c.length));
    const rowH = lines * 10 + 8;
    if (y + rowH > pageH - margin) {
      doc.addPage();
      y = margin;
      header();
    }
    cells.forEach((c, i) => doc.text(c as string[], cols[i].x, y));
    y += rowH;
    doc.setDrawColor(235);
    doc.line(margin, y - 6, pageW - margin, y - 6);
  });

  doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
