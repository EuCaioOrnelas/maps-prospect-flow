import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Copy, Play, Pause, Archive, Trash2, Mail, Workflow, ArrowLeft, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

interface EmailFlow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string | null;
  audience_type: string | null;
  created_at: string;
  updated_at: string;
  _enrollment_count?: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  archived: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};

const triggerLabels: Record<string, string> = {
  free_trial: "Entrou no Free Trial",
  signup: "Criou Conta",
  checkout_started: "Iniciou Checkout",
  inactive: "Inativo",
  score_reached: "Score Atingido",
  tag_added: "Tag Adicionada",
  manual: "Manual",
};

export default function AdminEmailFlows() {
  const { isAdmin } = useAdminCheck();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<EmailFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_flows")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar fluxos");
      setLoading(false);
      return;
    }

    // Get enrollment counts
    const flowIds = (data || []).map(f => f.id);
    if (flowIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("email_flow_enrollments")
        .select("flow_id")
        .in("flow_id", flowIds);

      const counts: Record<string, number> = {};
      (enrollments || []).forEach(e => {
        counts[e.flow_id] = (counts[e.flow_id] || 0) + 1;
      });

      setFlows((data || []).map(f => ({ ...f, _enrollment_count: counts[f.id] || 0 })));
    } else {
      setFlows(data || []);
    }
    setLoading(false);
  };

  const createFlow = async () => {
    const { data, error } = await supabase
      .from("email_flows")
      .insert({ name: "Novo Fluxo", created_by: user?.id })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar fluxo");
      return;
    }

    // Create default entry node
    await supabase.from("email_flow_nodes").insert({
      flow_id: data.id,
      node_type: "entry",
      name: "Entrada",
      position_x: 100,
      position_y: 250,
      config: { trigger_type: "", audience_type: "" },
    });

    navigate(`/admin/email-flows/${data.id}`);
  };

  const duplicateFlow = async (flow: EmailFlow) => {
    const { data: newFlow, error } = await supabase
      .from("email_flows")
      .insert({
        name: `${flow.name} (cópia)`,
        description: flow.description,
        trigger_type: flow.trigger_type,
        audience_type: flow.audience_type,
        status: "draft",
        created_by: user?.id,
      })
      .select()
      .single();

    if (error || !newFlow) { toast.error("Erro ao duplicar"); return; }

    // Copy nodes
    const { data: nodes } = await supabase
      .from("email_flow_nodes")
      .select("*")
      .eq("flow_id", flow.id);

    if (nodes?.length) {
      const nodeMap: Record<string, string> = {};
      for (const n of nodes) {
        const { data: nn } = await supabase
          .from("email_flow_nodes")
          .insert({ flow_id: newFlow.id, node_type: n.node_type, name: n.name, config: n.config, position_x: n.position_x, position_y: n.position_y })
          .select()
          .single();
        if (nn) nodeMap[n.id] = nn.id;
      }

      // Copy edges
      const { data: edges } = await supabase.from("email_flow_edges").select("*").eq("flow_id", flow.id);
      if (edges?.length) {
        for (const e of edges) {
          if (nodeMap[e.source_node_id] && nodeMap[e.target_node_id]) {
            await supabase.from("email_flow_edges").insert({
              flow_id: newFlow.id,
              source_node_id: nodeMap[e.source_node_id],
              target_node_id: nodeMap[e.target_node_id],
              source_handle: e.source_handle,
              target_handle: e.target_handle,
              condition_label: e.condition_label,
            });
          }
        }
      }
    }

    toast.success("Fluxo duplicado");
    loadFlows();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("email_flows").update({ status }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(`Status alterado para ${statusLabels[status]}`);
    loadFlows();
  };

  const deleteFlow = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este fluxo?")) return;
    const { error } = await supabase.from("email_flows").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Fluxo excluído");
    loadFlows();
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      {/* Admin Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Crown size={14} />
                Admin
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin" className="gap-2">
                  <ArrowLeft size={14} /> Voltar ao Admin
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Workflow className="h-6 w-6 text-primary" />
                Fluxos de Email
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Crie e gerencie automações de email com editor visual
              </p>
            </div>
            <Button onClick={createFlow} className="gap-2">
              <Plus size={16} /> Novo Fluxo
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-5 bg-muted rounded w-3/4" /></CardHeader>
                  <CardContent><div className="h-4 bg-muted rounded w-1/2" /></CardContent>
                </Card>
              ))}
            </div>
          ) : flows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum fluxo criado</h3>
                <p className="text-muted-foreground text-sm mb-4">Crie seu primeiro fluxo de automação de email</p>
                <Button onClick={createFlow} className="gap-2"><Plus size={16} /> Criar Fluxo</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {flows.map(flow => (
                <Card key={flow.id} className="hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => navigate(`/admin/email-flows/${flow.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-1">{flow.name}</CardTitle>
                      <Badge variant="outline" className={statusColors[flow.status]}>{statusLabels[flow.status]}</Badge>
                    </div>
                    {flow.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{flow.description}</p>}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {flow.trigger_type && <span>Gatilho: {triggerLabels[flow.trigger_type] || flow.trigger_type}</span>}
                      <span>{flow._enrollment_count || 0} leads</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/email-flows/${flow.id}`)}><Edit size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateFlow(flow)}><Copy size={14} /></Button>
                      {flow.status === "draft" && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus(flow.id, "active")}><Play size={14} /></Button>}
                      {flow.status === "active" && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus(flow.id, "paused")}><Pause size={14} /></Button>}
                      {flow.status === "paused" && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus(flow.id, "active")}><Play size={14} /></Button>}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus(flow.id, "archived")}><Archive size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFlow(flow.id)}><Trash2 size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
    </div>
  );
}
