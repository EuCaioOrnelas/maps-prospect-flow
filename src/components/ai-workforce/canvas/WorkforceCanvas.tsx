import { useCallback, useMemo, useState } from "react";
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
import { WorkforceNode } from "./WorkforceNode";
import { NodePalette } from "./NodePalette";
import { NodeConfigDrawer } from "./NodeConfigDrawer";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { WORKFORCE_NODE_META, type WorkforceNodeKind } from "../nodeTypes";

const nodeTypes = { workforce: WorkforceNode };

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}

interface Props {
  initial: CanvasState;
  onSave: (state: CanvasState) => Promise<void> | void;
  saving?: boolean;
}

function uid() {
  return `n_${Math.random().toString(36).slice(2, 10)}`;
}

function CanvasInner({ initial, onSave, saving }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)),
    [setEdges]
  );

  const addNode = useCallback(
    (kind: string) => {
      const meta = WORKFORCE_NODE_META[kind as WorkforceNodeKind];
      if (!meta) return;
      const id = uid();
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "workforce",
          position: {
            x: 400 + Math.random() * 300,
            y: 100 + Math.random() * 400,
          },
          data: { kind, title: meta.label, summary: "" },
        },
      ]);
    },
    [setNodes]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId]
  );

  const patchNode = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
      );
    },
    [setNodes]
  );

  return (
    <div className="flex h-[calc(100vh-180px)] rounded-2xl border bg-card overflow-hidden">
      <NodePalette onAdd={addNode} />
      <div className="flex-1 relative">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            onClick={() => onSave({ nodes, edges })}
            disabled={saving}
            className="shadow-md"
          >
            {saving ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
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
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
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
        />
      </div>
    </div>
  );
}

export function WorkforceCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
