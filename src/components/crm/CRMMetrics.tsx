import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Target, CheckCircle } from 'lucide-react';

interface CRMMetricsProps {
  leads: Lead[];
  stages: PipelineStage[];
}

export const CRMMetrics = ({ leads, stages }: CRMMetricsProps) => {
  const totalLeads = leads.length;
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  
  // Only count leads where the user actually sent a message
  const leadsWithMessageSent = leads.filter(lead => lead.last_message_sent_at);
  
  // Only count as replied if user sent message AND lead responded
  const repliedLeads = leadsWithMessageSent.filter(lead => lead.last_response_at).length;
  
  const responseRate = leadsWithMessageSent.length > 0 
    ? Math.round((repliedLeads / leadsWithMessageSent.length) * 100) 
    : 0;

  // Find the "won" and "lost" stages (by name pattern)
  const wonStage = stages.find(s => s.name.toLowerCase().includes('ganho') || s.name.toLowerCase().includes('fechado'));
  const lostStage = stages.find(s => s.name.toLowerCase().includes('perdido'));
  
  const wonLeads = wonStage 
    ? leads.filter(lead => lead.pipeline_stage_id === wonStage.id).length 
    : 0;
  
  const lostLeads = lostStage 
    ? leads.filter(lead => lead.pipeline_stage_id === lostStage.id).length 
    : 0;

  const wonValue = wonStage 
    ? leads
        .filter(lead => lead.pipeline_stage_id === wonStage.id)
        .reduce((sum, lead) => sum + (lead.estimated_value || 0), 0)
    : 0;

  const conversionRate = totalLeads > 0 
    ? Math.round((wonLeads / totalLeads) * 100) 
    : 0;

  const metrics = [
    {
      label: 'Total de Leads',
      value: totalLeads,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Taxa de Resposta',
      value: `${responseRate}%`,
      subtitle: `${repliedLeads}/${leadsWithMessageSent.length} responderam`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Leads Ganhos',
      value: wonLeads,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                {'subtitle' in metric && metric.subtitle && (
                  <p className="text-[10px] text-muted-foreground/70">{metric.subtitle}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
