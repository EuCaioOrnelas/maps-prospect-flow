import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Workflow, Sparkles, ArrowLeft, Loader2, Wand2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

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

  useEffect(() => {
    if (open) {
      if (initialMode) setMode(initialMode);
      if (initialPrompt) setPrompt(initialPrompt);
    }
  }, [open, initialMode, initialPrompt]);

  const createBlank = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("wa_automation_flows")
        .insert({ user_id: user!.id, name: "Novo Fluxo" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      onOpenChange(false);
      navigate(`/fluxos/${data.id}`);
    },
    onError: () => toast.error("Erro ao criar fluxo"),
  });

  const createWithAI = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) {
        throw new Error("Descreva o que deseja para o fluxo");
      }

      // 1. Create flow
      const { data: flow, error: flowErr } = await supabase
        .from("wa_automation_flows")
        .insert({ user_id: user!.id, name: "Fluxo IA" })
        .select()
        .single();
      if (flowErr) throw flowErr;

      // 2. Call edge function to generate
      const { data: result, error: fnErr } = await supabase.functions.invoke("generate-wa-flow", {
        body: { prompt: prompt.trim(), flow_id: flow.id },
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden border-border/50 bg-card">
        {mode === "choose" ? (
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-foreground mb-1">Criar Novo Fluxo</h2>
              <p className="text-sm text-muted-foreground">Escolha como deseja começar</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Blank */}
              <button
                onClick={() => createBlank.mutate()}
                disabled={createBlank.isPending}
                className="group relative flex flex-col items-center gap-4 p-6 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
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
                onClick={() => setMode("ai")}
                className="group relative flex flex-col items-center gap-4 p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all text-center"
              >
                <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2.5 py-0.5 gap-1 shadow-md">
                  ⭐ Recomendado
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
  );
}
