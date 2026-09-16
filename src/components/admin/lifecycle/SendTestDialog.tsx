import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { LifecycleStep } from "@/hooks/useLifecycleCampaign";

const STORAGE_KEY = "lifecycle_test_email";

interface Props {
  step: LifecycleStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendTestDialog({ step, open, onOpenChange }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) setEmail(localStorage.getItem(STORAGE_KEY) || "");
  }, [open]);

  const send = async () => {
    if (!step) return;
    const to = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      toast.error("Informe um e-mail válido");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("lifecycle-admin", {
        body: { action: "send_test", stepId: step.id, recipientEmail: to },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Falha ao enviar o teste");
        return;
      }
      localStorage.setItem(STORAGE_KEY, to);
      toast.success(data.message || `E-mail de teste enviado para ${to}`);
      onOpenChange(false);
    } catch {
      toast.error("Falha ao enviar o teste");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>Enviar teste — {step?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Enviar para</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@wiize.com.br"
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim() && !sending) send();
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            O teste usa dados de exemplo, é marcado como teste e não altera o estado de nenhum usuário.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={send} disabled={sending || !email.trim()}>
              <Send size={14} className="mr-1.5" /> {sending ? "Enviando..." : "Enviar teste"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
