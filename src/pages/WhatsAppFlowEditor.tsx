import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Save, Undo2, Plus } from "lucide-react";
import { WAEntryNode } from "@/components/wa-flow/nodes/WAEntryNode";
import { WAMessageNode } from "@/components/wa-flow/nodes/WAMessageNode";
import { WAButtonsNode } from "@/components/wa-flow/nodes/WAButtonsNode";
import { WAConditionNode } from "@/components/wa-flow/nodes/WAConditionNode";
import { WAWaitNode } from "@/components/wa-flow/nodes/WAWaitNode";
import { WAActionNode } from "@/components/wa-flow/nodes/WAActionNode";
import { WAHandoffNode } from "@/components/wa-flow/nodes/WAHandoffNode";
import { WAEndNode } from "@/components/wa-flow/nodes/WAEndNode";
import { WANodeToolbar } from "@/components/wa-flow/WANodeToolbar";
import { WANodeConfigDrawer } from "@/components/wa-flow/WANodeConfigDrawer";

const nodeTypes = {
  entry: WAEntryNode,
  message: WAMessageNode,
  buttons: WAButtonsNode,
  condition: WAConditionNode,
  wait: WAWaitNode,
  action: WAActionNode,
  handoff: WAHandoffNode,
  end: WAEndNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { strokeWidth: 2, stroke: "hsl(158, 72%, 38%)" },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(158, 72%, 38%)" },
};

export default function WhatsAppFlowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState("Novo Fluxo");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch flow data
  const { data: flow, isLoading } = useQuery({
    queryKey: ["wa-flow", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_automation_flows")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: dbNodes = [] } = useQuery({
    queryKey: ["wa-flow-nodes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_flow_nodes")
        .select("*")
        .eq("flow_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: dbEdges = [] } = useQuery({
    queryKey: ["wa-flow-edges", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_flow_edges")
        .select("*")
        .eq("flow_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Initialize nodes/edges from DB
  useEffect(() => {
    if (flow) setFlowName(flow.name);
  }, [flow]);

  useEffect(() => {
    if (dbNodes.length > 0) {
      const mapped: Node[] = dbNodes.map((n: any) => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.position_x, y: n.position_y },
        data: { label: n.name, config: n.config || {} },
      }));
      setNodes(mapped);
    }
  }, [dbNodes]);

  useEffect(() => {
    if (dbEdges.length > 0) {
      const mapped: Edge[] = dbEdges.map((e: any) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle: e.source_handle,
        targetHandle: e.target_handle,
        label: e.label,
        ...defaultEdgeOptions,
      }));
      setEdges(mapped);
    }
  }, [dbEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
      setHasChanges(true);
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  }, []);

  const handleAddNode = useCallback(
    (type: string) => {
      const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
      const newX = lastNode ? lastNode.position.x + 280 : 100;
      const newY = lastNode ? lastNode.position.y : 200;

      const nameMap: Record<string, string> = {
        entry: "Entrada",
        message: "Mensagem",
        buttons: "Botões",
        condition: "Condição",
        wait: "Espera",
        action: "Ação",
        handoff: "Handoff",
        end: "Fim",
      };

      const newNode: Node = {
        id: `temp-${Date.now()}`,
        type,
        position: { x: newX, y: newY },
        data: { label: nameMap[type] || type, config: {} },
      };

      setNodes((nds) => [...nds, newNode]);
      setHasChanges(true);
    },
    [nodes, setNodes]
  );

  const handleUpdateNodeConfig = useCallback(
    (nodeId: string, config: any, label?: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config, ...(label ? { label } : {}) } }
            : n
        )
      );
      setHasChanges(true);
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setDrawerOpen(false);
      setSelectedNode(null);
      setHasChanges(true);
    },
    [setNodes, setEdges]
  );

  // Save flow
  const saveFlow = useMutation({
    mutationFn: async () => {
      // Update flow name
      await supabase
        .from("wa_automation_flows")
        .update({ name: flowName })
        .eq("id", id!);

      // Delete old nodes and edges
      await supabase.from("wa_flow_edges").delete().eq("flow_id", id!);
      await supabase.from("wa_flow_nodes").delete().eq("flow_id", id!);

      // Insert nodes
      const nodeIdMap: Record<string, string> = {};
      for (const node of nodes) {
        const { data, error } = await supabase
          .from("wa_flow_nodes")
          .insert({
            flow_id: id!,
            node_type: node.type as any,
            name: (node.data as any).label || "Bloco",
            config: (node.data as any).config || {},
            position_x: node.position.x,
            position_y: node.position.y,
          })
          .select()
          .single();
        if (error) throw error;
        nodeIdMap[node.id] = data.id;
      }

      // Insert edges with mapped IDs
      if (edges.length > 0) {
        const edgesToInsert = edges.map((e) => ({
          flow_id: id!,
          source_node_id: nodeIdMap[e.source] || e.source,
          target_node_id: nodeIdMap[e.target] || e.target,
          source_handle: e.sourceHandle || null,
          target_handle: e.targetHandle || null,
          label: typeof e.label === "string" ? e.label : null,
        }));
        const { error } = await supabase.from("wa_flow_edges").insert(edgesToInsert);
        if (error) throw error;
      }

      // Refresh
      queryClient.invalidateQueries({ queryKey: ["wa-flow-nodes", id] });
      queryClient.invalidateQueries({ queryKey: ["wa-flow-edges", id] });
    },
    onSuccess: () => {
      toast.success("Fluxo salvo com sucesso!");
      setHasChanges(false);
    },
    onError: () => toast.error("Erro ao salvar fluxo"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/automations")}>
          <ArrowLeft size={18} />
        </Button>
        <Input
          value={flowName}
          onChange={(e) => {
            setFlowName(e.target.value);
            setHasChanges(true);
          }}
          className="max-w-[240px] h-9 text-sm font-medium bg-transparent border-transparent hover:border-border focus:border-border"
        />
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveFlow.mutate()}
          disabled={saveFlow.isPending || !hasChanges}
          className="gap-1.5"
        >
          <Save size={14} />
          {saveFlow.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            if (changes.some((c) => c.type === "position" && c.dragging === false)) {
              setHasChanges(true);
            }
          }}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Background color="hsl(var(--border))" gap={20} size={1} />
          <Controls className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor="hsl(158, 72%, 38%)"
            maskColor="hsl(var(--background) / 0.8)"
          />
          <Panel position="top-center">
            <WANodeToolbar onAddNode={handleAddNode} />
          </Panel>
        </ReactFlow>
      </div>

      {/* Config drawer */}
      {selectedNode && (
        <WANodeConfigDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          node={selectedNode}
          onUpdate={handleUpdateNodeConfig}
          onDelete={handleDeleteNode}
        />
      )}
    </div>
  );
}
