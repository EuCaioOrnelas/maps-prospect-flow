interface FlowFunnelProps {
  total: number;
  active: number;
  completed: number;
  abandoned: number;
}

const stages = [
  { key: "total", label: "Entradas", color: "#6b7280" },
  { key: "active", label: "Em andamento", color: "#3b82f6" },
  { key: "completed", label: "Concluídos", color: "#10b981" },
  { key: "abandoned", label: "Abandonaram", color: "#f59e0b" },
] as const;

export function FlowFunnel({ total, active, completed, abandoned }: FlowFunnelProps) {
  const values: Record<string, number> = { total, active, completed, abandoned };
  const max = Math.max(total, 1);

  return (
    <div className="relative w-full" style={{ height: 120 }}>
      <svg
        viewBox="0 0 1000 120"
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ display: "block" }}
      >
        <defs>
          {stages.map((s, i) => {
            const nextColor = stages[i + 1]?.color || s.color;
            return (
              <linearGradient key={s.key} id={`fg-${s.key}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={s.color} />
                <stop offset="100%" stopColor={nextColor} />
              </linearGradient>
            );
          })}
        </defs>

        {stages.map((stage, i) => {
          const count = values[stage.key];
          const pct = count / max;
          const nextPct = stages[i + 1] ? values[stages[i + 1].key] / max : 0;

          const segCount = stages.length;
          const gap = 4;
          const segW = (1000 - gap * (segCount - 1)) / segCount;
          const x = i * (segW + gap);

          const cy = 60;
          const leftH = pct * 110;
          const rightH = (stages[i + 1] ? nextPct : pct * 0.85) * 110;

          const topL = cy - leftH / 2;
          const botL = cy + leftH / 2;
          const topR = cy - rightH / 2;
          const botR = cy + rightH / 2;

          return (
            <g key={stage.key}>
              <polygon
                points={`${x},${topL} ${x + segW},${topR} ${x + segW},${botR} ${x},${botL}`}
                fill={`url(#fg-${stage.key})`}
                opacity={0.85}
              />
              {/* Divider line */}
              {i < segCount - 1 && (
                <line
                  x1={x + segW + gap / 2}
                  y1={Math.min(topL, topR) - 2}
                  x2={x + segW + gap / 2}
                  y2={Math.max(botL, botR) + 2}
                  stroke={stages[i + 1].color}
                  strokeWidth={2}
                  opacity={0.6}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Labels overlay */}
      <div className="absolute inset-0 flex">
        {stages.map((stage) => {
          const count = values[stage.key];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={stage.key} className="flex-1 flex items-center justify-center">
              <div className="text-center pointer-events-none select-none">
                <p className="text-xs font-semibold text-foreground drop-shadow-sm">
                  {stage.label}{" "}
                  <span className="font-bold">{count}</span>
                  <span className="text-muted-foreground ml-1 text-[10px]">({pct}%)</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
