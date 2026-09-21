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
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Image as ImageIcon, Loader2, Paperclip, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("all");
  const [device, setDevice] = useState("all");
  const [page, setPage] = useState(1);

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

  const columnKeys = useMemo(() => {
    const keys = fields.map((field) => field.name);
    for (const submission of submissions) for (const key of Object.keys(submission.data || {})) if (!keys.includes(key)) keys.push(key);
    return keys;
  }, [fields, submissions]);

  const sourceOptions = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.utm_source).filter(Boolean))) as string[],
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
      if (source !== "all" && (submission.utm_source || "") !== source) return false;
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

  const openFile = async (submissionId: string, file: SubmissionFile) => {
    setOpeningFile(file.path);
    const { data, error } = await supabase.functions.invoke("forms-admin", {
      body: { action: "submission_file_url", submission_id: submissionId, path: file.path },
    });
    setOpeningFile(null);
    if (error || !(data as any)?.url) { toast.error("Não foi possível abrir o arquivo."); return; }
    setViewer({ url: (data as any).url, mime: file.mime, filename: file.name || file.filename || "arquivo" });
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
              <div className="space-y-1.5">
                <Label className="text-xs">Início</Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fim</Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="pl-9" />
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
              {(search || startDate || endDate || source !== "all" || device !== "all") && (
                <Button variant="ghost" size="sm" className="h-7 shadow-none" onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setSource("all"); setDevice("all"); }}>Limpar filtros</Button>
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
                          <td className="px-4 py-3 text-muted-foreground">{submission.utm_source || submission.referrer || "Direto"}</td>
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
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>Resposta recebida</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">{fmtDateTime(selected.created_at)} · {selected.device || "—"}</p>
              <div className="space-y-3">
                {Object.entries(selected.data || {}).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-medium text-muted-foreground">{labelByName[key] || key}</p>
                    <p className="mt-1 break-words text-sm">{String(value)}</p>
                  </div>
                ))}
              </div>

              {Array.isArray(selected.files) && selected.files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Arquivos enviados</p>
                  {(selected.files as SubmissionFile[]).map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => openFile(selected.id, file)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-left text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {file.mime?.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                        <span className="truncate">{file.name || file.filename}</span>
                      </span>
                      {openingFile === file.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                    </button>
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-4">
          <DialogHeader><DialogTitle className="truncate text-base">{viewer?.filename}</DialogTitle></DialogHeader>
          {viewer && (viewer.mime?.startsWith("image/")
            ? <img src={viewer.url} alt={viewer.filename} className="max-h-[70vh] w-full rounded-lg object-contain" />
            : <iframe title={viewer.filename} src={viewer.url} className="h-[70vh] w-full rounded-lg border border-border" />)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
