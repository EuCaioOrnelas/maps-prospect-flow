import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const quickPrompts = [
  "Quero um fluxo para vender meus serviços e fechar contratos",
  "Quero um fluxo de atendimento automático com menu de opções",
  "Quero um fluxo de suporte com triagem e escalonamento",
  "Quero captar leads e qualificar antes de passar para humano",
  "Quero enviar proposta comercial e fazer follow-up automático",
  "Quero um funil completo de vendas no WhatsApp",
  "Quero um fluxo para academia com planos e aula experimental",
  "Quero um fluxo para clínica com agendamento de consultas",
  "Quero um fluxo para imobiliária com filtros e visita",
  "Quero um fluxo para restaurante com cardápio e delivery",
];

export default function CreateFlowAI() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  const createWithAI = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) throw new Error("Descreva o que deseja para o fluxo");

      const { data: flow, error: flowErr } = await supabase
        .from("wa_automation_flows")
        .insert({ user_id: user!.id, name: "Fluxo IA" })
        .select()
        .single();
      if (flowErr) throw flowErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke("generate-wa-flow", {
        body: { prompt: prompt.trim(), flow_id: flow.id },
      });

      if (fnErr) throw fnErr;
      if (result?.error) throw new Error(result.error);

      if (result?.flow_name) {
        await supabase
          .from("wa_automation_flows")
          .update({ name: result.flow_name })
          .eq("id", flow.id);
      }

      return flow;
    },
    onSuccess: (flow) => {
      toast.success("Fluxo gerado com IA!");
      navigate(`/fluxos/${flow.id}`);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao gerar fluxo com IA"),
  });

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col lg:ml-[72px]">
        <AppHeader profile={profile} />
        <MobileNav profile={profile} />
        <BackgroundGlow />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {/* Back */}
          <div className="w-full max-w-2xl mb-8">
            <button
              onClick={() => navigate("/fluxos")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} /> Voltar para fluxos
            </button>
          </div>

          {/* Hero */}
          <div className="flex flex-col items-center text-center max-w-2xl w-full">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground mb-6">
              <Sparkles size={14} className="text-primary" />
              Descreva. Nós montamos o fluxo.
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
              Crie fluxos inteligentes prontos<br />para usar no WhatsApp
            </h1>

            <p className="text-sm text-muted-foreground mb-10 max-w-md">
              Descreva seu objetivo e a IA irá montar automaticamente um fluxo completo de atendimento, vendas ou suporte.
            </p>

            {/* Input */}
            <div className="w-full max-w-xl flex items-center gap-2 mb-10">
              <div className="flex-1 relative">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Quero um fluxo para..."
                  className="h-12 pl-4 pr-4 text-sm bg-card border-border rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && prompt.trim() && !createWithAI.isPending) {
                      createWithAI.mutate();
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => createWithAI.mutate()}
                disabled={createWithAI.isPending || !prompt.trim()}
                className="h-12 px-5 rounded-xl gap-2 shrink-0"
              >
                {createWithAI.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Criar fluxo
                  </>
                )}
              </Button>
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="text-xs px-3.5 py-2 rounded-full border border-border bg-card text-muted-foreground hover:bg-primary/5 hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
