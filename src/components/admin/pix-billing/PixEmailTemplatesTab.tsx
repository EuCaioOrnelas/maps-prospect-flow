import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Edit, Eye, Save, Monitor, Smartphone, History } from "lucide-react";

interface EmailTemplate {
  id: string;
  stage: string;
  payment_method: string;
  subject: string;
  preview_text: string | null;
  title: string;
  content: string;
  cta_text: string;
  cta_url_template: string | null;
  is_published: boolean;
  draft_subject: string | null;
  draft_content: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  version: number;
  created_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  "D-5": "🟢 D-5 — Início (sem pressão)",
  "D-3": "🟢 D-3 — Reforço inteligente",
  "D-1": "🟡 D-1 — Urgência real",
  "D0": "🔴 D0 — Último aviso",
  "D+1": "⛔ D+1 — Acesso suspenso / cobrança falhou",
};

const VARIABLES = [
  { key: "{{user_name}}", label: "Nome do usuário" },
  { key: "{{company_name}}", label: "Empresa" },
  { key: "{{plan_name}}", label: "Nome do plano" },
  { key: "{{amount}}", label: "Valor" },
  { key: "{{due_date}}", label: "Data de vencimento" },
  { key: "{{payment_link}}", label: "Link de pagamento" },
  { key: "{{pix_copy_paste}}", label: "Código PIX copia e cola" },
];

export function PixEmailTemplatesTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [methodFilter, setMethodFilter] = useState<"pix" | "card">("pix");

  // Edit form state
  const [editSubject, setEditSubject] = useState("");
  const [editPreviewText, setEditPreviewText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCtaText, setEditCtaText] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("renewal_email_templates" as any)
        .select("*")
        .order("payment_method", { ascending: true })
        .order("stage", { ascending: true });
      if (error) throw error;
      setTemplates((data || []) as unknown as EmailTemplate[]);
    } catch (err) {
      console.error("Error loading templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setEditSubject(t.draft_subject || t.subject);
    setEditPreviewText(t.preview_text || "");
    setEditTitle(t.title);
    setEditContent(t.draft_content || t.content);
    setEditCtaText(t.cta_text);
  };

  const handleSaveDraft = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("renewal_email_templates" as any)
        .update({
          draft_subject: editSubject,
          draft_content: editContent,
          preview_text: editPreviewText,
          title: editTitle,
          cta_text: editCtaText,
          last_edited_by: user?.email || "admin",
          last_edited_at: new Date().toISOString(),
        } as any)
        .eq("id", editingTemplate.id);
      toast({ title: "Rascunho salvo!" });
      loadTemplates();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("renewal_email_templates" as any)
        .update({
          subject: editSubject,
          content: editContent,
          preview_text: editPreviewText,
          title: editTitle,
          cta_text: editCtaText,
          draft_subject: null,
          draft_content: null,
          is_published: true,
          version: (editingTemplate.version || 1) + 1,
          last_edited_by: user?.email || "admin",
          last_edited_at: new Date().toISOString(),
        } as any)
        .eq("id", editingTemplate.id);
      toast({ title: "Template publicado!" });
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderPreviewHtml = (t: EmailTemplate) => {
    const content = (t.draft_content || t.content)
      .replace(/\{\{user_name\}\}/g, "João Silva")
      .replace(/\{\{company_name\}\}/g, "Tech Solutions")
      .replace(/\{\{plan_name\}\}/g, "Wiize Growth")
      .replace(/\{\{amount\}\}/g, "R$ 497")
      .replace(/\{\{due_date\}\}/g, "30/03/2026")
      .replace(/\{\{payment_link\}\}/g, "#")
      .replace(/\{\{pix_copy_paste\}\}/g, "00020126580014br.gov.bcb...");

    const logoUrl = "https://lqfqnqfeuneorxocybru.supabase.co/storage/v1/object/public/avatars/email/logo_wiize.png";

    return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:#3daa57;padding:24px 32px;text-align:center;">
          <img src="${logoUrl}" alt="Wiize" width="32" height="32" style="display:inline-block;vertical-align:middle;border-radius:8px;">
          <span style="color:#fff;font-size:20px;font-weight:700;margin-left:8px;vertical-align:middle;">Wiize</span>
        </div>
        <div style="padding:32px;color:#1a1a2e;">
          <h1 style="font-size:22px;color:#1a1a2e;margin:0 0 16px;">${t.title}</h1>
          <div style="color:#333;font-size:14px;line-height:1.6;">${content}</div>
          <div style="text-align:center;margin:24px 0;">
            <a href="#" style="display:inline-block;padding:14px 32px;background:#3daa57;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${t.cta_text}</a>
          </div>
        </div>
        <div style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque tem uma conta na Wiize.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;"><a href="#" style="color:#3daa57;">Gerenciar preferências de e-mail</a></p>
        </div>
      </div>
    `;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Variables Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Variáveis Dinâmicas Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map((v) => (
              <Badge
                key={v.key}
                variant="outline"
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigator.clipboard.writeText(v.key)}
              >
                {v.key} — {v.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Cards */}
      <div className="space-y-3">
        {templates.map((t) => (
          <Card key={t.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={t.stage === "D+1" ? "destructive" : t.stage === "D0" || t.stage === "D-1" ? "secondary" : "default"}>
                      {t.stage}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {STAGE_LABELS[t.stage] || t.stage}
                    </span>
                    {t.draft_content && (
                      <Badge variant="outline" className="text-xs">Rascunho</Badge>
                    )}
                  </div>
                  <p className="font-medium text-foreground text-sm mt-2">{t.draft_subject || t.subject}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>v{t.version}</span>
                    {t.last_edited_by && (
                      <span>Editado por {t.last_edited_by}</span>
                    )}
                    {t.last_edited_at && (
                      <span>{new Date(t.last_edited_at).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(t)} className="gap-1">
                    <Eye size={14} /> Preview
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)} className="gap-1">
                    <Edit size={14} /> Editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={18} />
              Editar Template — {editingTemplate?.stage}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Assunto</label>
                <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Preview Text</label>
                <Input value={editPreviewText} onChange={(e) => setEditPreviewText(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Título Interno</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Texto do CTA</label>
                <Input value={editCtaText} onChange={(e) => setEditCtaText(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Conteúdo (HTML)</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[250px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Use variáveis: {VARIABLES.map(v => v.key).join(", ")}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar Rascunho
              </Button>
              <Button onClick={handlePublish} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Publicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={18} />
              Preview — {previewTemplate?.stage}
            </DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={previewMode === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("desktop")}
                  className="gap-1"
                >
                  <Monitor size={14} /> Desktop
                </Button>
                <Button
                  variant={previewMode === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("mobile")}
                  className="gap-1"
                >
                  <Smartphone size={14} /> Mobile
                </Button>
              </div>

              <div className="bg-muted/30 rounded-lg p-2 mb-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Assunto:</strong> {previewTemplate.draft_subject || previewTemplate.subject}
                </p>
                {previewTemplate.preview_text && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Preview:</strong> {previewTemplate.preview_text}
                  </p>
                )}
              </div>

              <div
                className={`mx-auto bg-[#f4f4f5] rounded-lg p-4 ${
                  previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
                }`}
                dangerouslySetInnerHTML={{ __html: renderPreviewHtml(previewTemplate) }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
