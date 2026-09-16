import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Monitor, RefreshCw, Smartphone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { LifecycleStep } from "@/hooks/useLifecycleCampaign";

const SAMPLE_VARIABLES: Record<string, string> = {
  "user.name": "Maria",
  "user.email": "maria@empresa.com.br",
  "company.name": "Empresa Exemplo",
  "trial.days_remaining": "3",
  "trial.end_date": new Date(Date.now() + 3 * 86400000).toLocaleDateString("pt-BR"),
  dashboard_url: "https://wiize.com.br/dashboard",
  checkout_url: "https://wiize.com.br/planos",
};

function compilePreview(value: string) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => SAMPLE_VARIABLES[key] || "");
}

function buildPreviewHtml(step: LifecycleStep) {
  const body = compilePreview(step.content || "")
    .replace(/<h1(\s[^>]*)?>/gi, '<h1$1 style="margin:0 0 18px;font-size:28px;line-height:1.2;color:#111827;font-weight:800;letter-spacing:0;">')
    .replace(/<h2(\s[^>]*)?>/gi, '<h2$1 style="margin:26px 0 12px;font-size:19px;line-height:1.35;color:#111827;font-weight:750;letter-spacing:0;">')
    .replace(/<p(?![^>]*style=)(\s[^>]*)?>/gi, '<p$1 style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5563;">')
    .replace(/<li(?![^>]*style=)(\s[^>]*)?>/gi, '<li$1 style="margin:0 0 9px;font-size:15px;line-height:1.65;color:#374151;">')
    .replace(/<ul(?![^>]*style=)(\s[^>]*)?>/gi, '<ul$1 style="margin:0 0 18px;padding-left:22px;">')
    .replace(/<blockquote(?![^>]*style=)(\s[^>]*)?>/gi, '<blockquote$1 style="margin:20px 0;padding:18px 20px;border-left:4px solid #199b68;background:#ecfdf5;color:#1f2937;font-size:15px;line-height:1.65;border-radius:0 10px 10px 0;">');
  const preheader = compilePreview(step.preheader || "");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:36px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(17,24,39,0.10);max-width:600px;width:100%;border:1px solid #e5e7eb;">
<tr><td style="background:#111827;padding:24px 36px;"><table role="presentation" width="100%"><tr><td><span style="color:#ffffff;font-size:23px;font-weight:800;">Wiize</span></td><td align="right"><span style="display:inline-block;background:#199b68;color:#ffffff;font-size:11px;font-weight:700;padding:7px 10px;border-radius:999px;">TRIAL • DIA ${step.day_offset}</span></td></tr></table></td></tr>
<tr><td style="padding:38px 36px 32px;">${body}</td></tr>
<tr><td style="padding:20px 36px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;"><p style="margin:0;font-size:12px;color:#9ca3af;">Wiize • Inteligência comercial para empresas</p><p style="margin:7px 0 0;font-size:12px;color:#9ca3af;text-decoration:underline;">Não quero mais receber estes e-mails</p></td></tr>
</table></td></tr></table></body></html>`;
}

async function readFunctionError(error: unknown, fallback: string) {
  const context = (error as { context?: Response } | null)?.context;
  if (!context) return fallback;
  try {
    const payload = await context.clone().json();
    return payload?.error || payload?.message || fallback;
  } catch {
    return fallback;
  }
}

interface Props {
  step: LifecycleStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StepPreviewDialog({ step, open, onOpenChange }: Props) {
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const loadPreview = async () => {
    if (!step) return;
    setLoading(true);
    setPreviewError("");
    setHtml(buildPreviewHtml(step));
    setSubject(compilePreview(step.subject || step.name));
    setLoading(false);
  };

  useEffect(() => {
    if (!open || !step) return;
    void loadPreview();
    // A abertura ou troca da etapa é o único gatilho automático da prévia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const sendTest = async () => {
    if (!step) return;
    const recipient = testEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      toast.error("Informe um e-mail válido");
      return;
    }
    setSending(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        toast.error("Sua sessão expirou. Entre novamente para enviar o teste.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("lifecycle-admin", {
        body: { action: "send_test", stepId: step.id, recipientEmail: recipient },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (error || data?.error) {
        toast.error(data?.error || await readFunctionError(error, "Falha ao enviar o teste"));
        return;
      }
      toast.success(data.message || "E-mail de teste enviado");
    } catch (error) {
      toast.error(await readFunctionError(error, "Falha ao enviar o teste"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Prévia — {step?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Assunto: <span className="text-foreground font-medium">{subject || "—"}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")}>
                <Monitor size={14} className="mr-1.5" /> Desktop
              </Button>
              <Button size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")}>
                <Smartphone size={14} className="mr-1.5" /> Mobile
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex justify-center">
            {loading ? (
              <p className="text-sm text-muted-foreground py-16">Gerando prévia...</p>
            ) : previewError ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                <AlertTriangle className="text-destructive" />
                <p className="text-sm text-destructive">{previewError}</p>
                <Button size="sm" variant="outline" onClick={loadPreview}><RefreshCw /> Tentar novamente</Button>
              </div>
            ) : (
              <iframe
                title="Prévia do e-mail"
                srcDoc={html}
                sandbox=""
                className="bg-white rounded-md border border-border/40"
                style={{ width: device === "desktop" ? "100%" : 390, height: 560 }}
              />
            )}
          </div>

          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-muted-foreground">Enviar teste para</label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="voce@wiize.com.br"
              />
            </div>
            <Button onClick={sendTest} disabled={sending || !testEmail.trim()}>
              <Send size={14} className="mr-1.5" /> {sending ? "Enviando..." : "Enviar teste"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            O teste usa dados de exemplo, é marcado como teste e não altera o estado de nenhum usuário.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
