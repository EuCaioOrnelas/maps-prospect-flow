interface FlowFunnelProps {
  total: number;
  active: number;
  completed: number;
}

const stages = [
  { key: "total", label: "Entradas", colorStart: "#6366f1", colorEnd: "#818cf8" },
  { key: "active", label: "Em andamento", colorStart: "#3b82f6", colorEnd: "#60a5fa" },
  { key: "completed", label: "Concluídos", colorStart: "#10b981", colorEnd: "#34d399" },
] as const;

export function FlowFunnel({ total, active, completed }: FlowFunnelProps) {
  const values: Record<string, number> = { total, active, completed };
  const max = Math.max(total, 1);

  return (
    <div className="relative w-full" style={{ height: 100 }}>
      <svg
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ display: "block" }}
      >
        <defs>
          {stages.map((s) => (
            <linearGradient key={s.key} id={`fg-${s.key}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={s.colorStart} />
              <stop offset="100%" stopColor={s.colorEnd} />
            </linearGradient>
          ))}
        </defs>

        {stages.map((stage, i) => {
          const count = values[stage.key];
          const pct = count / max;
          const nextPct = stages[i + 1] ? values[stages[i + 1].key] / max : pct * 0.7;

          const segCount = stages.length;
          const gap = 3;
          const segW = (1000 - gap * (segCount - 1)) / segCount;
          const x = i * (segW + gap);

          const cy = 50;
          const leftH = Math.max(pct * 90, 8);
          const rightH = Math.max(nextPct * 90, 6);

          const topL = cy - leftH / 2;
          const botL = cy + leftH / 2;
          const topR = cy - rightH / 2;
          const botR = cy + rightH / 2;

          return (
            <g key={stage.key}>
              <polygon
                points={`${x},${topL} ${x + segW},${topR} ${x + segW},${botR} ${x},${botL}`}
                fill={`url(#fg-${stage.key})`}
                opacity={0.9}
                rx={4}
              />
              {i < segCount - 1 && (
                <line
                  x1={x + segW + gap / 2}
                  y1={Math.min(topL, topR) - 1}
                  x2={x + segW + gap / 2}
                  y2={Math.max(botL, botR) + 1}
                  stroke={stages[i + 1].colorStart}
                  strokeWidth={1.5}
                  opacity={0.4}
                />
              )}
            </g>
          );
        })}
      </svg>

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
