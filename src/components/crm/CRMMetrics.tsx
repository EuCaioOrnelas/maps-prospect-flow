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
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const CRMMetrics = ({ leads, stages }: CRMMetricsProps) => {
  const totalLeads = leads.length;
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);

  // Find the "won" stage (by name pattern)
  const wonStage = stages.find(s => s.name.toLowerCase().includes('ganho') || s.name.toLowerCase().includes('fechado'));
  
  const wonLeads = wonStage 
    ? leads.filter(lead => lead.pipeline_stage_id === wonStage.id).length 
    : 0;

  const conversionRate = totalLeads > 0 
    ? Math.round((wonLeads / totalLeads) * 100) 
    : 0;

  const metrics: Metric[] = [
    {
      label: 'Total de Leads',
      value: totalLeads,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Taxa de Conversão',
      value: `${conversionRate}%`,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'Valor Total em Pipeline',
      value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
