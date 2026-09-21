import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { rangeCalendarClassNames } from "@/lib/calendarRange";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, AtSign, CalendarClock, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download,
  ExternalLink, FileText, Hash, Image as ImageIcon, ListChecks, Loader2, MessageSquareText, Paperclip,
  Phone, Search, Type, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { formatLeadOrigin, resolveLeadOrigin, getReferralSource, NOT_IDENTIFIED } from "@/lib/leadOrigin";

const dayMs = 24 * 60 * 60 * 1000;
const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
const QUICK_PERIODS = [7, 30, 60, 90] as const;

const FIELD_ICONS: Record<string, any> = {
  text: Type,
  email: AtSign,
  phone: Phone,
  number: Hash,
  textarea: MessageSquareText,
  select: ListChecks,
  radio: ListChecks,
  checkbox: CheckCircle2,
  file: Paperclip,
};

/** Origem exibida: UTM/Referer normalizados; sem evidência → "Não identificado". */
const originOf = (submission: any) => submission?.detected_source && submission.detected_source !== NOT_IDENTIFIED
  ? formatLeadOrigin(submission)
  : (formatLeadOrigin(submission) || NOT_IDENTIFIED);

const PAGE_SIZE = 60;

const fmtDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

interface SubmissionFile { path: string; name?: string; filename?: string; mime: string; size: number }

export default function FormResponses() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [leads, setLeads] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<any>(null);
  const [viewer, setViewer] = useState<{ url: string; mime: string; filename: string } | null>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => toDateInput(new Date(Date.now() - 30 * dayMs)));
  const [endDate, setEndDate] = useState(() => toDateInput(new Date()));
  const [quickDays, setQuickDays] = useState<number | null>(30);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date>(() => new Date(Date.now() - 30 * dayMs));
  const [draftTo, setDraftTo] = useState<Date>(() => new Date());
  const [source, setSource] = useState("all");
  const [device, setDevice] = useState("all");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const applyQuick = (days: number) => {
    setQuickDays(days);
    setStartDate(toDateInput(new Date(Date.now() - days * dayMs)));
    setEndDate(toDateInput(new Date()));
  };

  const openRange = (next: boolean) => {
    setRangeOpen(next);
    if (next) {
      setDraftFrom(startDate ? new Date(`${startDate}T12:00:00`) : new Date());
      setDraftTo(endDate ? new Date(`${endDate}T12:00:00`) : new Date());
    }
  };

  const applyRangeDraft = () => {
    const start = draftFrom <= draftTo ? draftFrom : draftTo;
    const end = draftFrom <= draftTo ? draftTo : draftFrom;
    setQuickDays(null);
    setStartDate(toDateInput(start));
    setEndDate(toDateInput(end));
    setRangeOpen(false);
  };

  const periodLabel = startDate && endDate
    ? `${format(new Date(`${startDate}T12:00:00`), "dd MMM yyyy", { locale: ptBR })} — ${format(new Date(`${endDate}T12:00:00`), "dd MMM yyyy", { locale: ptBR })}`
    : "Período";

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
      toast.success("Copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("forms-admin", { body: { action: "submissions", form_id: id } });
      if (error || (data as any)?.error) {
        toast.error("Não foi possível carregar as respostas.");
      } else {
        setForm((data as any).form);
        setFields((data as any).fields || []);
        setSubmissions((data as any).submissions || []);
        setLeads((data as any).leads || {});
      }
      setLoading(false);
    })();
  }, [id]);

  const labelByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const field of fields) map[field.name] = field.label;
    return map;
  }, [fields]);

  const fieldTypeByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const field of fields) map[field.name] = field.field_type;
    return map;
  }, [fields]);

  const columnKeys = useMemo(() => {
    const keys = fields.map((field) => field.name);
    for (const submission of submissions) for (const key of Object.keys(submission.data || {})) if (!keys.includes(key)) keys.push(key);
    return keys;
  }, [fields, submissions]);

  const sourceOptions = useMemo(
    () => Array.from(new Set(submissions.map((s) => resolveLeadOrigin(s).label))).sort(),
    [submissions],
  );
  const deviceOptions = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.device).filter(Boolean))) as string[],
    [submissions],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const to = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;
    return submissions.filter((submission) => {
      const created = new Date(submission.created_at).getTime();
      if (from && created < from) return false;
      if (to && created > to) return false;
      if (source !== "all" && resolveLeadOrigin(submission).label !== source) return false;
      if (device !== "all" && (submission.device || "") !== device) return false;
      if (!term) return true;
      const haystack = [
        ...Object.values(submission.data || {}),
        submission.utm_source, submission.utm_medium, submission.utm_campaign, submission.referrer,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [submissions, search, startDate, endDate, source, device]);

  useEffect(() => { setPage(1); }, [search, startDate, endDate, source, device]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const displayName = (submission: any) =>
    submission.data?.nome_completo || submission.data?.nome || submission.data?.name || "Sem nome";
  const displayEmail = (submission: any) => submission.data?.email || "—";

  const exportXlsx = () => {
    if (!filtered.length) { toast.error("Nenhuma resposta para exportar."); return; }
    const rows = filtered.map((submission) => {
      const row: Record<string, any> = { "Data": fmtDateTime(submission.created_at) };
      for (const key of columnKeys) row[labelByName[key] || key] = submission.data?.[key] ?? "";
      row["Origem do lead"] = formatLeadOrigin(submission);
      row["Origem (UTM)"] = submission.utm_source || "";
      row["Mídia (UTM)"] = submission.utm_medium || "";
      row["Campanha (UTM)"] = submission.utm_campaign || "";
      row["Dispositivo"] = submission.device || "";
      row["Arquivos"] = Array.isArray(submission.files) ? submission.files.length : 0;
      row["Lead no CRM"] = submission.lead_id ? (leads[submission.lead_id]?.contact_name || leads[submission.lead_id]?.company_name || "Sim") : "";
      return row;
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = Object.keys(rows[0] || {}).map((key) => ({ wch: Math.max(key.length + 2, 18) }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Respostas");
    XLSX.writeFile(book, `respostas-${form?.slug || id}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${rows.length} resposta(s) exportada(s).`);
  };

  const signedUrl = async (submissionId: string, file: SubmissionFile) => {
    const { data, error } = await supabase.functions.invoke("forms-admin", {
      body: { action: "submission_file_url", submission_id: submissionId, path: file.path },
    });
    if (error || !(data as any)?.url) return null;
    return (data as any).url as string;
  };

  const openFile = async (submissionId: string, file: SubmissionFile) => {
    setOpeningFile(file.path);
    const url = await signedUrl(submissionId, file);
    setOpeningFile(null);
    if (!url) { toast.error("Não foi possível abrir o arquivo."); return; }
    setViewer({ url, mime: file.mime, filename: file.name || file.filename || "arquivo" });
  };

  /** Baixa via blob para preservar o nome original do arquivo. */
  const saveBlob = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  };

  const downloadFile = async (submissionId: string, file: SubmissionFile) => {
    setDownloadingFile(file.path);
    const url = await signedUrl(submissionId, file);
    setDownloadingFile(null);
    if (!url) { toast.error("Não foi possível baixar o arquivo."); return; }
    await saveBlob(url, file.name || file.filename || "arquivo");
  };

  return (
    <div className="relative min-h-screen bg-background">
      <SEO title="Respostas do formulário" noIndex />
      <BackgroundGlow />
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />
      <main className="relative z-10 px-4 pb-24 pt-6 md:ml-[76px] md:px-8 md:pb-10">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="shadow-none" onClick={() => navigate("/forms")}><ArrowLeft /></Button>
              <div>
                <h1 className="text-xl font-semibold">Respostas</h1>
                <p className="text-sm text-muted-foreground">{form?.name || "Formulário"} · {submissions.length} envio(s)</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2 shadow-none" onClick={() => navigate(`/forms/${id}/analytics`)}>Ver métricas</Button>
              <Button className="gap-2 shadow-none" onClick={exportXlsx} disabled={!filtered.length}><Download className="h-4 w-4" /> Exportar planilha</Button>
            </div>
          </div>

          <Card className="p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1.5 xl:col-span-2">
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, e-mail, resposta ou campanha" className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5 xl:col-span-2">
                <Label className="text-xs">Período</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Popover open={rangeOpen} onOpenChange={openRange}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 border-border/60 text-xs shadow-none">
                        <CalendarClock size={13} />
                        {periodLabel}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden rounded-2xl border-border/70 bg-popover p-0 shadow-xl" align="start">
                      <div className="p-3">
                        <CalendarPicker
                          mode="range"
                          numberOfMonths={2}
                          locale={ptBR}
                          defaultMonth={draftFrom}
                          selected={{ from: draftFrom, to: draftTo } as any}
                          onSelect={(r: any) => {
                            setDraftFrom(r?.from || r?.to || new Date());
                            setDraftTo(r?.to || r?.from || new Date());
                          }}
                          initialFocus
                          className="pointer-events-auto p-0"
                          classNames={rangeCalendarClassNames}
                        />
                      </div>
                      <div className="border-t border-border/70 bg-secondary/35 p-3">
                        <Button size="sm" className="h-9 w-full rounded-lg text-xs" onClick={applyRangeDraft}>Aplicar</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div className="mx-1 h-6 w-px bg-border" />
                  {QUICK_PERIODS.map((d) => (
                    <Button
                      key={d}
                      variant={quickDays === d ? "default" : "ghost"}
                      size="sm"
                      className={cn("h-9 text-xs shadow-none", quickDays === d && "bg-primary text-primary-foreground hover:bg-primary/90")}
                      onClick={() => applyQuick(d)}
                    >
                      {d} dias
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Origem</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-primary focus:text-primary-foreground dark:focus:text-background">Todas</SelectItem>
                      {sourceOptions.map((option) => <SelectItem key={option} value={option} className="focus:bg-primary focus:text-primary-foreground dark:focus:text-background">{option}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dispositivo</Label>
                  <Select value={device} onValueChange={setDevice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-primary focus:text-primary-foreground dark:focus:text-background">Todos</SelectItem>
                      {deviceOptions.map((option) => <SelectItem key={option} value={option} className="capitalize focus:bg-primary focus:text-primary-foreground dark:focus:text-background">{option}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span>{filtered.length} resultado(s) no filtro atual · exibindo {pageRows.length} nesta página</span>
              {(search || quickDays !== 30 || source !== "all" || device !== "all") && (
                <Button variant="ghost" size="sm" className="h-7 shadow-none" onClick={() => { setSearch(""); applyQuick(30); setSource("all"); setDevice("all"); }}>Limpar filtros</Button>
              )}
            </div>
          </Card>

          {loading ? (
            <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando respostas...</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">Nenhuma resposta encontrada com os filtros atuais.</Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Nome</th>
                      <th className="px-4 py-3 font-semibold">E-mail</th>
                      <th className="px-4 py-3 font-semibold">Origem</th>
                      <th className="px-4 py-3 font-semibold">Recebido em</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((submission) => {
                      const files: SubmissionFile[] = Array.isArray(submission.files) ? submission.files : [];
                      return (
                        <tr key={submission.id} className="border-b border-border/40 last:border-0">
                          <td className="max-w-[220px] truncate px-4 py-3 font-medium">
                            {displayName(submission)}
                            {files.length > 0 && <Badge variant="outline" className="ml-2 gap-1 align-middle"><Paperclip className="h-3 w-3" />{files.length}</Badge>}
                          </td>
                          <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{displayEmail(submission)}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="max-w-[180px] truncate font-medium">{originOf(submission)}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDateTime(submission.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {submission.lead_id && (
                                <Button variant="outline" size="sm" className="gap-2 shadow-none" onClick={() => navigate(`/crm?lead=${submission.lead_id}`)}>
                                  <UserRound className="h-4 w-4" /> CRM
                                </Button>
                              )}
                              <Button size="sm" className="shadow-none" onClick={() => setSelected(submission)}>Ver respostas</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm">
                  <span className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1 shadow-none" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                    <Button variant="outline" size="sm" className="gap-1 shadow-none" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Próxima <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </main>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
          <DialogHeader><DialogTitle>Resposta recebida</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{fmtDateTime(selected.created_at)} · {selected.device || "—"}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 shadow-none"
                  onClick={() => copyValue("all", Object.entries(selected.data || {}).map(([key, value]) => `${labelByName[key] || key}: ${String(value)}`).join("\n"))}
                >
                  {copied === "all" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar todas
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 p-3 text-xs sm:grid-cols-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground">Origem</p>
                  <p className="mt-0.5 break-words font-medium">{originOf(selected)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">UTM Source</p>
                  <p className="mt-0.5 break-words font-medium">{selected.utm_source || "Não informado"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">UTM Medium</p>
                  <p className="mt-0.5 break-words font-medium">{selected.utm_medium || "Não informado"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">UTM Campaign</p>
                  <p className="mt-0.5 break-words font-medium">{selected.utm_campaign || "Não informado"}</p>
                </div>
                {selected.referrer && (
                  <div className="col-span-2 min-w-0 sm:col-span-4">
                    <p className="text-muted-foreground">Site de origem</p>
                    <p className="mt-0.5 break-all font-medium">{getReferralSource(selected.referrer).referrer}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {Object.entries(selected.data || {}).map(([key, value]) => {
                  const FieldIcon = FIELD_ICONS[fieldTypeByName[key] || "text"] || Type;
                  const text = String(value);
                  return (
                    <div key={key} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FieldIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">{labelByName[key] || key}</p>
                        <p className="mt-1 break-words text-sm">{text}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 shadow-none"
                        title="Copiar resposta"
                        onClick={() => copyValue(key, text)}
                      >
                        {copied === key ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {Array.isArray(selected.files) && selected.files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Arquivos enviados</p>
                  {(selected.files as SubmissionFile[]).map((file) => (
                    <div key={file.path} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        {file.mime?.startsWith("image/") ? <ImageIcon className="h-4 w-4 shrink-0 text-primary" /> : <FileText className="h-4 w-4 shrink-0 text-primary" />}
                        <span className="truncate">{file.name || file.filename}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 shadow-none" onClick={() => openFile(selected.id, file)} disabled={openingFile === file.path}>
                          {openingFile === file.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                          Abrir
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shadow-none" title="Baixar arquivo" onClick={() => downloadFile(selected.id, file)} disabled={downloadingFile === file.path}>
                          {downloadingFile === file.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selected.lead_id && (
                <Button className="w-full gap-2 shadow-none" onClick={() => navigate(`/crm?lead=${selected.lead_id}`)}>
                  <UserRound className="h-4 w-4" /> Abrir contato no CRM
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewer)} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden p-4 sm:w-full">
          <DialogHeader className="pr-10">
            <DialogTitle className="truncate text-base">{viewer?.filename}</DialogTitle>
          </DialogHeader>
          {viewer && (
            <div className="space-y-3">
              {viewer.mime?.startsWith("image/")
                ? <img src={viewer.url} alt={viewer.filename} className="max-h-[68vh] w-full rounded-lg object-contain" />
                : <iframe title={viewer.filename} src={viewer.url} className="h-[68vh] w-full rounded-lg border border-border" />}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" className="gap-2 shadow-none" onClick={() => window.open(viewer.url, "_blank", "noopener")}>
                  <ExternalLink className="h-4 w-4" /> Abrir em nova aba
                </Button>
                <Button className="gap-2 shadow-none" onClick={() => saveBlob(viewer.url, viewer.filename)}>
                  <Download className="h-4 w-4" /> Baixar arquivo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
