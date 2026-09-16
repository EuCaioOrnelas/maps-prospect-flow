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
  const body = compilePreview(step.content || "");
  const preheader = compilePreview(step.preheader || "");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:560px;width:100%;">
<tr><td style="background:#3daa57;padding:22px 32px;text-align:center;"><span style="color:#ffffff;font-size:20px;font-weight:700;">Wiize</span></td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;"><p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque criou uma conta na Wiize.</p><p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;text-decoration:underline;">Não quero mais receber estes e-mails</p></td></tr>
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
      const { data, error } = await supabase.functions.invoke("lifecycle-admin", {
        body: { action: "send_test", stepId: step.id, recipientEmail: recipient },
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
