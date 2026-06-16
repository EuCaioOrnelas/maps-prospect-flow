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

  useImperativeHandle(ref, () => ({
    getState: () => ({ nodes, edges }),
  }), [nodes, edges]);

  // Debounced auto-save: persists changes silently so navigating away never loses work.
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

  const addNode = useCallback(
    (kind: string) => {
      const meta = EQUIPE_NODE_META[kind as EquipeNodeKind];
      if (!meta) return;
      const id = uid();
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "equipe",
          position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 400 },
          data: { kind, title: meta.label, summary: "" },
        },
      ]);
    },
    [setNodes],
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
    <div className="flex h-full w-full overflow-hidden">
      <NodePalette onAdd={addNode} />
      <div className="flex-1 relative">
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
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 1.5, stroke: "hsl(var(--primary) / 0.5)" },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="hsl(var(--border) / 0.4)" />
          <Controls className="!bg-card !border !rounded-lg" />
          <MiniMap pannable className="!bg-card !border !rounded-lg" />
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
