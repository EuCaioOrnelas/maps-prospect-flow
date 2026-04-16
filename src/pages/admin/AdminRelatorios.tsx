import { FileText, Download, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reports = [
  { name: "Relatório Mensal de Receita", description: "MRR, churn, upgrades e downgrades", period: "Mensal" },
  { name: "Relatório de Ativação", description: "Funil de cadastro até pagamento", period: "Semanal" },
  { name: "Relatório de Uso", description: "Features mais usadas e engajamento", period: "Semanal" },
  { name: "Relatório de Churn", description: "Motivos de cancelamento e padrões", period: "Mensal" },
  { name: "Relatório de Growth", description: "Trials, conversão e campanhas", period: "Semanal" },
  { name: "Relatório Operacional", description: "APIs, erros e performance", period: "Diário" },
];

export default function AdminRelatorios() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Relatórios executivos e operacionais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.name} className="border-border/40 bg-card/80 backdrop-blur-sm hover:shadow-md transition-all group">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-foreground">{report.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground flex items-center gap-1">
                      <Calendar size={10} /> {report.period}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                <Download size={14} className="mr-1.5" /> Exportar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
