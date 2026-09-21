import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ExternalLink, FileText, Image as ImageIcon, Loader2, Paperclip, UserRound } from "lucide-react";
import { toast } from "sonner";

const fmtDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

interface SubmissionFile { path: string; filename: string; mime: string; size: number }

export default function FormResponses() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [leads, setLeads] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<any>(null);
  const [viewer, setViewer] = useState<{ url: string; mime: string; filename: string } | null>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

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

  const openFile = async (submissionId: string, file: SubmissionFile) => {
    setOpeningFile(file.path);
    const { data, error } = await supabase.functions.invoke("forms-admin", {
      body: { action: "submission_file_url", submission_id: submissionId, path: file.path },
    });
    setOpeningFile(null);
    if (error || !(data as any)?.url) { toast.error("Não foi possível abrir o arquivo."); return; }
    setViewer({ url: (data as any).url, mime: file.mime, filename: file.filename });
  };

  return (
    <div className="relative min-h-screen bg-background">
      <SEO title="Respostas do formulário" noIndex />
      <BackgroundGlow />
      <AppSidebar />
      <MobileNav />
      <main className="relative z-10 px-4 pb-24 pt-6 md:ml-[76px] md:px-8 md:pb-10">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="shadow-none" onClick={() => navigate("/forms")}><ArrowLeft /></Button>
              <div>
                <h1 className="text-xl font-semibold">Respostas</h1>
                <p className="text-sm text-muted-foreground">{form?.name || "Formulário"} · {submissions.length} envio(s)</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2 shadow-none" onClick={() => navigate(`/forms/${id}/analytics`)}>Ver métricas</Button>
          </div>

          {loading ? (
            <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando respostas...</Card>
          ) : submissions.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">Ainda não há respostas para este formulário.</Card>
          ) : (
            <div className="grid gap-3">
              {submissions.map((submission) => {
                const values = submission.data || {};
                const files: SubmissionFile[] = Array.isArray(submission.files) ? submission.files : [];
                const lead = submission.lead_id ? leads[submission.lead_id] : null;
                const title = values.nome_completo || values.nome || values.email || "Resposta recebida";
                return (
                  <Card key={submission.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fmtDateTime(submission.created_at)} · {submission.utm_source || submission.referrer || "Direto"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {files.length > 0 && <Badge variant="outline" className="gap-1"><Paperclip className="h-3 w-3" />{files.length}</Badge>}
                        {lead && (
                          <Button variant="outline" size="sm" className="gap-2 shadow-none" onClick={() => navigate(`/crm?lead=${submission.lead_id}`)}>
                            <UserRound className="h-4 w-4" /> Ver no CRM
                          </Button>
                        )}
                        <Button size="sm" className="shadow-none" onClick={() => setSelected(submission)}>Ver detalhes</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
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
                        <span className="truncate">{file.filename}</span>
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
