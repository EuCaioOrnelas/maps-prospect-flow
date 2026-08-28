import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Workflow, Sparkles, ArrowLeft, Loader2, Wand2, RefreshCw, ShieldAlert, Instagram, MessageSquare, Plus } from "lucide-react";
import { useInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { InstagramConnectDialog } from "./InstagramConnectDialog";
import type { FlowChannel } from "@/lib/flowChannels";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useWebhookGate } from "@/hooks/useWebhookGate";


interface CreateFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "choose" | "ai";
  initialPrompt?: string;
}

const quickSuggestions = [
  "Quero um fluxo para vender meus serviços",
  "Quero um fluxo de atendimento automático",
  "Quero um fluxo de suporte com triagem",
  "Quero captar leads e qualificar antes do humano",
  "Quero enviar proposta e fazer follow-up",
  "Quero um funil completo de vendas no WhatsApp",
];

export function CreateFlowDialog({ open, onOpenChange, initialMode, initialPrompt }: CreateFlowDialogProps) {
  const [mode, setMode] = useState<"choose" | "ai">(initialMode || "choose");
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { connections, loading: loadingGate } = useWebhookGate();
  const [channel, setChannel] = useState<FlowChannel>("whatsapp");
  const [igDialogOpen, setIgDialogOpen] = useState(false);
  const { accounts: igAccounts, isLoading: loadingIg } = useInstagramAccounts();
  const defaultIgAccount = igAccounts.find((a) => a.status === "active") || igAccounts[0] || null;

  // Only Meta connections with verified webhook can power a flow.
  const eligible = (connections || []).filter(
    (c) => !!c.webhook_verified_at && (c.status === "connected" || c.status === "active"),
  );
  const hasMetaEligible = eligible.length > 0;
  const defaultConnection = eligible[0] || null;
  const isInstagram = channel === "instagram";
  const hasEligible = isInstagram ? !!defaultIgAccount : hasMetaEligible;
  const gateLoading = isInstagram ? loadingIg : loadingGate;

  useEffect(() => {
    if (open) {
      if (initialMode) setMode(initialMode);
      if (initialPrompt) setPrompt(initialPrompt);
    }
  }, [open, initialMode, initialPrompt]);

  const createBlank = useMutation({
    mutationFn: async () => {
      if (isInstagram && !defaultIgAccount) {
        throw new Error("Conecte uma conta profissional do Instagram antes de criar fluxos.");
      }
      if (!isInstagram && !defaultConnection) {
        throw new Error("Conecte um número Meta oficial com webhook verificado antes de criar fluxos.");
      }
      const { data, error } = await supabase
        .from("wa_automation_flows")
        .insert({
          user_id: user!.id,
          name: isInstagram ? "Novo Fluxo Instagram" : "Novo Fluxo",
          channel,
          api_type: "meta",
          waba_connection_id: isInstagram ? null : defaultConnection!.id,
          instagram_connection_id: isInstagram ? defaultIgAccount!.id : null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      onOpenChange(false);
      navigate(`/fluxos/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar fluxo"),
  });


  const createWithAI = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) {
        throw new Error("Descreva o que deseja para o fluxo");
      }

      if (isInstagram && !defaultIgAccount) {
        throw new Error("Conecte uma conta profissional do Instagram antes de criar fluxos.");
      }
      if (!isInstagram && !defaultConnection) {
        throw new Error("Conecte um número Meta oficial com webhook verificado antes de criar fluxos.");
      }

      // 1. Create flow (Meta-bound)
      const { data: flow, error: flowErr } = await supabase
        .from("wa_automation_flows")
        .insert({
          user_id: user!.id,
          name: isInstagram ? "Fluxo IA Instagram" : "Fluxo IA",
          channel,
          api_type: "meta",
          waba_connection_id: isInstagram ? null : defaultConnection!.id,
          instagram_connection_id: isInstagram ? defaultIgAccount!.id : null,
        } as any)
        .select()
        .single();
      if (flowErr) throw flowErr;


      // 2. Call edge function to generate
      const { data: result, error: fnErr } = await supabase.functions.invoke("generate-wa-flow", {
        body: { prompt: prompt.trim(), flow_id: flow.id, channel },
      });

      if (fnErr) throw fnErr;
      if (result?.error) throw new Error(result.error);

      // 3. Update flow name from AI
      if (result?.flow_name) {
        await supabase
          .from("wa_automation_flows")
          .update({ name: result.flow_name })
          .eq("id", flow.id);
      }

      return flow;
    },
    onSuccess: (flow) => {
      onOpenChange(false);
      setMode("choose");
      setPrompt("");
      toast.success("Fluxo gerado com IA!");
      navigate(`/fluxos/${flow.id}`);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao gerar fluxo com IA"),
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setMode("choose");
      setPrompt("");
    }, 200);
  };

  return (
    <>
    <InstagramConnectDialog open={igDialogOpen} onOpenChange={setIgDialogOpen} />
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden border-border/50 bg-card">
        {isInstagram && createWithAI.isPending ? (
          <div className="flex items-center justify-center py-8 px-4 relative overflow-hidden">
            <InstagramAISimulation userPrompt={prompt} isFinished={createWithAI.isSuccess} />
          </div>
        ) : mode === "choose" ? (
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-1">Criar Novo Fluxo</h2>
              <p className="text-sm text-muted-foreground">Escolha como deseja começar</p>
            </div>

            {/* Seletor de canal */}
            <div className="mb-5 grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/40 border border-border">
              {([
                { id: "whatsapp" as const, label: "WhatsApp", Icon: MessageSquare },
                { id: "instagram" as const, label: "Instagram", Icon: Instagram },
              ]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setChannel(id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
                    channel === id
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={14} className={id === "instagram" ? "text-pink-500" : "text-emerald-500"} />
                  {label}
                </button>
              ))}
            </div>

            {isInstagram && !loadingIg && !defaultIgAccount && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-pink-500/40 bg-pink-500/5 p-3 text-sm">
                <Instagram className="h-5 w-5 text-pink-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">Conecte uma conta do Instagram</p>
                  <p className="text-xs text-muted-foreground">
                    É necessário um perfil Empresa/Criador vinculado a uma Página do Facebook. O WhatsApp continua
                    funcionando normalmente.
                  </p>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setIgDialogOpen(true)}>
                    <Plus size={12} /> Conectar Instagram
                  </Button>
                </div>
              </div>
            )}

            {!isInstagram && !loadingGate && !hasEligible && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-700">Webhook Meta obrigatório</p>
                  <p className="text-xs text-amber-700/80">
                    Fluxos só funcionam em números conectados via API oficial da Meta <strong>com webhook verificado</strong>. Conecte ou verifique o webhook em Configurações &rsaquo; WhatsApp Oficial.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Blank */}
              <button
                onClick={() => createBlank.mutate()}
                disabled={createBlank.isPending || !hasEligible || gateLoading}
                className="group relative flex flex-col items-center gap-4 p-6 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"

              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Workflow size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">Fluxo em branco</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Comece do zero e construa manualmente via drag-and-drop
                  </p>
                </div>
              </button>

              {/* AI */}
              <button
                onClick={() => hasEligible && setMode("ai")}
                disabled={!hasEligible || gateLoading}
                className="group relative flex flex-col items-center gap-4 p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2.5 py-0.5 shadow-md">
                  Recomendado
                </Badge>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
                    <path d="M16 2L18.5 11.5L28 16L18.5 20.5L16 30L13.5 20.5L4 16L13.5 11.5L16 2Z" fill="#34A853"/>
                    <path d="M25 4L26 7.5L29.5 9L26 10.5L25 14L24 10.5L20.5 9L24 7.5L25 4Z" fill="#34A853" opacity="0.6"/>
                    <path d="M7 22L8 24.5L10.5 25.5L8 26.5L7 29L6 26.5L3.5 25.5L6 24.5L7 22Z" fill="#34A853" opacity="0.5"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">Criar com IA ✨</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Descreva seu objetivo e a IA monta o fluxo completo pra você
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <button
                onClick={() => setMode("choose")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wand2 size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Crie um fluxo inteligente com IA</h2>
                  <p className="text-xs text-muted-foreground">
                    Descreva seu objetivo e a IA irá montar um fluxo completo de atendimento, vendas ou suporte.
                  </p>
                </div>
              </div>
            </div>

            {/* Prompt */}
            <div className="px-6">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Quero um fluxo para vender planos de academia, qualificar o lead e enviar para pagamento"
                className="min-h-[100px] resize-none bg-background border-border text-sm"
              />
            </div>

            {/* Chips */}
            <div className="px-6 pt-4 pb-2">
              <p className="text-[11px] text-muted-foreground font-medium mb-2">💡 Sugestões rápidas</p>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-border mt-2 flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => createWithAI.mutate()}
                disabled={createWithAI.isPending || !prompt.trim()}
                className="gap-1.5"
              >
                {createWithAI.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Gerando fluxo...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Gerar fluxo com IA
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
