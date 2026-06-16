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
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { EquipeNode } from "./EquipeNode";
import { FloatingEdge } from "./FloatingEdge";
import { NodeConfigDrawer } from "./NodeConfigDrawer";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
import { cn } from "@/lib/utils";

const nodeTypes = { equipe: EquipeNode, workforce: EquipeNode };
const edgeTypes = { floating: FloatingEdge };

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}

export interface CanvasHandle {
  getState: () => CanvasState;
  addNodeByKind: (kind: EquipeNodeKind) => void;
}

interface Props {
  initial: CanvasState;
  workforceStatus?: "draft" | "active" | "inactive";
  onAutoSave?: (state: CanvasState) => void;
  onStateChange?: (state: CanvasState) => void;
}

const CATEGORIES: { label: string; kinds: EquipeNodeKind[] }[] = [
  { label: "Estratégia", kinds: ["goal", "rules", "decision"] },
  { label: "Contexto", kinds: ["memory", "knowledge", "crm_data"] },
  { label: "Interação", kinds: ["data_collection", "analysis"] },
  { label: "Execução", kinds: ["tools", "actions", "escalation"] },
];

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

// Required/optional flag for the sidebar pill.
const KIND_REQUIREMENT: Record<EquipeNodeKind, "required" | "recommended" | "optional"> = {
  core: "required",
  goal: "required",
  rules: "required",
  memory: "recommended",
  knowledge: "recommended",
  escalation: "recommended",
  tools: "recommended",
  decision: "optional",
  crm_data: "optional",
  data_collection: "optional",
  analysis: "optional",
  actions: "optional",
};

const REQ_BADGE: Record<"required" | "recommended" | "optional", { label: string; cls: string }> = {
  required:    { label: "Obrig.", cls: "text-rose-400" },
  recommended: { label: "Rec.",   cls: "text-amber-400" },
  optional:    { label: "Opc.",   cls: "text-muted-foreground" },
};

// Score weights — mirrored from WorkforceScorePanel.
const SCORING: { kind: EquipeNodeKind; weight: number }[] = [
  { kind: "goal", weight: 15 },
  { kind: "rules", weight: 15 },
  { kind: "knowledge", weight: 15 },
  { kind: "escalation", weight: 15 },
  { kind: "memory", weight: 15 },
  { kind: "tools", weight: 15 },
  { kind: "data_collection", weight: 10 },
];

function uid() {
  return `n_${Math.random().toString(36).slice(2, 10)}`;
}

const CanvasInner = forwardRef<CanvasHandle, Props>(function CanvasInner({ initial, workforceStatus = "draft", onAutoSave, onStateChange }, ref) {
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<Node>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.label)),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Block deletion of core.
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const filtered = changes.filter((c) => !(c.type === "remove" && c.id === "core"));
    onNodesChangeRaw(filtered);
  }, [onNodesChangeRaw]);

  useImperativeHandle(ref, () => ({
    getState: () => ({ nodes, edges }),
    addNodeByKind: (kind: EquipeNodeKind) => {
      const meta = EQUIPE_NODE_META[kind];
      if (!meta) return;
      const newId = uid();
      setNodes((nds) => {
        if (nds.some((n) => (n.data as { kind?: string })?.kind === kind)) return nds;
        return [...nds, {
          id: newId, type: "equipe",
          position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 400 },
          data: { kind, title: meta.label, summary: "" },
        }];
      });
      setEdges((eds) => {
        if (eds.some((e) => e.target === newId)) return eds;
        return [...eds, { id: `e_core_${newId}`, source: "core", target: newId, type: "floating", animated: true } as Edge];
      });
    },
  }), [nodes, edges, setNodes, setEdges]);

  // Always render core data as-is (no live score injection).
  const displayNodes = nodes;
  const displayEdges = useMemo(
    () => edges.map((e) => ({ ...e, type: "floating", animated: true })),
    [edges],
  );

  useEffect(() => { onStateChange?.({ nodes, edges }); }, [nodes, edges, onStateChange]);

  const autoSaveRef = useRef(onAutoSave);
  useEffect(() => { autoSaveRef.current = onAutoSave; }, [onAutoSave]);

  const firstRun = useRef(true);
  useEffect(() => {
    if (!autoSaveRef.current) return;
    if (firstRun.current) { firstRun.current = false; return; }
    const t = setTimeout(() => autoSaveRef.current?.({ nodes, edges }), 800);
    return () => clearTimeout(t);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, type: "floating", animated: true }, eds)),
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
    if (id === "core") return;
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

  // Filtered categories by search.
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES
      .map((c) => ({
        ...c,
        kinds: c.kinds.filter((k) => {
          const meta = EQUIPE_NODE_META[k];
          return (
            meta.label.toLowerCase().includes(q) ||
            meta.description.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((c) => c.kinds.length > 0);
  }, [search]);

  return (
    <div className="flex-1 flex overflow-hidden relative h-full w-full">
      <button
        onClick={() => setSidebarOpen(true)}
        className={cn(
          "absolute top-2 left-2 z-20 w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted shadow-sm transition-all duration-200",
          sidebarOpen ? "opacity-0 pointer-events-none scale-90 delay-0" : "opacity-100 pointer-events-auto scale-100 delay-300",
        )}
        title="Abrir biblioteca"
      >
        <PanelLeftOpen size={14} />
      </button>

      {/* Sidebar — Biblioteca de Módulos */}
      <div className={cn(
        "border-r border-border bg-card shrink-0 flex flex-col transition-all duration-300 ease-out overflow-hidden",
        sidebarOpen ? "w-[260px]" : "w-0 border-r-0",
      )}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 min-w-[260px]">
          <div>
            <p className="text-sm font-bold text-foreground">Biblioteca</p>
            <p className="text-[10px] text-muted-foreground">Módulos do colaborador</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            title="Fechar"
          >
            <PanelLeftClose size={14} className="text-muted-foreground" />
          </button>
        </div>
        <div className="px-3 pt-3 pb-2 min-w-[260px]">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar módulo..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pt-1 space-y-4 scrollbar-thin min-w-[260px]">
          {filteredCategories.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-6">Nenhum módulo encontrado</p>
          ) : filteredCategories.map((cat) => {
            const isOpen = openCats.has(cat.label) || !!search;
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
                  <div className="space-y-1">
                    {cat.kinds.map((kind) => {
                      const meta = EQUIPE_NODE_META[kind];
                      const Icon = meta.icon;
                      const accent = KIND_PALETTE_ACCENT[kind] ?? KIND_PALETTE_ACCENT.core;
                      const req = KIND_REQUIREMENT[kind];
                      const reqBadge = REQ_BADGE[req];
                      return (
                        <div
                          key={kind}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/equipe-node-kind", kind);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => addNode(kind)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-transparent transition-all hover:border-border hover:bg-muted/60 cursor-grab active:cursor-grabbing group"
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", accent.bg)}>
                            <Icon size={14} className={accent.text} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                                {meta.label}
                              </p>
                              <span className={cn("text-[9px] font-bold uppercase tracking-wide shrink-0", reqBadge.cls)}>
                                {reqBadge.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1 mt-0.5">
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

      {/* Canvas surface */}
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
        {/* Center radial glow + subtle gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, hsl(var(--primary) / 0.10) 0%, transparent 45%), linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--muted) / 0.25) 100%)",
          }}
          aria-hidden
        />
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange as (c: NodeChange[]) => void}
          onEdgesChange={onEdgesChange as (c: EdgeChange[]) => void}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            type: "floating",
            animated: true,
            style: { strokeWidth: 1.5, stroke: "hsl(var(--muted-foreground) / 0.5)", strokeLinecap: "round" },
          }}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background color="hsl(var(--border) / 0.3)" gap={24} size={1} variant={"dots" as any} />
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
