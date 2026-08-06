import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, Target, LucideIcon } from 'lucide-react';
import { MetricEmpty } from '@/components/ui/metric-empty';

interface CRMMetricsProps {
  leads: Lead[];
  stages: PipelineStage[];
  hideValue?: boolean;
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

export const CRMMetrics = ({ leads, stages, hideValue = false }: CRMMetricsProps) => {
  const leadsInPipeline = leads.filter(lead => lead.pipeline_stage_id != null);
  const totalLeads = leadsInPipeline.length;
  
  const lostStage = stages.find(s => 
    s.name.toLowerCase().includes('perdido') || 
    s.name.toLowerCase().includes('lost')
  );

  const totalValue = leadsInPipeline
    .filter(lead => !lostStage || lead.pipeline_stage_id !== lostStage.id)
    .reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);

  const wonStage = stages.find(s => 
    s.name.toLowerCase().includes('ganho') || 
    s.name.toLowerCase().includes('fechado') ||
    s.name.toLowerCase().includes('won') ||
    s.name.toLowerCase().includes('closed')
  );
  
  const wonLeads = wonStage 
    ? leadsInPipeline.filter(lead => lead.pipeline_stage_id === wonStage.id).length 
    : 0;

  const conversionRate = totalLeads > 0 
    ? Math.round((wonLeads / totalLeads) * 10000) / 100
    : 0;

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
      label: 'Taxa de Conversão',
      value: conversionRate,
      subValue: `${wonLeads} contatos`,
      icon: Target,
      color: 'text-primary',
      empty: totalLeads === 0,
      emptyHint: 'Disponível após o primeiro negócio ganho.',
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
        <Card key={metric.label} className="border-border/50 relative overflow-hidden">
          {/* Green glow */}
          {!metric.empty && (
            <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] blur-3xl pointer-events-none" />
          )}
          <CardContent className="p-5 relative">
            <div className="flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metric.empty ? 'bg-muted/50' : 'bg-primary/[0.07] dark:bg-primary/[0.12]'}`}>
                <metric.icon className={`w-[17px] h-[17px] ${metric.empty ? 'text-muted-foreground/40' : metric.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  {metric.label}
                </p>
                {metric.empty ? (
                  <MetricEmpty hint={metric.emptyHint} className="min-h-[46px]" />
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-[30px] font-bold leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {metric.label === 'Taxa de Conversão' ? `${metric.value}%` : metric.value}
                    </p>
                    {metric.subValue && (
                      <span className="text-[10px] text-muted-foreground">{metric.subValue}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

    </div>
  );
};
