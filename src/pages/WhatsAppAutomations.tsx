import { useState, useMemo, useCallback } from "react";
import geminiIcon from "@/assets/logos/gemini-icon.png";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Plus, Sparkles, Workflow, MoreVertical, Play, Pause, Archive,
  Trash2, Copy, FlaskConical, Search, ShoppingCart, HeadphonesIcon,
  Users, FileText, MessageSquare, Megaphone, GraduationCap, Building2,
  Stethoscope, Dumbbell, Car, Utensils, BarChart3, Zap, Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFlowTemplate } from "@/data/flowTemplates";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  active: { label: "Ativo", color: "bg-primary/10 text-primary" },
  paused: { label: "Pausado", color: "bg-amber-500/10 text-amber-500" },
  archived: { label: "Arquivado", color: "bg-muted text-muted-foreground/60" },
};

const flowTemplates = [
  { id: "vendas", name: "Funil de Vendas", icon: ShoppingCart, description: "Qualificação → apresentação → oferta → pagamento", prompt: "Crie um funil de vendas completo com qualificação do lead, apresentação do produto, oferta especial e link de pagamento. Inclua follow-up para quem não respondeu." },
  { id: "suporte", name: "Suporte com Triagem", icon: HeadphonesIcon, description: "Triagem automática → resolução → escalonamento", prompt: "Crie um fluxo de suporte ao cliente com triagem automática por tipo de problema, resolução via FAQ e escalonamento para humano quando necessário." },
  { id: "captacao", name: "Captação de Leads", icon: Users, description: "Captar → qualificar → agendar reunião", prompt: "Crie um fluxo para captar leads frios, qualificá-los com perguntas estratégicas e agendar uma reunião com o time de vendas." },
  { id: "proposta", name: "Envio de Proposta", icon: FileText, description: "Gerar proposta → enviar → follow-up", prompt: "Crie um fluxo para envio de proposta comercial personalizada com follow-up automático perguntando se recebeu e se quer fechar." },
  { id: "atendimento", name: "Atendimento Geral", icon: MessageSquare, description: "Menu principal → direcionamento → resolução", prompt: "Crie um fluxo de atendimento geral com menu principal com opções de vendas, suporte, dúvidas e falar com humano." },
  { id: "campanha", name: "Resposta de Campanha", icon: Megaphone, description: "Capturar resposta → engajar → converter", prompt: "Crie um fluxo para responder automaticamente leads que respondem a uma campanha de WhatsApp, engajando e convertendo em venda." },
  { id: "academia", name: "Academia / Fitness", icon: Dumbbell, description: "Planos → aula experimental → matrícula", prompt: "Crie um fluxo para academia com apresentação de planos, agendamento de aula experimental e matrícula online." },
  { id: "imobiliaria", name: "Imobiliária", icon: Building2, description: "Tipo imóvel → filtros → agendamento visita", prompt: "Crie um fluxo para imobiliária com seleção de tipo de imóvel, filtros de localização e preço, e agendamento de visita." },
  { id: "clinica", name: "Clínica / Saúde", icon: Stethoscope, description: "Especialidade → disponibilidade → agendamento", prompt: "Crie um fluxo para clínica médica com seleção de especialidade, verificação de disponibilidade e agendamento de consulta." },
  { id: "escola", name: "Escola / Cursos", icon: GraduationCap, description: "Cursos → informações → matrícula", prompt: "Crie um fluxo para escola ou curso online com apresentação dos cursos, detalhes e processo de matrícula." },
  { id: "restaurante", name: "Restaurante / Delivery", icon: Utensils, description: "Cardápio → pedido → entrega", prompt: "Crie um fluxo para restaurante com apresentação do cardápio por categorias, confirmação de pedido e informações de entrega." },
  { id: "automotivo", name: "Automotivo", icon: Car, description: "Veículos → financiamento → agendamento", prompt: "Crie um fluxo para concessionária com seleção de veículos, simulação de financiamento e agendamento de test drive." },
];

export default function WhatsAppAutomations() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["wa-automation-flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_automation_flows")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return flowTemplates;
    const q = templateSearch.toLowerCase();
    return flowTemplates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [templateSearch]);

  const createBlankFlow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("wa_automation_flows")
        .insert({ user_id: user!.id, name: "Novo Fluxo" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => navigate(`/fluxos/${data.id}`),
    onError: () => toast.error("Erro ao criar fluxo"),
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wa_automation_flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-automation-flows"] });
      toast.success("Fluxo excluído");
    },
  });

  const duplicateFlow = useMutation({
    mutationFn: async (flow: any) => {
      const { data, error } = await supabase
        .from("wa_automation_flows")
        .insert({ user_id: user!.id, name: `${flow.name} (cópia)`, description: flow.description })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-automation-flows"] });
      toast.success("Fluxo duplicado");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("wa_automation_flows")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-automation-flows"] });
      toast.success("Status atualizado");
    },
  });

  const handleUseTemplate = useCallback(async (tpl: typeof flowTemplates[0]) => {
    setShowTemplatesDialog(false);
    const template = getFlowTemplate(tpl.id);
    if (!template) {
      // Fallback to AI if no hardcoded template
      navigate(`/fluxos/criar-ia?prompt=${encodeURIComponent(tpl.prompt)}`);
      return;
    }

    try {
      // Create the flow
      const { data: flow, error: flowError } = await supabase
        .from("wa_automation_flows")
        .insert({ user_id: user!.id, name: tpl.name, description: tpl.description })
        .select()
        .single();
      if (flowError || !flow) throw flowError;

      // Insert nodes and map temp IDs to real IDs
      const nodeIdMap: Record<string, string> = {};
      for (const node of template.nodes) {
        const { data, error } = await supabase
          .from("wa_flow_nodes")
          .insert({
            flow_id: flow.id,
            node_type: node.type as any,
            name: node.label,
            config: node.config,
            position_x: node.x,
            position_y: node.y,
          })
          .select()
          .single();
        if (error) throw error;
        nodeIdMap[node.id] = data.id;
      }

      // Insert edges
      if (template.edges.length > 0) {
        const edgesToInsert = template.edges.map((e) => ({
          flow_id: flow.id,
          source_node_id: nodeIdMap[e.source],
          target_node_id: nodeIdMap[e.target],
          source_handle: e.sourceHandle || null,
        }));
        const { error } = await supabase.from("wa_flow_edges").insert(edgesToInsert);
        if (error) throw error;
      }

      toast.success(`Template "${tpl.name}" criado!`);
      navigate(`/fluxos/${flow.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar fluxo a partir do template");
    }
  }, [user, navigate]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.name?.split(" ")[0] || "usuário";
  const totalFlows = flows.length;
  const activeFlows = flows.filter((f: any) => f.status === "active").length;
  const draftFlows = flows.filter((f: any) => f.status === "draft").length;

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col lg:ml-[72px]">
        <AppHeader profile={profile} />
        <MobileNav profile={profile} />
        <BackgroundGlow />

        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-8">
          {/* Greeting */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {greeting}, {firstName}!
              </h1>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold gap-1">
                <FlaskConical className="h-3 w-3" />
                BETA
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {totalFlows > 0
                ? `Você tem ${totalFlows} fluxo${totalFlows > 1 ? "s" : ""} criado${totalFlows > 1 ? "s" : ""}.`
                : "Comece criando seu primeiro fluxo de automação."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => createBlankFlow.mutate()}
              disabled={createBlankFlow.isPending}
              className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Plus size={20} className="text-primary transition-transform duration-300 group-hover:scale-125 group-hover:rotate-90" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Criar novo fluxo</p>
                <p className="text-xs text-muted-foreground">Comece do zero no editor</p>
              </div>
            </button>

            <button
              onClick={() => setShowTemplatesDialog(true)}
              className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Workflow size={20} className="text-primary transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Usar template</p>
                <p className="text-xs text-muted-foreground">{flowTemplates.length} templates prontos</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/fluxos/criar-ia")}
              className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Sparkles size={20} className="text-amber-500 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Criar com IA ✨</p>
                <p className="text-xs text-muted-foreground">Descreva e gere automaticamente</p>
              </div>
            </button>
          </div>


          {/* Metrics */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">Suas métricas</h2>
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Workflow size={13} /> Fluxos criados
                  </div>
                  <p className="text-2xl font-bold text-foreground">{totalFlows}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Zap size={13} /> Publicados
                  </div>
                  <p className="text-2xl font-bold text-foreground">{activeFlows}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <BarChart3 size={13} /> Rascunhos
                  </div>
                  <p className="text-2xl font-bold text-foreground">{draftFlows}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Flows list */}
          {flows.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">Seus fluxos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flows.map((flow: any) => {
                  const st = statusLabels[flow.status] || statusLabels.draft;
                  return (
                    <Card
                      key={flow.id}
                      className="hover:border-primary/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/fluxos/${flow.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{flow.name}</h3>
                            {flow.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{flow.description}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100">
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              {flow.status === "draft" && (
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: flow.id, status: "active" })}>
                                  <Play size={14} className="mr-2" /> Ativar
                                </DropdownMenuItem>
                              )}
                              {flow.status === "active" && (
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: flow.id, status: "paused" })}>
                                  <Pause size={14} className="mr-2" /> Pausar
                                </DropdownMenuItem>
                              )}
                              {flow.status === "paused" && (
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: flow.id, status: "active" })}>
                                  <Play size={14} className="mr-2" /> Retomar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => duplicateFlow.mutate(flow)}>
                                <Copy size={14} className="mr-2" /> Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: flow.id, status: "archived" })}>
                                <Archive size={14} className="mr-2" /> Arquivar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteFlow.mutate(flow.id)}
                              >
                                <Trash2 size={14} className="mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(flow.updated_at), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && flows.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Workflow size={28} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum fluxo criado</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Crie fluxos de atendimento automático para WhatsApp com mensagens, botões, condições e ações.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Templates Dialog */}
        <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
          <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden border-border/50 bg-card max-h-[80vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
              <h2 className="text-lg font-bold text-foreground mb-1">Templates prontos</h2>
              <p className="text-xs text-muted-foreground mb-3">Escolha um template e a IA irá montar o fluxo completo.</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar template..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-background"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleUseTemplate(tpl)}
                    className="group flex items-start gap-3 p-3.5 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <tpl.icon size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{tpl.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{tpl.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              {filteredTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum template encontrado</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
