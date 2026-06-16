import { memo } from "react";
import { getBezierPath, useInternalNode, type EdgeProps } from "@xyflow/react";

/**
 * Floating edge: connects from the closest point on each node rect to the other.
 * Inspired by ReactFlow's "floating edges" example.
 */
function getNodeIntersection(intersectionNode: any, targetNode: any) {
  const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
  const targetPosition = targetNode.internals.positionAbsolute;
  const w = (intersectionNode.measured?.width ?? intersectionNode.width ?? 0) / 2;
  const h = (intersectionNode.measured?.height ?? intersectionNode.height ?? 0) / 2;
  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 =
    targetPosition.x + (targetNode.measured?.width ?? targetNode.width ?? 0) / 2;
  const y1 =
    targetPosition.y + (targetNode.measured?.height ?? targetNode.height ?? 0) / 2;
  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;
  return { x, y };
}

function getEdgePosition(node: any, point: { x: number; y: number }) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(point.x);
  const py = Math.round(point.y);
  const w = node.measured?.width ?? node.width ?? 0;
  const h = node.measured?.height ?? node.height ?? 0;
  if (px <= nx + 1) return "left";
  if (px >= nx + w - 1) return "right";
  if (py <= ny + 1) return "top";
  if (py >= ny + h - 1) return "bottom";
  return "top";
}

function getEdgeParams(source: any, target: any) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);
  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos: getEdgePosition(source, sourceIntersectionPoint),
    targetPos: getEdgePosition(target, targetIntersectionPoint),
  };
}

function FloatingEdgeInner({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;
  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
  const [path] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos as any,
    targetPosition: targetPos as any,
    targetX: tx,
    targetY: ty,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={path}
      markerEnd={markerEnd}
      style={style}
      fill="none"
    />
  );
}

export const FloatingEdge = memo(FloatingEdgeInner);
