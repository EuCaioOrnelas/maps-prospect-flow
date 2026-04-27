import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Play, Pause, Plus, Mail, Clock, GitBranch, Flag, Zap, BarChart3, TestTube, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { EntryNode } from "@/components/email-flows/nodes/EntryNode";
import { EmailNode } from "@/components/email-flows/nodes/EmailNode";
import { WaitNode } from "@/components/email-flows/nodes/WaitNode";
import { ConditionNode } from "@/components/email-flows/nodes/ConditionNode";
import { EndNode } from "@/components/email-flows/nodes/EndNode";
import { NodeConfigDrawer } from "@/components/email-flows/NodeConfigDrawer";
import { FlowAnalyticsDialog } from "@/components/email-flows/FlowAnalyticsDialog";
import { FlowTestDialog } from "@/components/email-flows/FlowTestDialog";

const nodeTypes = {
  entry: EntryNode,
  email: EmailNode,
  wait: WaitNode,
  condition: ConditionNode,
  end: EndNode,
};

const statusLabels: Record<string, string> = { draft: "Rascunho", active: "Ativo", paused: "Pausado", archived: "Arquivado" };

export default function AdminEmailFlowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadFlow();
  }, [id]);

  const loadNodeMetrics = async (flowId: string) => {
    const { data: logs } = await supabase
      .from("email_flow_execution_logs")
      .select("node_id, action_type")
      .eq("flow_id", flowId);

    const metricsMap: Record<string, any> = {};
    (logs || []).forEach(log => {
      if (!log.node_id) return;
      if (!metricsMap[log.node_id]) metricsMap[log.node_id] = { passed: 0, sent: 0, opened: 0, clicked: 0, purchased: 0 };
      metricsMap[log.node_id].passed++;
      if (log.action_type === "email_sent") metricsMap[log.node_id].sent++;
      if (log.action_type === "email_opened") metricsMap[log.node_id].opened++;
      if (log.action_type === "email_clicked") metricsMap[log.node_id].clicked++;
      if (log.action_type === "email_purchased") metricsMap[log.node_id].purchased++;
    });
    return metricsMap;
  };

  const loadFlow = async () => {
    const { data: flowData } = await supabase.from("email_flows").select("*").eq("id", id).single();
    if (!flowData) { navigate("/admin/email-flows"); return; }
    setFlow(flowData);
    setFlowName(flowData.name);

    const [{ data: dbNodes }, { data: dbEdges }] = await Promise.all([
      supabase.from("email_flow_nodes").select("*").eq("flow_id", id),
      supabase.from("email_flow_edges").select("*").eq("flow_id", id),
    ]);

    const metricsMap = await loadNodeMetrics(id!);

    const rfNodes: Node[] = (dbNodes || []).map(n => ({
      id: n.id,
      type: n.node_type,
      position: { x: n.position_x, y: n.position_y },
      data: { label: n.name, config: n.config || {}, node_type: n.node_type, metrics: metricsMap[n.id] || { passed: 0, sent: 0, opened: 0, clicked: 0, purchased: 0 } },
    }));

    const rfEdges: Edge[] = (dbEdges || []).map(e => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      sourceHandle: e.source_handle === "source" ? null : (e.source_handle || null),
      targetHandle: e.target_handle === "target" ? null : (e.target_handle || null),
      label: e.condition_label || undefined,
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      animated: true,
      zIndex: 10,
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
  };

  const onConnect = useCallback(async (params: Connection) => {
    if (!id || !params.source || !params.target) return;

    const tempEdgeId = `temp-${crypto.randomUUID()}`;

    setEdges(eds => addEdge({
      id: tempEdgeId,
      ...params,
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      animated: true,
      zIndex: 10,
    }, eds));

    const { data, error } = await supabase
      .from("email_flow_edges")
      .insert({
        flow_id: id,
        source_node_id: params.source,
        target_node_id: params.target,
        source_handle: params.sourceHandle || null,
        target_handle: params.targetHandle || null,
        condition_label: null,
      })
      .select("id")
      .single();

    if (error || !data) {
      setEdges(eds => eds.filter(e => e.id !== tempEdgeId));
      toast.error("Erro ao salvar conexão");
      return;
    }

    setEdges(eds => eds.map(e => e.id === tempEdgeId ? { ...e, id: data.id } : e));
  }, [id, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setEdgeToDelete(edge);
  }, []);

  const confirmDeleteEdge = useCallback(async () => {
    if (!edgeToDelete) return;

    const isTempEdge = edgeToDelete.id.startsWith("temp-");

    if (!isTempEdge && id) {
      const { error } = await supabase
        .from("email_flow_edges")
        .delete()
        .eq("id", edgeToDelete.id)
        .eq("flow_id", id);

      if (error) {
        toast.error("Erro ao remover conexão");
        return;
      }
    }

    setEdges(eds => eds.filter(e => e.id !== edgeToDelete.id));
    setEdgeToDelete(null);
    toast.success("Conexão removida");
  }, [edgeToDelete, id, setEdges]);

  const addNode = async (type: string) => {
    if (!id) return;
    if (type === "entry" && nodes.some(n => n.type === "entry")) {
      toast.error("Só pode haver 1 bloco de entrada");
      return;
    }

    const names: Record<string, string> = { entry: "Entrada", email: "Email", wait: "Espera", condition: "Condição", end: "Finalização" };
    const defaultConfigs: Record<string, any> = {
      entry: { trigger_type: "", audience_type: "" },
      email: { subject: "", body: "", preview_text: "", from_name: "Wiize", reply_to: "" },
      wait: { delay_value: 1, delay_unit: "days", business_hours_only: false },
      condition: { condition_type: "email_opened", value: "" },
      end: { note: "" },
    };

    const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.x)) : 0;
    const { data, error } = await supabase.from("email_flow_nodes").insert({
      flow_id: id,
      node_type: type,
      name: names[type] || type,
      config: defaultConfigs[type] || {},
      position_x: maxX + 300,
      position_y: 250,
    }).select().single();

    if (error || !data) { toast.error("Erro ao criar bloco"); return; }

    setNodes(nds => [...nds, {
      id: data.id,
      type: data.node_type,
      position: { x: data.position_x, y: data.position_y },
      data: { label: data.name, config: data.config || {}, node_type: data.node_type },
    }]);
  };

  const saveFlow = async () => {
    if (!id) return;
    setSaving(true);

    // CRITICAL: Sync entry node config to email_flows columns so the
    // backend processor (which reads flow.trigger_type / flow.audience_type
    // directly) targets the correct audience. Without this, the processor
    // falls back to wrong defaults and enrolls users that should never
    // be in the flow (e.g., trial users receiving cart-recovery emails).
    const entryNode = nodes.find(n => n.type === "entry");
    const entryCfg: any = entryNode?.data?.config || {};
    const flowUpdate: any = { name: flowName };
    if (entryNode) {
      flowUpdate.trigger_type = entryCfg.trigger_type || null;
      flowUpdate.audience_type = entryCfg.audience_type || null;
      flowUpdate.trigger_config = {
        ...(entryCfg.trigger_config || {}),
        ...(entryCfg.inactive_days ? { inactive_days: entryCfg.inactive_days } : {}),
        ...(entryCfg.score_threshold ? { score_threshold: entryCfg.score_threshold } : {}),
        ...(entryCfg.tag_name ? { tag_name: entryCfg.tag_name } : {}),
      };
    }
    await supabase.from("email_flows").update(flowUpdate).eq("id", id);

    // Persist node config + position (config was previously NEVER saved here,
    // causing the entry node trigger to drift out of sync with the flow row)
    for (const node of nodes) {
      await supabase.from("email_flow_nodes").update({
        position_x: node.position.x,
        position_y: node.position.y,
        config: (node.data as any)?.config || {},
        name: typeof (node.data as any)?.label === "string" ? (node.data as any).label : undefined,
      }).eq("id", node.id);
    }

    // Sync edges: delete old, insert current state
    const { error: delErr } = await supabase.from("email_flow_edges").delete().eq("flow_id", id);
    if (delErr) console.error("Error deleting edges:", delErr);

    for (const edge of edges) {
      const edgeData: any = {
        flow_id: id,
        source_node_id: edge.source,
        target_node_id: edge.target,
        source_handle: edge.sourceHandle || null,
        target_handle: edge.targetHandle || null,
        condition_label: typeof edge.label === "string" ? edge.label : null,
      };
      // Only keep ID if it's a valid UUID (not temp-)
      if (!edge.id.startsWith("temp-")) {
        edgeData.id = edge.id;
      }
      const { error: insErr } = await supabase.from("email_flow_edges").insert(edgeData);
      if (insErr) console.error("Error inserting edge:", insErr, edgeData);
    }

    toast.success("Fluxo salvo!");
    setSaving(false);
  };

  const updateNodeConfig = (nodeId: string, newData: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
  };

  const deleteNode = async (nodeId: string) => {
    await supabase.from("email_flow_nodes").delete().eq("id", nodeId);
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setDrawerOpen(false);
    setSelectedNode(null);
    toast.success("Bloco removido");
  };

  const toggleStatus = async () => {
    if (!flow) return;
    const newStatus = flow.status === "active" ? "paused" : "active";

    if (newStatus === "active") {
      // Validate flow
      const hasEntry = nodes.some(n => n.type === "entry");
      if (!hasEntry) { toast.error("O fluxo precisa de um bloco de entrada"); return; }
      const entryNode = nodes.find(n => n.type === "entry");
      if (!entryNode?.data?.config?.trigger_type) { toast.error("Configure o gatilho do bloco de entrada"); return; }
      const emailNodes = nodes.filter(n => n.type === "email");
      for (const en of emailNodes) {
        if (!en.data?.config?.subject || !en.data?.config?.body) {
          toast.error(`Configure o email "${en.data?.label}"`);
          return;
        }
      }
      const orphanNodes = nodes.filter(n => {
        if (n.type === "entry") return false;
        return !edges.some(e => e.target === n.id);
      });
      if (orphanNodes.length) { toast.error("Existem blocos desconectados"); return; }
    }

    await saveFlow();
    const { error } = await supabase.from("email_flows").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Erro ao alterar status"); return; }
    setFlow({ ...flow, status: newStatus });
    toast.success(newStatus === "active" ? "Fluxo ativado!" : "Fluxo pausado");
  };

  if (!flow) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center gap-3 px-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/email-flows")}>
          <ArrowLeft size={18} />
        </Button>
        <Input
          value={flowName}
          onChange={e => setFlowName(e.target.value)}
          className="max-w-xs h-8 text-sm font-medium"
        />
        <Badge variant="outline" className="text-xs">{statusLabels[flow.status]}</Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTestOpen(true)}>
          <TestTube size={14} /> Testar
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAnalyticsOpen(true)}>
          <BarChart3 size={14} /> Métricas
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={saveFlow} disabled={saving}>
          <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button size="sm" className="gap-1.5" onClick={toggleStatus}>
          {flow.status === "active" ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Ativar</>}
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" ref={reactFlowWrapper} style={{ background: 'hsl(220 20% 4%)' }}>
        {/* Glow effects */}
        <div className="absolute inset-0 pointer-events-none z-[1]">
          <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full" style={{ background: 'radial-gradient(ellipse, hsl(158 72% 38% / 0.07) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(ellipse, hsl(158 72% 38% / 0.05) 0%, transparent 70%)' }} />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          style={{ background: 'transparent' }}
          className=""
        >
          <Background variant={BackgroundVariant.Lines} color="hsl(158 72% 38%)" gap={32} lineWidth={0.5} style={{ opacity: 0.06 }} />
          <Controls className="!bg-card/90 !backdrop-blur-sm !border-border !shadow-lg !rounded-xl [&>button]:!bg-transparent [&>button]:!border-border/50 [&>button]:!text-muted-foreground [&>button:hover]:!bg-accent/10 [&>button:hover]:!text-foreground" />
          <MiniMap
            className="!bg-card/80 !backdrop-blur-sm !border-border !rounded-xl"
            nodeColor="hsl(var(--primary))"
            maskColor="hsl(220 20% 4% / 0.8)"
          />

          {/* Add node toolbar */}
          <Panel position="top-left" className="!m-3">
            <div className="bg-card/90 backdrop-blur-md border border-border rounded-xl p-2 shadow-lg flex flex-col gap-0.5">
              <p className="text-[10px] font-medium text-muted-foreground/70 px-2 py-1.5 uppercase tracking-wider">Adicionar Bloco</p>
              <Button variant="ghost" size="sm" className="justify-start gap-2.5 text-xs h-8 text-muted-foreground hover:text-foreground" onClick={() => addNode("email")}>
                <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center"><Mail size={12} className="text-blue-400" /></div> Email
              </Button>
              <Button variant="ghost" size="sm" className="justify-start gap-2.5 text-xs h-8 text-muted-foreground hover:text-foreground" onClick={() => addNode("wait")}>
                <div className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center"><Clock size={12} className="text-amber-400" /></div> Espera
              </Button>
              <Button variant="ghost" size="sm" className="justify-start gap-2.5 text-xs h-8 text-muted-foreground hover:text-foreground" onClick={() => addNode("condition")}>
                <div className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center"><GitBranch size={12} className="text-purple-400" /></div> Condição
              </Button>
              <Button variant="ghost" size="sm" className="justify-start gap-2.5 text-xs h-8 text-muted-foreground hover:text-foreground" onClick={() => addNode("end")}>
                <div className="w-5 h-5 rounded bg-destructive/10 flex items-center justify-center"><Flag size={12} className="text-destructive" /></div> Finalização
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Config Drawer */}
      <NodeConfigDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        node={selectedNode}
        flowId={id!}
        onUpdate={updateNodeConfig}
        onDelete={deleteNode}
      />

      <FlowAnalyticsDialog open={analyticsOpen} onOpenChange={setAnalyticsOpen} flowId={id!} />
      <FlowTestDialog open={testOpen} onOpenChange={setTestOpen} flowId={id!} />

      <AlertDialog open={!!edgeToDelete} onOpenChange={(open) => !open && setEdgeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa conexão entre os blocos será removida. Você pode reconectá-los depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEdge} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 size={14} className="mr-1.5" /> Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
