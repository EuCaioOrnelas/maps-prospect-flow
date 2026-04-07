import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, Target, LucideIcon } from 'lucide-react';

interface CRMMetricsProps {
  leads: Lead[];
  stages: PipelineStage[];
}

interface Metric {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color: string;
}

export const CRMMetrics = ({ leads, stages }: CRMMetricsProps) => {
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
    },
    {
      label: 'Taxa de Conversão',
      value: conversionRate,
      subValue: `${wonLeads} contatos`,
      icon: Target,
      color: 'text-primary',
    },
    {
      label: 'Valor Total em Negociação',
      value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-border/50 relative overflow-hidden">
          <CardContent className="p-5">
            {/* Decorative circle behind the icon */}
            <div className="absolute -top-5 -right-5 w-[72px] h-[72px] rounded-full bg-primary/[0.07] dark:bg-primary/[0.12]" />
            {/* Icon on top-right */}
            <div className="absolute top-3 right-3">
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                {metric.label}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-[30px] font-bold leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {metric.label === 'Taxa de Conversão' ? `${metric.value}%` : metric.value}
                </p>
                {metric.subValue && (
                  <span className="text-[10px] text-muted-foreground">{metric.subValue}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
