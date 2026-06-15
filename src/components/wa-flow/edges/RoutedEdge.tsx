import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";

/**
 * Bezier edge (default wavy style). When the target is positioned such that
 * the natural bezier curve would cross back through the SOURCE node itself
 * (e.g. a condition's "false" branch returning to an earlier button on the
 * same card), we route the path around the source node so the line never
 * passes through its own card. Other cards may still be crossed normally.
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

  const { getNode } = useReactFlow();
  const sourceNode = getNode(source);

  const isSelfLoop = source === target;

  // Detect when the edge would loop back through its own source card.
  // Source handles are on the right; if the target handle is to the left of
  // (or above) the source handle, the bezier would cut through the source.
  const sourceBox = sourceNode
    ? {
        x: sourceNode.position.x,
        y: sourceNode.position.y,
        w: (sourceNode.measured?.width ?? sourceNode.width ?? 280) as number,
        h: (sourceNode.measured?.height ?? sourceNode.height ?? 120) as number,
      }
    : null;

  const crossesSource =
    !isSelfLoop &&
    sourceBox != null &&
    targetX < sourceBox.x + sourceBox.w - 8; // target handle is left of source card right edge

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isSelfLoop || crossesSource) {
    const OFFSET_X = 60;
    const OFFSET_Y = 40;
    const rightX = sourceBox
      ? Math.max(sourceX, sourceBox.x + sourceBox.w) + OFFSET_X
      : Math.max(sourceX, targetX) + OFFSET_X;
    const leftX = Math.min(sourceX, targetX) - OFFSET_X;
    const topY = sourceBox
      ? Math.min(sourceY, targetY, sourceBox.y) - OFFSET_Y
      : Math.min(sourceY, targetY) - OFFSET_Y;

    // exit source to the right, go up and over the source card, come down to target from the left
    edgePath = `M ${sourceX},${sourceY} C ${rightX},${sourceY} ${rightX},${topY} ${(rightX + leftX) / 2},${topY} C ${leftX},${topY} ${leftX},${targetY} ${targetX},${targetY}`;
    labelX = (rightX + leftX) / 2;
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
