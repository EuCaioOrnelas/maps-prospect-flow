import { useState } from "react";
import { FileText, Download, RefreshCw, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useRevenueDashboardStats,
  useRevenueSettings,
  useRevenueBottlenecks,
  useRevenueMaturityIndex,
  useRevenueLeads,
} from "@/hooks/useRevenueData";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

interface ReportData {
  generatedAt: string;
  totalLeads: number;
  active7d: number;
  hotCount: number;
  atRiskCount: number;
  receitaEsperada: number;
  receitaEmRisco: number;
  maturityIndex: number;
  bottlenecks: {
    hotIgnoredPct: number;
    aboveSLAPct: number;
    avgFirstResponseMin: number;
    cooledLeads: number;
  };
  bucketCounts: Record<string, number>;
}

const RevenueReport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: stats } = useRevenueDashboardStats();
  const { data: settings } = useRevenueSettings();
  const { data: bottlenecks } = useRevenueBottlenecks();
  const { data: maturity } = useRevenueMaturityIndex();
  const { data: allLeads } = useRevenueLeads();

  const { data: savedReports, isLoading } = useQuery({
    queryKey: ["revenue-reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const generateReport = useMutation({
    mutationFn: async () => {
      if (!user || !stats) throw new Error("Dados insuficientes");

      const ticket = settings?.default_ticket_value || 3000;
      const rates = {
        COLD: settings?.default_close_rate_cold || 0.05,
        ENGAGED: settings?.default_close_rate_engaged || 0.15,
        HOT: settings?.default_close_rate_hot || 0.35,
        VERY_HOT: settings?.default_close_rate_very_hot || 0.55,
      };

      const receitaEsperada = Object.entries(stats.bucketCounts).reduce(
        (sum, [b, count]) => sum + count * ticket * (rates[b as keyof typeof rates] || 0), 0
      );

      const atRiskLeads = (allLeads || []).filter(
        (l) => (l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT") && l.risk_state !== "OK"
      );
      const receitaEmRisco = atRiskLeads.reduce((sum, l) => {
        const rate = rates[l.status_bucket as keyof typeof rates] || 0;
        return sum + (l.estimated_ticket_value || ticket) * rate;
      }, 0);

      const reportData: ReportData = {
        generatedAt: new Date().toISOString(),
        totalLeads: stats.totalLeads,
        active7d: stats.active7d,
        hotCount: stats.hotCount,
        atRiskCount: stats.atRiskCount,
        receitaEsperada,
        receitaEmRisco,
        maturityIndex: maturity?.total || 0,
        bottlenecks: {
          hotIgnoredPct: bottlenecks?.hotIgnoredPct || 0,
          aboveSLAPct: bottlenecks?.aboveSLAPct || 0,
          avgFirstResponseMin: bottlenecks?.avgFirstResponseMin || 0,
          cooledLeads: bottlenecks?.cooledLeads || 0,
        },
        bucketCounts: stats.bucketCounts,
      };

      const { error } = await supabase.from("revenue_reports").insert({
        user_id: user.id,
        report_data: reportData as any,
      } as any);
      if (error) throw error;

      return reportData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue-reports"] });
      toast.success("Relatório gerado com sucesso!");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const downloadPDF = (report: any) => {
    const data = report.report_data as ReportData;
    const doc = new jsPDF();
    const date = format(new Date(report.report_date), "dd/MM/yyyy", { locale: ptBR });

    doc.setFontSize(20);
    doc.text("Relatório Executivo - Wiize Revenue", 20, 25);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${date}`, 20, 35);

    doc.setFontSize(14);
    doc.text("KPIs Principais", 20, 50);
    doc.setFontSize(10);
    const kpis = [
      `Total de Leads: ${data.totalLeads}`,
      `Ativos (7d): ${data.active7d}`,
      `Engajados + Quentes: ${data.hotCount}`,
      `Em Risco: ${data.atRiskCount}`,
      `Receita Esperada: ${fmt(data.receitaEsperada)}`,
      `Receita em Risco: ${fmt(data.receitaEmRisco)}`,
      `Índice de Maturidade: ${data.maturityIndex}/100`,
    ];
    kpis.forEach((kpi, i) => doc.text(kpi, 25, 60 + i * 8));

    doc.setFontSize(14);
    doc.text("Distribuição por Nível", 20, 125);
    doc.setFontSize(10);
    const buckets = [
      `Frio: ${data.bucketCounts.COLD || 0}`,
      `Morno: ${data.bucketCounts.ENGAGED || 0}`,
      `Engajado: ${data.bucketCounts.HOT || 0}`,
      `Quente: ${data.bucketCounts.VERY_HOT || 0}`,
    ];
    buckets.forEach((b, i) => doc.text(b, 25, 135 + i * 8));

    doc.setFontSize(14);
    doc.text("Gargalos Detectados", 20, 175);
    doc.setFontSize(10);
    const gargalos = [
      `Quentes ignorados: ${data.bottlenecks.hotIgnoredPct}%`,
      `Acima do SLA: ${data.bottlenecks.aboveSLAPct}%`,
      `Tempo médio resposta: ${data.bottlenecks.avgFirstResponseMin} min`,
      `Leads esfriando: ${data.bottlenecks.cooledLeads}`,
    ];
    gargalos.forEach((g, i) => doc.text(g, 25, 185 + i * 8));

    doc.save(`relatorio-revenue-${date.replace(/\//g, "-")}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText size={24} /> Relatório Executivo
          </h1>
          <p className="text-sm text-muted-foreground">
            Gere relatórios consolidados com KPIs, gargalos e maturidade comercial
          </p>
        </div>
        <Button
          onClick={() => generateReport.mutate()}
          disabled={generateReport.isPending || !stats}
          className="gap-2"
        >
          {generateReport.isPending ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
          Gerar Relatório
        </Button>
      </div>

      {/* Reports list */}
      {(!savedReports || savedReports.length === 0) ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum relatório gerado ainda.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Gerar Relatório" para criar o primeiro.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedReports.map((report) => {
            const data = report.report_data as ReportData;
            return (
              <Card key={report.id} className="bg-card border-border/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Relatório {format(new Date(report.report_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{data.totalLeads} leads</Badge>
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">{data.hotCount} quentes</Badge>
                          <Badge variant="outline" className="text-[10px]">Maturidade: {data.maturityIndex}/100</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground mr-4">{fmt(data.receitaEsperada)}</p>
                      <Button variant="outline" size="sm" onClick={() => downloadPDF(report)} className="gap-1.5">
                        <Download size={14} /> PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RevenueReport;
