import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface Props {
  data: Array<{ plan: string; count: number }>;
}

const COLORS = ["hsl(var(--primary))", "hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(280 67% 60%)", "hsl(340 75% 55%)"];

export function PlanDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Sem dados ainda</div>;
  }
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="count"
            nameKey="plan"
            label={(e: any) => `${e.plan} (${e.count})`}
            labelLine={false}
            fontSize={11}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
