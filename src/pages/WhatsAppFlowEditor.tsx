import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Undo2, Redo2, Trash2, PlayCircle, PanelLeftOpen, PanelLeftClose,
  Zap, MessageSquare, ToggleLeft, GitBranch, Clock, Settings,
  HeadphonesIcon, CircleStop, Bot, ChevronDown, FlaskConical, Shuffle, Sheet, CalendarPlus, Mail, Database,
} from "lucide-react";
import gmailIcon from "@/assets/icons/gmail-sm.png";
import sheetsIcon from "@/assets/icons/google-sheets-sm.png";
import calendarIcon from "@/assets/icons/google-calendar-sm.png";
import { Switch } from "@/components/ui/switch";
import { WAEntryNode } from "@/components/wa-flow/nodes/WAEntryNode";
import { WAMessageNode } from "@/components/wa-flow/nodes/WAMessageNode";
import { WAButtonsNode } from "@/components/wa-flow/nodes/WAButtonsNode";
import { WAConditionNode } from "@/components/wa-flow/nodes/WAConditionNode";
import { WAWaitNode } from "@/components/wa-flow/nodes/WAWaitNode";
import { WAActionNode } from "@/components/wa-flow/nodes/WAActionNode";
import { WAHandoffNode } from "@/components/wa-flow/nodes/WAHandoffNode";
import { WAEndNode } from "@/components/wa-flow/nodes/WAEndNode";
import { WAAgentNode } from "@/components/wa-flow/nodes/WAAgentNode";
import { WAABTestNode } from "@/components/wa-flow/nodes/WAABTestNode";
import { WARandomSplitNode } from "@/components/wa-flow/nodes/WARandomSplitNode";
import { WAGoogleSheetsNode } from "@/components/wa-flow/nodes/WAGoogleSheetsNode";
import { WAGoogleCalendarNode } from "@/components/wa-flow/nodes/WAGoogleCalendarNode";
import { WAGmailNode } from "@/components/wa-flow/nodes/WAGmailNode";
import { WADataCollectNode } from "@/components/wa-flow/nodes/WADataCollectNode";
import { WANodeConfigDrawer } from "@/components/wa-flow/WANodeConfigDrawer";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { WAFlowTestDialog } from "@/components/wa-flow/WAFlowTestDialog";

const normalizeStoredHandle = (value?: string | null) => {
  if (!value) return null;
  if (/^(btn|item)-\d+$/i.test(value)) return value.replace("-", "_");
  return value;
};

const getInteractiveItemIds = (config: any) => {
  const isListMode = config?.interaction_type === "list";
  const rawItems = isListMode
    ? (config?.list_items || [])
    : (config?.buttons || config?.reply_buttons || []);
  const prefix = isListMode ? "item" : "btn";

  return rawItems.map((item: any, index: number) => {
    if (typeof item === "string") return `${prefix}_${index}`;
    return item?.id || `${prefix}_${index}`;
  });
};

const resolveStoredSourceHandle = (sourceHandle: string | null, sourceNode: any) => {
  if (!sourceHandle || sourceNode?.node_type !== "buttons") return sourceHandle;

  const allowedIds = getInteractiveItemIds(sourceNode.config || {});
  const normalizedHandle = normalizeStoredHandle(sourceHandle);
  const match = allowedIds.find((id) => normalizeStoredHandle(id) === normalizedHandle);

  return match || normalizedHandle;
};

const nodeTypes = {
  entry: WAEntryNode,
  message: WAMessageNode,
  buttons: WAButtonsNode,
  condition: WAConditionNode,
  wait: WAWaitNode,
  action: WAActionNode,
  handoff: WAHandoffNode,
  end: WAEndNode,
  ai_agent: WAAgentNode,
  ab_test: WAABTestNode,
  random_split: WARandomSplitNode,
  google_sheets: WAGoogleSheetsNode,
  google_calendar: WAGoogleCalendarNode,
  gmail: WAGmailNode,
  data_collect: WADataCollectNode,
};

const defaultEdgeOptions = {
  animated: true,
  type: "default" as const,
  style: { strokeWidth: 2, stroke: "hsl(var(--muted-foreground) / 0.4)", strokeLinecap: "round" as const },
};

const sidebarCategories = [
  {
    label: "Gatilhos",
    items: [
      { type: "entry", icon: Zap, label: "Entrada", desc: "Trigger inicial do fluxo", color: "text-primary bg-primary/10" },
    ],
  },
  {
    label: "Mensagens",
    items: [
      { type: "message", icon: MessageSquare, label: "Mensagem", desc: "Texto, imagem, áudio, vídeo", color: "text-blue-400 bg-blue-400/10" },
      { type: "buttons", icon: ToggleLeft, label: "Botões", desc: "Respostas rápidas ou lista", color: "text-indigo-400 bg-indigo-400/10" },
    ],
  },
  {
    label: "Lógica",
    items: [
      { type: "condition", icon: GitBranch, label: "Condição", desc: "Sim/Não para bifurcação", color: "text-purple-400 bg-purple-400/10" },
      { type: "wait", icon: Clock, label: "Espera", desc: "Delay antes do próximo nó", color: "text-amber-400 bg-amber-400/10" },
      { type: "data_collect", icon: Database, label: "Coleta de Dados", desc: "Pergunta e salva em variável", color: "text-teal-400 bg-teal-400/10" },
      { type: "ab_test", icon: FlaskConical, label: "Teste A/B", desc: "Divide leads e metrifica", color: "text-emerald-400 bg-emerald-400/10" },
      { type: "random_split", icon: Shuffle, label: "Random Split", desc: "Distribui aleatoriamente", color: "text-sky-400 bg-sky-400/10" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { type: "ai_agent", icon: Bot, label: "Agente IA", desc: "IA responde e direciona", color: "text-violet-400 bg-violet-400/10" },
    ],
  },
  {
    label: "Ações",
    items: [
      { type: "action", icon: Settings, label: "Ação", desc: "Tag, Kanban, CRM", color: "text-cyan-400 bg-cyan-400/10" },
      { type: "handoff", icon: HeadphonesIcon, label: "Humano", desc: "Transferir para humano", color: "text-orange-400 bg-orange-400/10" },
      { type: "end", icon: CircleStop, label: "Encerramento", desc: "Encerrar o fluxo", color: "text-red-400 bg-red-400/10" },
    ],
  },
  {
    label: "Integrações",
    items: [
      { type: "google_sheets", icon: Sheet, label: "Google Sheets", desc: "Salvar lead em planilha", color: "text-green-500 bg-green-500/10", iconImg: sheetsIcon },
      { type: "google_calendar", icon: CalendarPlus, label: "Google Agenda", desc: "Criar evento no calendário", color: "text-blue-500 bg-blue-500/10", iconImg: calendarIcon },
      { type: "gmail", icon: Mail, label: "Gmail", desc: "Enviar email automático", color: "text-red-500 bg-red-500/10", iconImg: gmailIcon },
    ],
  },
];

// History entry type
type HistoryEntry = { nodes: Node[]; edges: Edge[] };

function DeleteFlowDialog({ onConfirm, isPending }: { onConfirm: () => void; isPending: boolean }) {
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const canDelete = confirmText === "EXCLUIR FLUXO";

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(""); }}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Excluir fluxo">
          <Trash2 size={15} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fluxo permanentemente?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Esta ação é irreversível. Todos os nós e conexões serão perdidos permanentemente.</p>
              <p className="text-foreground font-medium text-sm">
                Digite <span className="font-bold text-destructive">"EXCLUIR FLUXO"</span> para confirmar:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="EXCLUIR FLUXO"
                className="mt-2 uppercase"
                autoFocus
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            onClick={() => { onConfirm(); setOpen(false); }}
            disabled={!canDelete || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Excluindo..." : "Excluir permanentemente"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function WhatsAppFlowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const [flowName, setFlowName] = useState("Novo Fluxo");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResetVersion, setTestResetVersion] = useState(0);
  const [clipboard, setClipboard] = useState<Node | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [edgeToDelete, setEdgeToDelete] = useState<string | null>(null);

  // Undo/Redo history – use refs to avoid stale closures
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const [, forceHistoryRender] = useState(0);
  const isUndoRedo = useRef(false);

  const pushHistory = useCallback((n: Node[], e: Edge[]) => {
    if (isUndoRedo.current) { isUndoRedo.current = false; return; }
    const truncated = historyRef.current.slice(0, historyIndexRef.current + 1);
    const entry: HistoryEntry = { nodes: JSON.parse(JSON.stringify(n)), edges: JSON.parse(JSON.stringify(e)) };
    truncated.push(entry);
    if (truncated.length > 50) truncated.shift();
    historyRef.current = truncated;
    historyIndexRef.current = truncated.length - 1;
    forceHistoryRender((v) => v + 1);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedo.current = true;
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    setNodes(JSON.parse(JSON.stringify(prev.nodes)));
    setEdges(JSON.parse(JSON.stringify(prev.edges)));
    setHasChanges(true);
    forceHistoryRender((v) => v + 1);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedo.current = true;
    historyIndexRef.current += 1;
    const next = historyRef.current[historyIndexRef.current];
    setNodes(JSON.parse(JSON.stringify(next.nodes)));
    setEdges(JSON.parse(JSON.stringify(next.edges)));
    setHasChanges(true);
    forceHistoryRender((v) => v + 1);
  }, [setNodes, setEdges]);

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

  useEffect(() => {
    if (flow) setFlowName(flow.name);
  }, [flow]);

  useEffect(() => {
    if (dbNodes.length === 0 && dbEdges.length === 0) return;

    const sourceNodeMap = new Map(dbNodes.map((node: any) => [node.id, node]));

    const mappedNodes: Node[] = dbNodes.map((n: any) => ({
      id: n.id,
      type: n.node_type,
      position: { x: n.position_x, y: n.position_y },
      data: { label: n.name, config: n.config || {} },
    }));

    const mappedEdges: Edge[] = dbEdges.map((e: any) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      sourceHandle: resolveStoredSourceHandle(e.source_handle, sourceNodeMap.get(e.source_node_id)),
      targetHandle: e.target_handle,
      label: e.label,
      ...defaultEdgeOptions,
    }));

    setNodes(mappedNodes);
    setEdges(mappedEdges);

    if (mappedNodes.length > 0 || mappedEdges.length > 0) {
      historyRef.current = [{ nodes: JSON.parse(JSON.stringify(mappedNodes)), edges: JSON.parse(JSON.stringify(mappedEdges)) }];
      historyIndexRef.current = 0;
      forceHistoryRender((v) => v + 1);
    }
  }, [dbNodes, dbEdges, setEdges, setNodes]);

  const openFlowTest = useCallback(() => {
    if (nodes.length === 0) {
      toast.error("Adicione pelo menos um bloco para testar o fluxo");
      return;
    }

    setTestDialogOpen(true);
  }, [nodes.length]);


  const onConnect = useCallback(
    (params: Connection) => {
      // Prevent connections to/from blocked buttons nodes
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);
      if (sourceNode?.type === "buttons" && (sourceNode.data as any).config?._blocked_evolution) {
        toast.error("Botões bloqueados — exclusivo da API Inbound");
        return;
      }
      if (targetNode?.type === "buttons" && (targetNode.data as any).config?._blocked_evolution) {
        toast.error("Botões bloqueados — exclusivo da API Inbound");
        return;
      }
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, ...defaultEdgeOptions }, eds);
        pushHistory(nodes, newEdges);
        return newEdges;
      });
      setHasChanges(true);
    },
    [setEdges, nodes, pushHistory]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setSelectedNodeIds(new Set([node.id]));
    setDrawerOpen(true);
  }, []);

  const handleAddNode = useCallback(
    (type: string) => {
      const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
      const newX = lastNode ? lastNode.position.x + 280 : 100;
      const newY = lastNode ? lastNode.position.y : 200;

      const nameMap: Record<string, string> = {
        entry: "Entrada", message: "Mensagem", buttons: "Botões",
        condition: "Condição", wait: "Espera", action: "Ação",
        handoff: "Humano", end: "Encerramento", ai_agent: "Agente IA",
        ab_test: "Teste A/B", random_split: "Random Split",
        google_sheets: "Google Sheets", google_calendar: "Google Agenda", gmail: "Gmail",
        data_collect: "Coleta de Dados",
      };

      const defaultConfigs: Record<string, any> = {
        ab_test: {
          variants: [
            { id: "var_a", name: "Variante A", weight: 50 },
            { id: "var_b", name: "Variante B", weight: 50 },
          ],
        },
        random_split: {
          outputs: [
            { id: "out_0", name: "Saída 1" },
            { id: "out_1", name: "Saída 2" },
          ],
        },
      };

      const newNode: Node = {
        id: `temp-${Date.now()}`,
        type,
        position: { x: newX, y: newY },
        data: { label: nameMap[type] || type, config: defaultConfigs[type] || {} },
      };

      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      pushHistory(newNodes, edges);
      setHasChanges(true);
    },
    [nodes, edges, setNodes, pushHistory]
  );

  const handleUpdateNodeConfig = useCallback(
    (nodeId: string, config: any, label?: string) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config, ...(label ? { label } : {}) } }
            : n
        );
        pushHistory(updated, edges);
        return updated;
      });
      setHasChanges(true);
    },
    [setNodes, edges, pushHistory]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const newNodes = nodes.filter((n) => n.id !== nodeId);
      const newEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
      setNodes(newNodes);
      setEdges(newEdges);
      pushHistory(newNodes, newEdges);
      setDrawerOpen(false);
      setSelectedNode(null);
      setHasChanges(true);
    },
    [nodes, edges, setNodes, setEdges, pushHistory]
  );

  // Delete flow
  const deleteFlow = useMutation({
    mutationFn: async () => {
      // Collect media URLs from message nodes to clean up storage
      const mediaUrls: string[] = [];
      nodes.forEach((n) => {
        if (n.type === "message") {
          const cfg = (n.data as any).config || {};
          if (cfg.media_url && cfg.media_url.includes("wa-flow-media")) {
            mediaUrls.push(cfg.media_url);
          }
        }
      });

      // Delete media files from storage
      if (mediaUrls.length > 0 && user) {
        const bucket = "wa-flow-media";
        const prefix = supabase.storage.from(bucket).getPublicUrl("").data.publicUrl;
        const paths = mediaUrls.map((url) => url.replace(prefix, "")).filter(Boolean);
        if (paths.length > 0) {
          await supabase.storage.from(bucket).remove(paths);
        }
      }

      await supabase.from("wa_flow_edges").delete().eq("flow_id", id!);
      await supabase.from("wa_flow_nodes").delete().eq("flow_id", id!);
      await supabase.from("wa_automation_flows").delete().eq("id", id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-automation-flows"] });
      toast.success("Fluxo excluído");
      navigate("/fluxos");
    },
    onError: () => toast.error("Erro ao excluir fluxo"),
  });

  // Save flow
  // Derive entry node's API type from current nodes
  const entryApiType = useMemo(() => {
    const entryNode = nodes.find((n) => n.type === "entry");
    if (!entryNode) return "evolution";
    const cfg = (entryNode.data as any).config || {};
    return cfg.api_type || "evolution";
  }, [nodes]);

  const entryConfig = useMemo(() => {
    const entryNode = nodes.find((n) => n.type === "entry");
    if (!entryNode) return {};
    return (entryNode.data as any).config || {};
  }, [nodes]);

  // Auto-block buttons nodes when using Evolution API (only if a number is actually configured)
  useEffect(() => {
    const hasNumberConfigured = !!entryConfig.whatsapp_number_id;
    const isEvolution = entryApiType === "evolution";
    const shouldBlock = isEvolution && hasNumberConfigured;
    const buttonNodes = nodes.filter((n) => n.type === "buttons");
    if (buttonNodes.length === 0) return;

    let nodesChanged = false;
    const updatedNodes = nodes.map((n) => {
      if (n.type !== "buttons") return n;
      const cfg = (n.data as any).config || {};
      const currentlyBlocked = cfg._blocked_evolution === true;
      if (shouldBlock && !currentlyBlocked) {
        nodesChanged = true;
        return { ...n, data: { ...n.data, config: { ...cfg, _blocked_evolution: true } } };
      }
      if (!shouldBlock && currentlyBlocked) {
        nodesChanged = true;
        const { _blocked_evolution, ...rest } = cfg;
        return { ...n, data: { ...n.data, config: rest } };
      }
      return n;
    });

    if (nodesChanged) {
      setNodes(updatedNodes);
      setHasChanges(true);
    }

    if (shouldBlock) {
      const buttonIds = new Set(buttonNodes.map((n) => n.id));
      const newEdges = edges.filter((e) => !buttonIds.has(e.source) && !buttonIds.has(e.target));
      if (newEdges.length !== edges.length) {
        setEdges(newEdges);
        setHasChanges(true);
      }
    }
  }, [entryApiType, entryConfig.whatsapp_number_id, nodes.length]);

  const saveFlow = useMutation({
    mutationFn: async () => {
      // Extract entry node config for flow-level metadata
      const entryNode = nodes.find((n) => n.type === "entry");
      const entryCfg = entryNode ? (entryNode.data as any).config || {} : {};

      await supabase.from("wa_automation_flows").update({
        name: flowName,
        api_type: entryCfg.api_type || "evolution",
        whatsapp_number_id: entryCfg.whatsapp_number_id || null,
        waba_connection_id: entryCfg.waba_connection_id || null,
        phone_number_id: entryCfg.phone_number_id || null,
      } as any).eq("id", id!);

      await supabase.from("wa_flow_edges").delete().eq("flow_id", id!);
      await supabase.from("wa_flow_nodes").delete().eq("flow_id", id!);

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

      queryClient.invalidateQueries({ queryKey: ["wa-flow-nodes", id] });
      queryClient.invalidateQueries({ queryKey: ["wa-flow-edges", id] });
    },
    onSuccess: () => {
      toast.success("Fluxo salvo com sucesso!");
      setHasChanges(false);
    },
    onError: () => toast.error("Erro ao salvar fluxo"),
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveFlow.mutate(); }

      if (isInput) return;

      // Delete/Backspace to delete selected node
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode && !drawerOpen) {
        e.preventDefault();
        handleDeleteNode(selectedNode.id);
      }

      // Ctrl+C to copy
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && selectedNode) {
        e.preventDefault();
        setClipboard(JSON.parse(JSON.stringify(selectedNode)));
        toast.success("Bloco copiado");
      }

      // Ctrl+V to paste
      if ((e.metaKey || e.ctrlKey) && e.key === "v" && clipboard) {
        e.preventDefault();
        const newNode: Node = {
          ...clipboard,
          id: `temp-${Date.now()}`,
          position: { x: clipboard.position.x + 50, y: clipboard.position.y + 50 },
          selected: false,
        };
        const newNodes = [...nodes, newNode];
        setNodes(newNodes);
        pushHistory(newNodes, edges);
        setHasChanges(true);
        toast.success("Bloco colado");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, saveFlow, selectedNode, drawerOpen, clipboard, nodes, edges, handleDeleteNode, setNodes, pushHistory]);

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
      <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/fluxos")} className="h-9 w-9">
          <ArrowLeft size={18} />
        </Button>

        <Input
          value={flowName}
          onChange={(e) => { setFlowName(e.target.value); setHasChanges(true); }}
          className="max-w-[220px] h-9 text-sm font-medium bg-transparent border-transparent hover:border-border focus:border-border"
        />

        <div className="h-6 w-px bg-border mx-1" />

        {/* Undo/Redo */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={historyIndexRef.current <= 0} title="Desfazer (Ctrl+Z)">
          <Undo2 size={15} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={historyIndexRef.current >= historyRef.current.length - 1} title="Refazer (Ctrl+Y)">
          <Redo2 size={15} />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        <Button variant="outline" size="sm" onClick={openFlowTest} className="gap-1.5 rounded-full">
          <PlayCircle size={14} />
          Testar fluxo
        </Button>

        <div className="flex-1" />

        {/* Activate/Deactivate toggle */}
        <div className="flex items-center gap-2 mr-2">
          <span className={cn("text-xs font-medium", flow?.status === "active" ? "text-primary" : "text-muted-foreground")}>
            {flow?.status === "active" ? "Ativo" : "Inativo"}
          </span>
          <Switch
            checked={flow?.status === "active"}
            onCheckedChange={async (checked) => {
              const newStatus = checked ? "active" : "draft";
              const { error } = await supabase.from("wa_automation_flows").update({ status: newStatus }).eq("id", id!);
              if (error) { toast.error("Erro ao atualizar status"); return; }
              queryClient.invalidateQueries({ queryKey: ["wa-flow", id] });
              toast.success(checked ? "Fluxo ativado!" : "Fluxo desativado");
            }}
          />
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Delete flow */}
        <DeleteFlowDialog onConfirm={() => deleteFlow.mutate()} isPending={deleteFlow.isPending} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar toggle button - appears after sidebar closes */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={cn(
            "absolute top-2 left-2 z-20 w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted shadow-sm transition-all duration-200",
            sidebarOpen ? "opacity-0 pointer-events-none scale-90 delay-0" : "opacity-100 pointer-events-auto scale-100 delay-300"
          )}
          title="Abrir painel"
        >
          <PanelLeftOpen size={14} />
        </button>

        {/* Sidebar */}
        <div className={cn(
          "border-r border-border bg-card shrink-0 flex flex-col transition-all duration-300 ease-out overflow-hidden",
          sidebarOpen ? "w-[240px]" : "w-0 border-r-0"
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 min-w-[240px]">
            <div>
              <p className="text-sm font-bold text-foreground">Blocos</p>
              <p className="text-[10px] text-muted-foreground">Arraste ou clique para adicionar</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              title="Fechar painel"
            >
              <PanelLeftClose size={14} className="text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin min-w-[240px]">
            {sidebarCategories.map((cat) => {
              const isOpen = openCategories.has(cat.label);
              return (
                <div key={cat.label}>
                  <button
                    onClick={() => setOpenCategories(prev => {
                      const next = new Set(prev);
                      if (next.has(cat.label)) next.delete(cat.label);
                      else next.add(cat.label);
                      return next;
                    })}
                    className="w-full flex items-center gap-1.5 mb-2 px-1"
                  >
                    <ChevronDown size={12} className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isOpen ? "rotate-0" : "-rotate-90")} />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{cat.label}</p>
                  </button>
                  {isOpen && (
                    <div className="space-y-1.5">
                      {cat.items.map((item) => (
                        <div
                          key={item.type}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/wa-node-type", item.type);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => handleAddNode(item.type)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card transition-colors text-left group shadow-sm cursor-grab active:cursor-grabbing"
                        >
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", item.color.split(" ")[1])}>
                            {(item as any).iconImg ? (
                              <img src={(item as any).iconImg} alt={item.label} className="w-5 h-5 object-contain transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12" />
                            ) : (
                              <item.icon size={16} className={cn(item.color.split(" ")[0], "transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12")} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 relative"
          ref={reactFlowWrapper}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
          onDrop={(e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData("application/wa-node-type");
            if (!type || !reactFlowWrapper.current) return;
            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            // Use screenToFlowPosition if available via ref, otherwise fallback with viewport calc
            const rfInstance = (reactFlowWrapper.current as any).__rfInstance;
            let position: { x: number; y: number };
            if (rfInstance?.screenToFlowPosition) {
              position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            } else {
              position = { x: e.clientX - bounds.left - 100, y: e.clientY - bounds.top - 40 };
            }
            const nameMap: Record<string, string> = {
              entry: "Entrada", message: "Mensagem", buttons: "Botões",
              condition: "Condição", wait: "Espera", action: "Ação",
              handoff: "Humano", end: "Encerramento", ai_agent: "Agente IA",
              ab_test: "Teste A/B", random_split: "Random Split",
              data_collect: "Coleta de Dados",
              google_sheets: "Google Sheets", google_calendar: "Google Agenda", gmail: "Gmail",
            };
            const defaultConfigs: Record<string, any> = {
              ab_test: {
                variants: [
                  { id: "var_a", name: "Variante A", weight: 50 },
                  { id: "var_b", name: "Variante B", weight: 50 },
                ],
              },
              random_split: {
                outputs: [
                  { id: "out_0", name: "Saída 1" },
                  { id: "out_1", name: "Saída 2" },
                ],
              },
            };
            const newNode: Node = {
              id: `temp-${Date.now()}`,
              type,
              position,
              data: { label: nameMap[type] || type, config: defaultConfigs[type] || {} },
            };
            const newNodes = [...nodes, newNode];
            setNodes(newNodes);
            pushHistory(newNodes, edges);
            setHasChanges(true);
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              if (changes.some((c) => c.type === "position" && c.dragging === false)) {
                setTimeout(() => {
                  pushHistory(nodesRef.current, edgesRef.current);
                  setHasChanges(true);
                }, 0);
              }
            }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => { setSelectedNode(null); setSelectedNodeIds(new Set()); }}
            onEdgeClick={(_event, edge) => {
              setEdgeToDelete(edge.id);
            }}
            onInit={(instance) => {
              // Store instance on wrapper for screenToFlowPosition
              if (reactFlowWrapper.current) {
                (reactFlowWrapper.current as any).__rfInstance = instance;
              }
            }}
            deleteKeyCode={null}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            className="bg-background"
          >
            <Background color="hsl(var(--border) / 0.25)" gap={24} size={1} variant={"dots" as any} />
            <Background id="grid" color="hsl(var(--border) / 0.08)" gap={24} variant={"lines" as any} />
            <Controls className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground" />
          </ReactFlow>
        </div>

        {/* Config drawer - inside main area */}
        {selectedNode && (
          <WANodeConfigDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            node={selectedNode}
            onUpdate={handleUpdateNodeConfig}
            onDelete={handleDeleteNode}
            entryApiType={entryApiType}
            entryConfig={entryConfig}
            allNodes={nodes}
          />
        )}
      </div>

      <WAFlowTestDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        flowName={flowName}
        nodes={nodes}
        edges={edges}
        resetVersion={testResetVersion}
      />

      {/* Edge delete confirmation dialog */}
      <AlertDialog open={!!edgeToDelete} onOpenChange={(open) => { if (!open) setEdgeToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexão?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover esta conexão entre os blocos? Esta ação pode ser desfeita com Ctrl+Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (edgeToDelete) {
                  const newEdges = edges.filter((e) => e.id !== edgeToDelete);
                  setEdges(newEdges);
                  pushHistory(nodes, newEdges);
                  setHasChanges(true);
                  toast.success("Conexão removida");
                }
                setEdgeToDelete(null);
              }}
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
