import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

/**
 * Smart edge that routes around source/target nodes when the target is
 * positioned to the left or above the source (back-edges / loops).
 * Keeps the path clear of the cards so the flow direction is always visible.
 */
export function RoutedEdge(props: EdgeProps) {
  const {
    id,
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

  // Approx half-widths/heights of cards so we route around them, not through.
  const HORIZONTAL_CLEARANCE = 160;
  const VERTICAL_CLEARANCE = 60;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const isBackEdge = dx < -40 || dy < -120;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isBackEdge) {
    // Exit source going right, drop/rise around both cards, enter target from left.
    const rx = Math.max(sourceX, targetX) + HORIZONTAL_CLEARANCE;
    const lx = Math.min(sourceX, targetX) - HORIZONTAL_CLEARANCE;
    const midY =
      dy < 0
        ? Math.min(sourceY, targetY) - VERTICAL_CLEARANCE
        : Math.max(sourceY, targetY) + VERTICAL_CLEARANCE;

    const r = 12; // corner radius
    edgePath = [
      `M ${sourceX},${sourceY}`,
      `L ${rx - r},${sourceY}`,
      `Q ${rx},${sourceY} ${rx},${sourceY + (midY > sourceY ? r : -r)}`,
      `L ${rx},${midY - (midY > sourceY ? r : -r)}`,
      `Q ${rx},${midY} ${rx - r},${midY}`,
      `L ${lx + r},${midY}`,
      `Q ${lx},${midY} ${lx},${midY + (targetY > midY ? r : -r)}`,
      `L ${lx},${targetY - (targetY > midY ? r : -r)}`,
      `Q ${lx},${targetY} ${lx + r},${targetY}`,
      `L ${targetX},${targetY}`,
    ].join(" ");

    labelX = (lx + rx) / 2;
    labelY = midY;
  } else {
    const [path, lx, ly] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 10,
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
