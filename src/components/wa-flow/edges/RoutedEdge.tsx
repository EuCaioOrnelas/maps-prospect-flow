import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

/**
 * Bezier edge (default wavy style). Only self-loops (source === target)
 * are routed around the card so the line never passes through itself.
 */
export function RoutedEdge(props: EdgeProps) {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    markerEnd,
    style,
    selected,
  } = props;

  const isSelfLoop = source === target;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isSelfLoop) {
    // Route around the card: exit right, loop above, enter left.
    const OFFSET_X = 80;
    const OFFSET_Y = 60;
    const rx = Math.max(sourceX, targetX) + OFFSET_X;
    const lx = Math.min(sourceX, targetX) - OFFSET_X;
    const topY = Math.min(sourceY, targetY) - OFFSET_Y;
    edgePath = `M ${sourceX},${sourceY} C ${rx},${sourceY} ${rx},${topY} ${(rx + lx) / 2},${topY} C ${lx},${topY} ${lx},${targetY} ${targetX},${targetY}`;
    labelX = (rx + lx) / 2;
    labelY = topY;
  } else {
    const [path, lx, ly] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className={`px-2 py-0.5 rounded-md bg-card border text-[11px] font-medium text-foreground shadow-sm whitespace-nowrap ${
              selected ? "border-primary" : "border-border"
            }`}
          >
            {label as React.ReactNode}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
