import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
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
import { EquipeNode } from "./EquipeNode";
import { NodePalette } from "./NodePalette";
import { NodeConfigDrawer } from "./NodeConfigDrawer";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";

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

function uid() {
  return `n_${Math.random().toString(36).slice(2, 10)}`;
}

const CanvasInner = forwardRef<CanvasHandle, Props>(function CanvasInner({ initial, onAutoSave }, ref) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <NodePalette onAdd={addNode} />
      <div
        ref={wrapperRef}
        className="flex-1 relative"
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
