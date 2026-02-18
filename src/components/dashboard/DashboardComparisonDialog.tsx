import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PeriodData {
  leads: number;
  messages: number;
  responses: number;
}

function DatePicker({ date, onSelect, label }: { date: Date | undefined; onSelect: (d: Date | undefined) => void; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-8", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-1.5 h-3 w-3" />
            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MetricRow({ label, valueA, valueB }: { label: string; valueA: number; valueB: number }) {
  const change = valueA > 0 ? ((valueB - valueA) / valueA) * 100 : valueB > 0 ? 100 : 0;
  const isPositive = change > 0;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground">{valueA.toLocaleString('pt-BR')}</span>
        <ArrowRight size={12} className="text-muted-foreground/50" />
        <span className="text-sm font-semibold text-foreground">{valueB.toLocaleString('pt-BR')}</span>
        {change !== 0 && (
          <div className={cn(
            "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardComparisonDialog({ open, onOpenChange }: DashboardComparisonDialogProps) {
  const { user } = useAuth();
  const [periodAStart, setPeriodAStart] = useState<Date | undefined>(subDays(new Date(), 60));
  const [periodAEnd, setPeriodAEnd] = useState<Date | undefined>(subDays(new Date(), 31));
  const [periodBStart, setPeriodBStart] = useState<Date | undefined>(subDays(new Date(), 30));
  const [periodBEnd, setPeriodBEnd] = useState<Date | undefined>(new Date());
  const [dataA, setDataA] = useState<PeriodData | null>(null);
  const [dataB, setDataB] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPeriodData = async (start: Date, end: Date): Promise<PeriodData> => {
    if (!user) return { leads: 0, messages: 0, responses: 0 };

    const [searchRes, campaignRes, responsesRes] = await Promise.all([
      supabase.from('search_history').select('results_count')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      supabase.from('whatsapp_campaigns').select('sent_count')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      supabase.from('campaign_responses').select('id')
        .eq('user_id', user.id)
        .gte('responded_at', start.toISOString())
        .lte('responded_at', end.toISOString()),
    ]);

    return {
      leads: (searchRes.data || []).reduce((s, r) => s + (r.results_count || 0), 0),
      messages: (campaignRes.data || []).reduce((s, c) => s + (c.sent_count || 0), 0),
      responses: (responsesRes.data || []).length,
    };
  };

  const handleCompare = async () => {
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return;
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetchPeriodData(periodAStart, periodAEnd),
        fetchPeriodData(periodBStart, periodBEnd),
      ]);
      setDataA(a);
      setDataB(b);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Comparar Períodos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period A */}
          <Card className="border-border/40">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-semibold text-primary mb-2">Período A</p>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker date={periodAStart} onSelect={setPeriodAStart} label="Início" />
                <DatePicker date={periodAEnd} onSelect={setPeriodAEnd} label="Fim" />
              </div>
            </CardContent>
          </Card>

          {/* Period B */}
          <Card className="border-border/40">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-semibold text-amber-400 mb-2">Período B</p>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker date={periodBStart} onSelect={setPeriodBStart} label="Início" />
                <DatePicker date={periodBEnd} onSelect={setPeriodBEnd} label="Fim" />
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleCompare}
            disabled={loading || !periodAStart || !periodAEnd || !periodBStart || !periodBEnd}
            className="w-full"
            size="sm"
          >
            {loading ? 'Comparando...' : 'Comparar'}
          </Button>

          {/* Results */}
          {dataA && dataB && (
            <Card className="border-border/40">
              <CardContent className="py-4 px-4 space-y-0">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Métrica</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-primary font-semibold uppercase">A</span>
                    <span className="w-3" />
                    <span className="text-[10px] text-amber-400 font-semibold uppercase">B</span>
                    <span className="text-[10px] text-muted-foreground/50 w-14" />
                  </div>
                </div>
                <MetricRow label="Leads Prospectados" valueA={dataA.leads} valueB={dataB.leads} />
                <MetricRow label="Mensagens Enviadas" valueA={dataA.messages} valueB={dataB.messages} />
                <MetricRow label="Respostas Recebidas" valueA={dataA.responses} valueB={dataB.responses} />
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
