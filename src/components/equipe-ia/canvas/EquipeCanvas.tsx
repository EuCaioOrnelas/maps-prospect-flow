import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { EquipeNode } from "./EquipeNode";
import { NodeConfigDrawer } from "./NodeConfigDrawer";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
import { cn } from "@/lib/utils";

const nodeTypes = { equipe: EquipeNode, workforce: EquipeNode };

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}

export interface CanvasHandle {
  getState: () => CanvasState;
}

interface Props {
  initial: CanvasState;
  onAutoSave?: (state: CanvasState) => void;
}

const CATEGORIES: { label: string; kinds: EquipeNodeKind[] }[] = [
  { label: "Estratégia", kinds: ["goal", "rules", "decision"] },
  { label: "Contexto", kinds: ["memory", "knowledge", "crm_data"] },
  { label: "Interação", kinds: ["data_collection", "analysis"] },
  { label: "Execução", kinds: ["tools", "actions", "escalation"] },
];

export const KIND_ICON_BG: Record<EquipeNodeKind, string> = {
  core:            "bg-primary",
  goal:            "bg-emerald-500",
  rules:           "bg-rose-500",
  decision:        "bg-fuchsia-500",
  memory:          "bg-violet-500",
  knowledge:       "bg-amber-500",
  crm_data:        "bg-sky-500",
  data_collection: "bg-cyan-500",
  analysis:        "bg-teal-500",
  tools:           "bg-indigo-500",
  actions:         "bg-orange-500",
  escalation:      "bg-yellow-500",
};

// Sidebar palette accent — mirrors the flow editor (soft tinted chip + colored label).
const KIND_PALETTE_ACCENT: Record<EquipeNodeKind, { text: string; bg: string }> = {
  core:            { text: "text-primary",     bg: "bg-primary/10" },
  goal:            { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  rules:           { text: "text-rose-400",    bg: "bg-rose-500/10" },
  decision:        { text: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
  memory:          { text: "text-violet-400",  bg: "bg-violet-500/10" },
  knowledge:       { text: "text-amber-400",   bg: "bg-amber-500/10" },
  crm_data:        { text: "text-sky-400",     bg: "bg-sky-500/10" },
  data_collection: { text: "text-cyan-400",    bg: "bg-cyan-500/10" },
  analysis:        { text: "text-teal-400",    bg: "bg-teal-500/10" },
  tools:           { text: "text-indigo-400",  bg: "bg-indigo-500/10" },
  actions:         { text: "text-orange-400",  bg: "bg-orange-500/10" },
  escalation:      { text: "text-yellow-400",  bg: "bg-yellow-500/10" },
};

function uid() {
  return `n_${Math.random().toString(36).slice(2, 10)}`;
}

const CanvasInner = forwardRef<CanvasHandle, Props>(function CanvasInner({ initial, onAutoSave }, ref) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openCats, setOpenCats] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.label)),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  useImperativeHandle(ref, () => ({
    getState: () => ({ nodes, edges }),
  }), [nodes, edges]);

  const firstRun = useRef(true);
  useEffect(() => {
    if (!onAutoSave) return;
    if (firstRun.current) { firstRun.current = false; return; }
    const t = setTimeout(() => onAutoSave({ nodes, edges }), 800);
    return () => clearTimeout(t);
  }, [nodes, edges, onAutoSave]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)),
    [setEdges],
  );

  const createNode = useCallback(
    (kind: string, position: { x: number; y: number }) => {
      const meta = EQUIPE_NODE_META[kind as EquipeNodeKind];
      if (!meta) return;
      setNodes((nds) => [
        ...nds,
        {
          id: uid(),
          type: "equipe",
          position,
          data: { kind, title: meta.label, summary: "" },
        },
      ]);
    },
    [setNodes],
  );

  const addNode = useCallback(
    (kind: string) => createNode(kind, { x: 200 + Math.random() * 400, y: 100 + Math.random() * 400 }),
    [createNode],
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const patchNode = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }, [setNodes, setEdges]);

  const toggleCat = (label: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  return (
    <div className="flex-1 flex overflow-hidden relative h-full w-full">
      {/* Sidebar toggle button - appears after sidebar closes */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={cn(
          "absolute top-2 left-2 z-20 w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted shadow-sm transition-all duration-200",
          sidebarOpen ? "opacity-0 pointer-events-none scale-90 delay-0" : "opacity-100 pointer-events-auto scale-100 delay-300",
        )}
        title="Abrir painel"
      >
        <PanelLeftOpen size={14} />
      </button>

      {/* Sidebar */}
      <div className={cn(
        "border-r border-border bg-card shrink-0 flex flex-col transition-all duration-300 ease-out overflow-hidden",
        sidebarOpen ? "w-[240px]" : "w-0 border-r-0",
      )}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 min-w-[240px]">
          <div>
            <p className="text-sm font-bold text-foreground">Cards</p>
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
          {CATEGORIES.map((cat) => {
            const isOpen = openCats.has(cat.label);
            return (
              <div key={cat.label}>
                <button
                  onClick={() => toggleCat(cat.label)}
                  className="w-full flex items-center gap-1.5 mb-2 px-1"
                >
                  <ChevronDown
                    size={12}
                    className={cn(
                      "text-muted-foreground transition-transform duration-200 shrink-0",
                      isOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {cat.label}
                  </p>
                </button>
                {isOpen && (
                  <div className="space-y-1.5">
                    {cat.kinds.map((kind) => {
                      const meta = EQUIPE_NODE_META[kind];
                      const Icon = meta.icon;
                      const iconBg = KIND_ICON_BG[kind] ?? "bg-muted";
                      return (
                        <div
                          key={kind}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/equipe-node-kind", kind);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => addNode(kind)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card transition-all duration-200 text-left shadow-sm cursor-grab active:cursor-grabbing hover:border-foreground/30 hover:shadow-md"
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-white",
                            iconBg,
                          )}>
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{meta.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                              {meta.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={wrapperRef}
        className="flex-1 relative overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={(e) => {
          e.preventDefault();
          const kind = e.dataTransfer.getData("application/equipe-node-kind");
          if (!kind) return;
          const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          createNode(kind, position);
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange as (c: NodeChange[]) => void}
          onEdgesChange={onEdgesChange as (c: EdgeChange[]) => void}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2, stroke: "hsl(var(--muted-foreground) / 0.45)", strokeLinecap: "round" },
          }}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Background color="hsl(var(--border) / 0.25)" gap={24} size={1} variant={"dots" as any} />
          <Background id="grid" color="hsl(var(--border) / 0.08)" gap={24} variant={"lines" as any} />
          <Controls className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground" />
        </ReactFlow>
        <NodeConfigDrawer
          node={
            selectedNode
              ? { id: selectedNode.id, data: selectedNode.data as never }
              : null
          }
          onClose={() => setSelectedId(null)}
          onChange={patchNode}
          onDelete={deleteNode}
        />
      </div>
    </div>
  );
});


export const EquipeCanvas = forwardRef<CanvasHandle, Props>(function EquipeCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <CanvasInner ref={ref} {...props} />
    </ReactFlowProvider>
  );
});
