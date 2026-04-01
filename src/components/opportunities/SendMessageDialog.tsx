import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Clock, CheckCircle2, MessageCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadPhone: string;
  leadName: string;
  message: string;
  userId: string;
  whatsappNumberId?: string | null;
  onSent: () => void;
}

type SendState = "preview" | "typing" | "sent" | "error";

// Estimate typing time: average human types ~40 words/min in Portuguese
function estimateTypingSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const seconds = Math.round((words / 40) * 60);
  return Math.max(5, Math.min(seconds, 45)); // clamp 5-45s
}

export function SendMessageDialog({ open, onOpenChange, leadId, leadPhone, leadName, message, userId, whatsappNumberId, onSent }: Props) {
  const { toast } = useToast();
  const [state, setState] = useState<SendState>("preview");
  const [progress, setProgress] = useState(0);
  const [typingSeconds, setTypingSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setState("preview");
      setProgress(0);
      setElapsed(0);
      setTypingSeconds(estimateTypingSeconds(message));
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, message]);

  const handleSend = async () => {
    setState("typing");
    setProgress(0);
    setElapsed(0);

    const totalMs = typingSeconds * 1000;
    const tickMs = 100;
    let elapsedMs = 0;

    intervalRef.current = setInterval(() => {
      elapsedMs += tickMs;
      const pct = Math.min((elapsedMs / totalMs) * 100, 100);
      setProgress(pct);
      setElapsed(Math.floor(elapsedMs / 1000));

      if (elapsedMs >= totalMs) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        doSend();
      }
    }, tickMs);
  };

  const doSend = async () => {
    try {
      // Get user's connected WhatsApp numbers
      // @ts-ignore - deep type instantiation
      const { data: numbers } = await supabase.from("whatsapp_numbers").select("id, instance_name, phone_number").eq("user_id", userId).eq("status", "connected").limit(1);

      const number = numbers?.[0];
      if (!number) {
        setState("error");
        toast({ title: "Nenhum WhatsApp conectado", description: "Conecte um número para enviar mensagens", variant: "destructive" });
        return;
      }

      // Send message via evolution
      const { error } = await supabase.functions.invoke("evolution-send-message", {
        body: {
          instance_name: number.instance_name,
          phone: leadPhone,
          message: message,
        },
      });

      if (error) throw error;

      // Update lead status
      await supabase
        .from("leads")
        .update({
          first_message_sent: true,
          first_message_sent_at: new Date().toISOString(),
          last_message_sent: message,
          last_message_sent_at: new Date().toISOString(),
          whatsapp_status: "sent",
          whatsapp_number_id: number.id,
        } as any)
        .eq("id", leadId);

      // Update last_message_sent_at on company_profiles for rate limiting
      await supabase
        .from("company_profiles" as any)
        .update({ last_message_sent_at: new Date().toISOString() } as any)
        .eq("user_id", userId);

      setState("sent");
      toast({ title: "Mensagem enviada!", description: `Mensagem enviada para ${leadName}` });
      onSent();
    } catch (err: any) {
      console.error("Send error:", err);
      setState("error");
      toast({ title: "Erro ao enviar", description: err.message || "Tente novamente", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (state !== "typing") onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            {state === "sent" ? "Mensagem Enviada!" : "Enviar Mensagem"}
          </DialogTitle>
          <DialogDescription>
            {state === "preview" && `Confirme o envio para ${leadName}`}
            {state === "typing" && "Simulando digitação humana..."}
            {state === "sent" && "A mensagem foi entregue com sucesso"}
            {state === "error" && "Houve um erro ao enviar a mensagem"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Message preview */}
          <div className="bg-muted/40 rounded-xl p-4 border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Mensagem para {leadName}:</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message}</p>
          </div>

          {/* Typing simulation */}
          {state === "typing" && (
            <div className="space-y-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span className="text-sm font-medium">Digitando mensagem...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {elapsed}s / {typingSeconds}s
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}

          {/* Success state */}
          {state === "sent" && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Enviada com sucesso!</p>
                <p className="text-xs text-muted-foreground">A mensagem foi entregue no WhatsApp do lead</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <span className="text-destructive text-sm font-medium">Falha no envio. Verifique seu WhatsApp conectado e tente novamente.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          {state === "preview" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSend} className="flex-1 gap-2">
                <Send size={16} />
                Confirmar Envio
              </Button>
            </>
          )}
          {state === "sent" && (
            <Button onClick={() => onOpenChange(false)} className="w-full gap-2">
              <CheckCircle2 size={16} />
              Fechar
            </Button>
          )}
          {state === "error" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Fechar
              </Button>
              <Button onClick={handleSend} className="flex-1 gap-2">
                <Send size={16} />
                Tentar Novamente
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
