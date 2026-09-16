import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Monitor, RefreshCw, Smartphone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { LifecycleStep } from "@/hooks/useLifecycleCampaign";

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
    setHtml("");
    try {
      const { data, error } = await supabase.functions.invoke("lifecycle-admin", {
        body: { action: "preview", stepId: step.id },
      });
      if (error || data?.error || !data?.html) {
        const message = data?.error || "Não foi possível gerar a prévia";
        setPreviewError(message);
        toast.error(message);
        return;
      }
      setHtml(data.html);
      setSubject(data.subject || step.subject || step.name);
    } catch {
      setPreviewError("Não foi possível gerar a prévia");
      toast.error("Não foi possível gerar a prévia");
    } finally {
      setLoading(false);
    }
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
        toast.error(data?.error || "Falha ao enviar o teste");
        return;
      }
      toast.success(data.message || "E-mail de teste enviado");
    } catch {
      toast.error("Falha ao enviar o teste");
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
