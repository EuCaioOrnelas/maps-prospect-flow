import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Clock, CheckCircle2, MessageCircle, AlertTriangle, Wifi } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppNumberOption {
  id: string;
  instance_name: string | null;
  phone_number: string | null;
  name: string;
  is_connected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadPhone: string;
  leadName: string;
  leadData?: {
    company_name?: string | null;
    category?: string | null;
    city?: string | null;
    address?: string | null;
    website?: string | null;
    rating?: number | null;
    review_count?: number | null;
    ai_score?: number | null;
    social_media?: any;
    phone_numbers?: any;
  };
  message: string;
  userId: string;
  availableNumbers?: WhatsAppNumberOption[];
  onSent: () => void;
  onRequestConnect?: () => void;
}

type SendState = "select_number" | "preview" | "typing" | "sent" | "error" | "no_numbers";

function estimateTypingSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const seconds = Math.round((words / 40) * 60);
  return Math.max(5, Math.min(seconds, 45));
}

export function SendMessageDialog({ open, onOpenChange, leadId, leadPhone, leadName, leadData, message, userId, availableNumbers, onSent, onRequestConnect }: Props) {
  const { toast } = useToast();
  const [state, setState] = useState<SendState>("select_number");
  const [progress, setProgress] = useState(0);
  const [typingSeconds, setTypingSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [numbers, setNumbers] = useState<WhatsAppNumberOption[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyNumberState = (items: WhatsAppNumberOption[]) => {
    const connected = items.filter((item) => item.is_connected && item.instance_name);
    setNumbers(connected);

    if (connected.length === 0) {
      setSelectedNumberId(null);
      setState("no_numbers");
      return;
    }

    const preservedSelection = connected.find((item) => item.id === selectedNumberId)?.id || null;

    if (connected.length === 1) {
      setSelectedNumberId(connected[0].id);
      setState("preview");
      return;
    }

    setSelectedNumberId(preservedSelection);
    setState(preservedSelection ? "preview" : "select_number");
  };

  useEffect(() => {
    if (open) {
      // Only reset state if not currently typing (background send)
      if (state !== "typing") {
        setState("select_number");
        setProgress(0);
        setElapsed(0);
      }
      setTypingSeconds(estimateTypingSeconds(message));
      if (state !== "typing") loadNumbers();
    }
    // Don't clear interval on close — allow background sending
  }, [open, message, availableNumbers]);

  const loadNumbers = async () => {
    setLoadingNumbers(true);
    try {
      if (availableNumbers && availableNumbers.length > 0) {
        applyNumberState(availableNumbers);
        return;
      }

      // @ts-ignore - deep type instantiation
      const { data } = await supabase
        .from("whatsapp_numbers")
        .select("id, instance_name, phone_number, name, is_connected")
        .eq("user_id", userId);

      applyNumberState(data || []);
    } catch (err) {
      console.error("Error loading numbers:", err);
      setState("no_numbers");
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleSelectNumber = () => {
    if (selectedNumberId) {
      setState("preview");
    }
  };

  const handleSend = async () => {
    if (!selectedNumberId) {
      toast({ title: "Selecione um número", variant: "destructive" });
      return;
    }

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
      const number = numbers.find(n => n.id === selectedNumberId);
      if (!number || !number.instance_name) {
        setState("error");
        setErrorMessage("Número não encontrado");
        toast({ title: "Número não encontrado", variant: "destructive" });
        return;
      }

      // Send message via evolution
      const { data, error } = await supabase.functions.invoke("evolution-send-message", {
        body: {
          instanceName: number.instance_name,
          phoneNumber: leadPhone,
          message: message,
          numberId: number.id,
        },
      });

      // Extract real error message — supabase-js wraps non-2xx responses into a generic
      // FunctionsHttpError. The real reason from the edge function lives in error.context.
      if (error) {
        let realError: string | null = null;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            realError = body?.error || body?.message || null;
          } else if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            try { realError = JSON.parse(txt)?.error || txt; } catch { realError = txt; }
          }
        } catch { /* ignore parsing failures */ }
        throw new Error(realError || (error as any).message || "Erro desconhecido na edge function");
      }

      // Some edge functions return 200 with { success:false, error:"..." }
      if (data && data.success === false) {
        throw new Error(data.error || "Falha reportada pela API ao enviar");
      }

      // Update lead status - mark as sent
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

      // Create lead in CRM pipeline
      await createCRMProfile(number.id);

      // Update last_message_sent_at on company_profiles for rate limiting
      await supabase
        .from("company_profiles" as any)
        .update({ last_message_sent_at: new Date().toISOString() } as any)
        .eq("user_id", userId);

      setState("sent");
      setErrorMessage(null);
      toast({ title: "Mensagem enviada!", description: `Mensagem enviada para ${leadName}` });
      onSent();
    } catch (err: any) {
      console.error("[SendMessageDialog] Send error:", err);
      const description = err?.message || "Tente novamente";
      setErrorMessage(description);
      setState("error");
      toast({ title: "Erro ao enviar", description, variant: "destructive" });
    }
  };

  const createCRMProfile = async (whatsappNumberId: string) => {
    try {
      // Get first pipeline stage for this user (mensagem enviada or first available)
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id, name, position")
        .eq("user_id", userId)
        .order("position", { ascending: true });

      // Find "mensagem enviada" stage or use the first one
      const sentStage = stages?.find(s => 
        s.name.toLowerCase().includes("mensagem enviada") || 
        s.name.toLowerCase().includes("primeiro contato") ||
        s.name.toLowerCase().includes("mensagem")
      ) || stages?.[0];

      if (!sentStage) {
        console.warn("No pipeline stages found for CRM lead creation");
        return;
      }

      // Check if lead already exists in CRM by phone (avoid duplicates)
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, pipeline_stage_id")
        .eq("user_id", userId)
        .eq("id", leadId)
        .single();

      if (existingLead) {
        // Update existing lead with CRM data
        await supabase
          .from("leads")
          .update({
            pipeline_stage_id: sentStage.id,
            origin: "Oportunidades",
          } as any)
          .eq("id", leadId);
      }

      // Log activity
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        user_id: userId,
        activity_type: "message_sent",
        description: `Mensagem de abordagem enviada via Oportunidades`,
      });
    } catch (err) {
      console.error("Error creating CRM profile:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            {state === "sent" ? "Mensagem Enviada!" : state === "no_numbers" ? "Nenhum Número Conectado" : "Enviar Mensagem"}
          </DialogTitle>
          <DialogDescription>
            {state === "no_numbers" && "Você precisa conectar um número do WhatsApp para enviar mensagens"}
            {state === "select_number" && "Selecione o número para enviar a mensagem"}
            {state === "preview" && `Confirme o envio para ${leadName}`}
            {state === "typing" && "Simulando digitação humana..."}
            {state === "sent" && "A mensagem foi entregue com sucesso"}
            {state === "error" && "Houve um erro ao enviar a mensagem"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* No numbers state */}
          {state === "no_numbers" && !loadingNumbers && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle size={28} className="text-amber-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Nenhum número do WhatsApp conectado</p>
                <p className="text-xs text-muted-foreground">
                  Conecte um número em "Gerenciar Números" para poder enviar mensagens.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                {onRequestConnect && (
                  <Button onClick={() => { onOpenChange(false); onRequestConnect(); }} className="gap-2">
                    <Wifi size={16} />
                    Conectar Número
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Loading numbers */}
          {loadingNumbers && (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Carregando números...</span>
            </div>
          )}

          {/* Number selection */}
          {state === "select_number" && !loadingNumbers && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecione o número de envio</label>
                <Select value={selectedNumberId || ""} onValueChange={setSelectedNumberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um número" />
                  </SelectTrigger>
                  <SelectContent>
                    {numbers.map(n => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name} {n.phone_number ? `(${n.phone_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Message preview */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Mensagem para {leadName}:</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSelectNumber} disabled={!selectedNumberId} className="flex-1 gap-2">
                  <Send size={16} />
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Preview state */}
          {state === "preview" && (
            <>
              <div className="bg-muted/40 rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Mensagem para {leadName}:</p>
                  {numbers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Via: {numbers.find(n => n.id === selectedNumberId)?.phone_number || numbers.find(n => n.id === selectedNumberId)?.name}
                    </p>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  if (numbers.length > 1) setState("select_number");
                  else onOpenChange(false);
                }} className="flex-1">
                  {numbers.length > 1 ? "Trocar Número" : "Cancelar"}
                </Button>
                <Button onClick={handleSend} className="flex-1 gap-2">
                  <Send size={16} />
                  Confirmar Envio
                </Button>
              </div>
            </>
          )}

          {/* Typing simulation */}
          {state === "typing" && (
            <div className="space-y-4">
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
              <p className="text-xs text-muted-foreground text-center">
                Você pode fechar esta janela. O envio continuará em segundo plano.
              </p>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Fechar e continuar em segundo plano
              </Button>
            </div>
          )}

          {/* Success state */}
          {state === "sent" && (
            <>
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Enviada com sucesso!</p>
                  <p className="text-xs text-muted-foreground">A mensagem foi entregue e o lead foi adicionado ao CRM</p>
                </div>
              </div>
              <Button onClick={() => onOpenChange(false)} className="w-full gap-2">
                <CheckCircle2 size={16} />
                Fechar
              </Button>
            </>
          )}

          {/* Error state */}
          {state === "error" && (
            <>
              <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <span className="text-sm font-medium text-destructive">Falha no envio. Verifique seu WhatsApp conectado e tente novamente.</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Fechar
                </Button>
                <Button onClick={handleSend} className="flex-1 gap-2">
                  <Send size={16} />
                  Tentar Novamente
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
