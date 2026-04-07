import { useState } from "react";
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
import { Plus, Workflow, MoreVertical, Play, Pause, Archive, Trash2, Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  active: { label: "Ativo", color: "bg-primary/10 text-primary" },
  paused: { label: "Pausado", color: "bg-amber-500/10 text-amber-500" },
  archived: { label: "Arquivado", color: "bg-muted text-muted-foreground/60" },
};

export default function WhatsAppAutomations() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const createFlow = useMutation({
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
      navigate(`/fluxos/${data.id}`);
    },
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
        .insert({
          user_id: user!.id,
          name: `${flow.name} (cópia)`,
          description: flow.description,
        })
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

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col lg:ml-[72px]">
        <AppHeader profile={profile} />
        <MobileNav profile={profile} />
        <BackgroundGlow />

        <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Fluxos</h1>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold gap-1">
                <FlaskConical className="h-3 w-3" />
                BETA
              </Badge>
            </div>
            <Button onClick={() => createFlow.mutate()} disabled={createFlow.isPending}>
              <Plus size={16} />
              Novo Fluxo
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5 h-32" />
                </Card>
              ))}
            </div>
          ) : flows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Workflow size={28} className="text-primary" />
                </div>
                <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum fluxo criado</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Crie fluxos de atendimento automático para WhatsApp via Meta Partners com mensagens, botões, condições e ações.
                  </p>
                </div>
                <Button onClick={() => createFlow.mutate()} disabled={createFlow.isPending}>
                  <Plus size={16} />
                  Criar primeiro fluxo
                </Button>
              </CardContent>
            </Card>
          ) : (
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
          )}
        </main>
      </div>
    </div>
  );
}
