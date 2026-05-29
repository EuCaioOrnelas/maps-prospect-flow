import { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, FileDown, FileUp, Sparkles, FileSpreadsheet, Phone, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { type Lead, WHATSAPP_STATUS_LABELS } from "@/hooks/useCRM";
import { useUserScoreTracking } from "@/hooks/useUserScoreTracking";
import { useContactLimit } from "@/hooks/useContactLimit";
import { useNavigate } from "react-router-dom";

interface Stage { id: string; name: string; color?: string }

interface Props {
  leads: Lead[];
  stages: Stage[];
  origins: string[];
  onAddOrigin?: (name: string) => Promise<void> | void;
  onImportLeads: (rows: ImportRow[], stageId: string, origin: string) => Promise<{ inserted: number; skipped: number }>;
}

export interface ImportRow {
  contact_name?: string;
  phone: string;
  company_name?: string;
  category?: string;
  city?: string;
  region?: string;
  website?: string;
}

type Mode = "menu" | "export-config" | "import-template" | "import-upload" | "import-config" | "import-result";

const EXPORT_COLUMNS = [
  { key: "contact_name", label: "Nome" },
  { key: "company_name", label: "Empresa" },
  { key: "phone", label: "Telefone" },
  { key: "category", label: "Nicho" },
  { key: "city", label: "Cidade" },
  { key: "region", label: "Região" },
  { key: "website", label: "Website" },
  { key: "origin", label: "Origem" },
  { key: "stage", label: "Etapa" },
  { key: "whatsapp_status", label: "Status WhatsApp" },
  { key: "estimated_value", label: "Valor em Negociação" },
  { key: "ai_score", label: "Pontuação IA" },
  { key: "last_response_at", label: "Última Resposta" },
  { key: "prospected_at", label: "Data de Prospecção" },
  { key: "tags", label: "Tags" },
];

const SCORE_BUCKETS = [
  { value: "all", label: "Todos os scores" },
  { value: "ready", label: "Pronto p/ venda (801–1000)" },
  { value: "high", label: "Alto valor (601–800)" },
  { value: "engaged", label: "Engajado (401–600)" },
  { value: "low", label: "Baixo engajamento (201–400)" },
  { value: "cold", label: "Frio (0–200)" },
];

export function ImportExportDialog({ leads, stages, origins, onAddOrigin, onImportLeads }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const { trackScoreEvent } = useUserScoreTracking();
  const { count: contactCount, limit: contactLimit, hasLimit } = useContactLimit();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // export state
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set(EXPORT_COLUMNS.map(c => c.key)));
  const [scoreBucket, setScoreBucket] = useState("all");

  // import state
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importStageId, setImportStageId] = useState("");
  const [importOrigin, setImportOrigin] = useState("Importação");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; cappedByLimit: number } | null>(null);

  const resetAll = () => {
    setMode("menu");
    setDateFrom(""); setDateTo("");
    setSelectedCols(new Set(EXPORT_COLUMNS.map(c => c.key)));
    setScoreBucket("all");
    setImportRows([]); setImportFileName("");
    setImportStageId(""); setImportOrigin("Importação");
    setImportResult(null);
  };

  const filteredForExport = useMemo(() => {
    const stageMap = new Map(stages.map(s => [s.id, s.name]));
    return leads.filter(l => {
      if (dateFrom) {
        const d = new Date(l.created_at);
        const from = new Date(dateFrom); from.setHours(0,0,0,0);
        if (d < from) return false;
      }
      if (dateTo) {
        const d = new Date(l.created_at);
        const to = new Date(dateTo); to.setHours(23,59,59,999);
        if (d > to) return false;
      }
      if (scoreBucket !== "all") {
        const s = l.ai_score || 0;
        if (scoreBucket === "ready" && s < 801) return false;
        if (scoreBucket === "high" && (s < 601 || s > 800)) return false;
        if (scoreBucket === "engaged" && (s < 401 || s > 600)) return false;
        if (scoreBucket === "low" && (s < 201 || s > 400)) return false;
        if (scoreBucket === "cold" && s > 200) return false;
      }
      return true;
    }).map(l => ({ lead: l, stageName: stageMap.get(l.pipeline_stage_id || "") || "" }));
  }, [leads, stages, dateFrom, dateTo, scoreBucket]);

  const toggleCol = (key: string) => {
    setSelectedCols(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const handleExport = () => {
    if (filteredForExport.length === 0) {
      toast.error("Nenhum lead para exportar com esses filtros");
      return;
    }
    if (selectedCols.size === 0) {
      toast.error("Selecione pelo menos uma coluna");
      return;
    }
    const data = filteredForExport.map(({ lead, stageName }) => {
      const row: Record<string, unknown> = {};
      EXPORT_COLUMNS.forEach(col => {
        if (!selectedCols.has(col.key)) return;
        switch (col.key) {
          case "stage": row[col.label] = stageName; break;
          case "whatsapp_status": row[col.label] = WHATSAPP_STATUS_LABELS[lead.whatsapp_status] || ""; break;
          case "last_response_at": row[col.label] = lead.last_response_at ? new Date(lead.last_response_at).toLocaleDateString("pt-BR") : ""; break;
          case "prospected_at": row[col.label] = lead.prospected_at ? new Date(lead.prospected_at).toLocaleDateString("pt-BR") : ""; break;
          case "tags": row[col.label] = lead.tags?.join(", ") || ""; break;
          default: row[col.label] = (lead as any)[col.key] ?? ""; break;
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    ws["!cols"] = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 15) }));
    XLSX.writeFile(wb, `leads_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${data.length} leads exportados`);
    trackScoreEvent("export_report", { type: "crm_leads", count: data.length });
    setOpen(false); resetAll();
  };

  const downloadTemplate = () => {
    const sample = [{
      "Nome": "João Silva",
      "Telefone": "5511999998888",
      "Empresa": "Empresa Exemplo",
      "Nicho": "Restaurante",
      "Cidade": "São Paulo",
      "Região": "SP",
      "Website": "https://exemplo.com.br",
    }];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_importacao_leads.xlsx");
    toast.success("Planilha modelo baixada");
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows: ImportRow[] = [];
      const invalid: number[] = [];
      json.forEach((r, idx) => {
        const get = (keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(r).find(rk => rk.toLowerCase().trim() === k.toLowerCase());
            if (found && r[found] != null && String(r[found]).trim() !== "") return String(r[found]).trim();
          }
          return "";
        };
        const phoneRaw = get(["Telefone", "Phone", "Celular", "Whatsapp"]);
        const digits = phoneRaw.replace(/\D/g, "");
        // Require DDI + DDD: 55 + 2 + 8/9 = 12-13 digits, starting with 55
        if (!digits || digits.length < 12 || digits.length > 13 || !digits.startsWith("55")) {
          invalid.push(idx + 2); return;
        }
        rows.push({
          contact_name: get(["Nome", "Name", "Contato"]),
          phone: digits,
          company_name: get(["Empresa", "Company"]),
          category: get(["Nicho", "Categoria", "Category"]),
          city: get(["Cidade", "City"]),
          region: get(["Região", "Regiao", "Estado", "Region"]),
          website: get(["Website", "Site", "URL"]),
        });
      });
      if (rows.length === 0) {
        toast.error(`Nenhuma linha válida. Verifique se telefone contém DDI 55 + DDD + número.${invalid.length ? ` Linhas inválidas: ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "…" : ""}` : ""}`);
        return;
      }
      if (invalid.length) {
        toast.warning(`${invalid.length} linhas ignoradas por telefone inválido (precisa de DDI 55 + DDD).`);
      }
      setImportRows(rows);
      setImportFileName(file.name);
      setImportStageId(stages[0]?.id || "");
      setMode("import-config");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao ler planilha. Use o modelo XLSX/CSV.");
    }
  };

  const remainingSlots = useMemo(() => {
    if (!hasLimit) return Infinity;
    return Math.max(0, (Number(contactLimit) || 0) - (Number(contactCount) || 0));
  }, [hasLimit, contactLimit, contactCount]);

  const willImportCount = Math.min(importRows.length, Number.isFinite(remainingSlots) ? remainingSlots : importRows.length);
  const willCap = importRows.length - willImportCount;

  const doImport = async () => {
    if (!importStageId) {
      toast.error("Selecione a etapa do pipeline");
      return;
    }
    setImporting(true);
    try {
      const toSend = importRows.slice(0, willImportCount);
      const res = await onImportLeads(toSend, importStageId, importOrigin || "Importação");
      setImportResult({ inserted: res.inserted, skipped: res.skipped, cappedByLimit: willCap });
      setMode("import-result");
      if (willCap > 0) {
        toast.warning(`${willCap} leads não importados por falta de espaço no plano`);
      }
      if (res.inserted > 0) trackScoreEvent("crm_import", { count: res.inserted });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar leads");
    } finally {
      setImporting(false);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 sm:h-9 px-2 gap-1"
            onClick={() => { resetAll(); setOpen(true); }}
            aria-label="Importar e Exportar leads"
          >
            <FileDown className="w-4 h-4 text-foreground" strokeWidth={1.75} />
            <span className="text-muted-foreground/40 text-xs">|</span>
            <FileUp className="w-4 h-4 text-foreground" strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Importar / Exportar leads</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetAll(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
          {mode === "menu" && (
            <>
              <DialogHeader>
                <DialogTitle>Importar e Exportar leads</DialogTitle>
                <DialogDescription>
                  Gerencie em massa o seu pipeline. Exporte com filtros avançados ou importe novos leads via planilha.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => setMode("export-config")}
                  className="text-left p-4 rounded-xl border border-border bg-background hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
                      <FileUp className="w-4.5 h-4.5" strokeWidth={1.75} />
                    </div>
                    <div className="font-semibold">Exportar leads</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Baixe um Excel com seus leads filtrados por período, colunas do CRM e faixa de score.
                  </p>
                </button>
                <button
                  onClick={() => setMode("import-template")}
                  className="text-left p-4 rounded-xl border border-border bg-background hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
                      <FileDown className="w-4.5 h-4.5" strokeWidth={1.75} />
                    </div>
                    <div className="font-semibold">Importar leads</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Baixe a planilha modelo, preencha e envie. Origem e etapa são definidas fora da planilha.
                  </p>
                </button>
              </div>
              {hasLimit && (
                <div className="mt-3 px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Espaço no CRM: <strong className="text-foreground">{contactCount.toLocaleString("pt-BR")}</strong> / {Number.isFinite(contactLimit) ? contactLimit.toLocaleString("pt-BR") : "∞"}</span>
                  <span>Disponível: <strong className="text-foreground">{Number.isFinite(remainingSlots) ? remainingSlots.toLocaleString("pt-BR") : "∞"}</strong></span>
                </div>
              )}
            </>
          )}

          {mode === "export-config" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
                    <FileUp className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  Exportar leads
                </DialogTitle>
                <DialogDescription>Selecione período, colunas e faixa de score.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">De (data de criação)</Label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Até</Label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Faixa de score</Label>
                  <Select value={scoreBucket} onValueChange={setScoreBucket}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCORE_BUCKETS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Colunas a exportar</Label>
                    <div className="flex gap-2">
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setSelectedCols(new Set(EXPORT_COLUMNS.map(c => c.key)))}>Todas</button>
                      <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setSelectedCols(new Set())}>Nenhuma</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                    {EXPORT_COLUMNS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={selectedCols.has(col.key)} onCheckedChange={() => toggleCol(col.key)} />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-muted/40 text-xs flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span><strong>{filteredForExport.length}</strong> leads serão exportados em <strong>{selectedCols.size}</strong> colunas.</span>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setMode("menu")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
                <Button onClick={handleExport} disabled={filteredForExport.length === 0 || selectedCols.size === 0}>
                  <Download className="w-4 h-4 mr-2" /> Confirmar e exportar
                </Button>
              </DialogFooter>
            </>
          )}

          {mode === "import-template" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
                    <FileDown className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  Importar leads — passo 1
                </DialogTitle>
                <DialogDescription>Baixe a planilha modelo, preencha e suba o arquivo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {/* Template download — centered */}
                <div className="p-5 rounded-xl border border-border bg-muted/20 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center mb-2">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="font-medium text-sm mb-1">Planilha modelo</div>
                  <p className="text-xs text-muted-foreground mb-3 max-w-md">
                    Comece pelo modelo oficial para garantir que sua importação funcione sem erros.
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                    <Download className="w-4 h-4" /> Baixar planilha modelo
                  </Button>
                </div>

                {/* Mandatory formatting rules */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                    <div className="text-sm font-semibold text-foreground">Regras obrigatórias de formatação</div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Telefone obrigatório</strong> com <strong>DDI 55 + DDD + número</strong> (12 a 13 dígitos, só números, sem "+", espaços ou parênteses). Ex.: <code className="px-1 py-0.5 rounded bg-muted/60 font-mono">5511999998888</code></span>
                    </li>
                    <li className="flex gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span>Formatos aceitos: <strong>.xlsx, .xls, .csv</strong> (use a 1ª aba da planilha).</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span>Colunas reconhecidas: <strong>Nome, Telefone, Empresa, Nicho, Cidade, Região, Website</strong>. Outras colunas são ignoradas.</span>
                    </li>
                    <li className="flex gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                      <span>Linhas com telefone inválido são <strong>descartadas automaticamente</strong>. Duplicados não são reimportados.</span>
                    </li>
                    <li className="flex gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span><strong>Etapa do pipeline</strong> e <strong>origem</strong> são definidas no próximo passo (não na planilha).</span>
                    </li>
                  </ul>
                </div>

                {/* Drag and drop area */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium">
                    {isDragging ? "Solte o arquivo aqui" : "Arraste e solte sua planilha"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ou <span className="text-primary font-medium">clique para escolher</span> — .xlsx, .xls ou .csv
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />
                </div>

                {hasLimit && (
                  <div className="px-3 py-2 rounded-lg bg-muted/40 text-xs flex items-center justify-between">
                    <span>Espaço disponível no CRM: <strong>{Number.isFinite(remainingSlots) ? remainingSlots.toLocaleString("pt-BR") : "∞"}</strong></span>
                    {Number.isFinite(remainingSlots) && remainingSlots < 100 && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setOpen(false); navigate("/upgrade"); }}>
                        Expandir limite
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setMode("menu")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
              </DialogFooter>
            </>
          )}

          {mode === "import-config" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
                    <FileDown className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  Importar leads — passo 2
                </DialogTitle>
                <DialogDescription>Defina etapa do pipeline e origem dos leads.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Arquivo lido: <strong>{importFileName}</strong> — <strong>{importRows.length}</strong> linhas válidas</span>
                </div>

                <div>
                  <Label className="text-xs">Etapa do pipeline</Label>
                  <Select value={importStageId} onValueChange={setImportStageId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                    <SelectContent>
                      {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Origem dos leads</Label>
                  <Select value={importOrigin} onValueChange={setImportOrigin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set([...origins, "Importação"])).map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasLimit && (
                  <div className={`p-3 rounded-lg border text-xs ${willCap > 0 ? "border-amber-500/40 bg-amber-500/10" : "border-border/60 bg-muted/30"}`}>
                    {willCap > 0 ? (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-foreground mb-1">Limite do plano atingido</div>
                          <p className="text-muted-foreground">
                            Você selecionou <strong>{importRows.length}</strong> leads, mas só restam <strong>{remainingSlots}</strong> vagas no seu CRM.
                            Vamos importar <strong>{willImportCount}</strong> e os outros <strong>{willCap}</strong> serão ignorados.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => { setOpen(false); navigate("/upgrade"); }}>
                            Expandir limite do CRM
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span>Tudo certo: <strong>{willImportCount}</strong> leads serão importados ({Number.isFinite(remainingSlots) ? remainingSlots : "∞"} vagas disponíveis).</span>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setMode("import-template")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
                <Button onClick={doImport} disabled={importing || willImportCount === 0}>
                  {importing ? "Importando…" : <>Confirmar e importar <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </DialogFooter>
            </>
          )}

          {mode === "import-result" && importResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Importação concluída</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg border border-border/60 bg-emerald-500/5">
                    <div className="text-2xl font-bold text-emerald-600">{importResult.inserted}</div>
                    <div className="text-xs text-muted-foreground">Importados</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                    <div className="text-2xl font-bold text-muted-foreground">{importResult.skipped}</div>
                    <div className="text-xs text-muted-foreground">Duplicados / erros</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-amber-500/5">
                    <div className="text-2xl font-bold text-amber-600">{importResult.cappedByLimit}</div>
                    <div className="text-xs text-muted-foreground">Cortados pelo limite</div>
                  </div>
                </div>
                {importResult.cappedByLimit > 0 && (
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); navigate("/upgrade"); }}>
                    Expandir limite e importar o restante
                  </Button>
                )}
              </div>
              <DialogFooter className="mt-3">
                <Button onClick={() => { setOpen(false); resetAll(); }}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
