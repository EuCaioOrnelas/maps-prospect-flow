import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, Handshake, LucideIcon } from 'lucide-react';
import { MetricSlot } from '@/components/ui/metric-empty';

interface CRMMetricsProps {
  leads: Lead[];
  stages: PipelineStage[];
  hideValue?: boolean;
  loading?: boolean;
}

interface Metric {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color: string;
  empty?: boolean;
  emptyHint?: string;
}

export const CRMMetrics = ({ leads, stages, hideValue = false, loading = false }: CRMMetricsProps) => {
  const leadsInPipeline = leads.filter(lead => lead.pipeline_stage_id != null);
  const totalLeads = leadsInPipeline.length;
  
  const lostStage = stages.find(s => 
    s.name.toLowerCase().includes('perdido') || 
    s.name.toLowerCase().includes('lost')
  );

  const wonStage = stages.find(s => 
    s.name.toLowerCase().includes('ganho') || 
    s.name.toLowerCase().includes('fechado') ||
    s.name.toLowerCase().includes('won') ||
    s.name.toLowerCase().includes('closed')
  );

  const isClosed = (lead: Lead) =>
    (wonStage && lead.pipeline_stage_id === wonStage.id) ||
    (lostStage && lead.pipeline_stage_id === lostStage.id);

  // Negociações em andamento: contatos com valor cadastrado que ainda não fecharam
  const negotiatingLeads = leadsInPipeline.filter(
    (lead) => Number(lead.estimated_value || 0) > 0 && !isClosed(lead)
  );
  const negotiationsCount = negotiatingLeads.length;

  const totalValue = negotiatingLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0
  );

  const metrics: Metric[] = [
    {
      label: 'Total de Contatos',
      value: totalLeads,
      icon: Users,
      color: 'text-primary',
      empty: totalLeads === 0,
      emptyHint: 'Preenchido ao adicionar contatos no pipeline.',
    },
    {
      label: 'Negociações',
      value: negotiationsCount,
      subValue: negotiationsCount === 1 ? 'em andamento' : 'em andamento',
      icon: Handshake,
      color: 'text-primary',
      empty: negotiationsCount === 0,
      emptyHint: 'Contatos com valor cadastrado e venda ainda não fechada.',
    },
    ...(hideValue ? [] : [{
      label: 'Valor Total em Negociação',
      value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-primary',
      empty: totalValue === 0,
      emptyHint: 'Será preenchido ao informar valores nos contatos.',
    } as Metric]),
  ];


  return (
    <div className={`grid grid-cols-1 ${hideValue ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4 mt-4`}>
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="border-border/50 relative overflow-hidden"
          title={metric.empty ? metric.emptyHint : undefined}
        >
          {/* Green glow */}
          {!metric.empty && !loading && (
            <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] blur-2xl pointer-events-none" />
          )}
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${metric.empty || loading ? 'bg-muted/50' : 'bg-primary/[0.07] dark:bg-primary/[0.12]'}`}>
                <metric.icon className={`w-[15px] h-[15px] ${metric.empty || loading ? 'text-muted-foreground/40' : metric.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-none truncate">
                  {metric.label}
                </p>
                <MetricSlot
                  cacheKey={`crm:${metric.label}`}
                  loading={loading}
                  empty={metric.empty}
                  size="sm"
                  className="min-h-[26px] mt-1.5"
                >
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-[22px] font-bold leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {metric.value}
                    </p>
                    {metric.subValue && (
                      <span className="text-[10px] text-muted-foreground">{metric.subValue}</span>
                    )}
                  </div>
                </MetricSlot>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

    </div>
  );
};
