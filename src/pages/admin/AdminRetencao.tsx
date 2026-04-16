import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminRetencao() {
  // Placeholder cohort data
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai"];
  const cohortData = [
    [100, 72, 58, 45, 38],
    [100, 68, 52, 41, null],
    [100, 75, 60, null, null],
    [100, 70, null, null, null],
    [100, null, null, null, null],
  ];

  const getColor = (value: number | null) => {
    if (value === null) return "bg-muted/20";
    if (value >= 70) return "bg-emerald-500/20 text-emerald-600";
    if (value >= 50) return "bg-amber-500/20 text-amber-600";
    return "bg-red-500/20 text-red-600";
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Retenção</h1>
        <p className="text-sm text-muted-foreground mt-1">Cohort analysis e métricas de retenção</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retenção D7</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retenção D30</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DAU</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">MAU</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Cohort Retention Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Cohort</th>
                  {["M0", "M1", "M2", "M3", "M4"].map(m => (
                    <th key={m} className="p-2 text-xs text-muted-foreground font-medium text-center">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((month, i) => (
                  <tr key={month}>
                    <td className="p-2 text-xs font-medium text-foreground">{month}</td>
                    {cohortData[i].map((val, j) => (
                      <td key={j} className="p-1">
                        <div className={`rounded-lg p-2 text-center text-xs font-semibold ${getColor(val)}`}>
                          {val !== null ? `${val}%` : "—"}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
