import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { type Lead, WHATSAPP_STATUS_LABELS } from '@/hooks/useCRM';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useUserScoreTracking } from '@/hooks/useUserScoreTracking';

interface ExportLeadsButtonProps {
  leads: Lead[];
  stages: { id: string; name: string }[];
}

export const ExportLeadsButton = ({ leads, stages }: ExportLeadsButtonProps) => {
  const [exporting, setExporting] = useState(false);
  const { trackScoreEvent } = useUserScoreTracking();

  const handleExport = () => {
    if (leads.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }

    setExporting(true);

    try {
      const stagesMap = new Map(stages.map(s => [s.id, s.name]));
      
      const data = leads.map(lead => ({
        'Nome': lead.contact_name || '',
        'Empresa': lead.company_name || '',
        'Telefone': lead.phone,
        'Categoria': lead.category || '',
        'Cidade': lead.city || '',
        'Região': lead.region || '',
        'Website': lead.website || '',
        'Origem': lead.origin || '',
        'Etapa': stagesMap.get(lead.pipeline_stage_id || '') || '',
        'Status WhatsApp': WHATSAPP_STATUS_LABELS[lead.whatsapp_status] || '',
        'Valor em Negociação': lead.estimated_value || 0,
        'Pontuação IA': lead.ai_score || 0,
        'Última Resposta': lead.last_response_at 
          ? new Date(lead.last_response_at).toLocaleDateString('pt-BR') 
          : '',
        'Data de Prospecção': lead.prospected_at 
          ? new Date(lead.prospected_at).toLocaleDateString('pt-BR') 
          : '',
        'Tags': lead.tags?.join(', ') || '',
        'Google Maps': lead.google_maps_link || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');

      // Auto-width columns
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      const fileName = `leads_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(`${leads.length} leads exportados com sucesso!`);
      trackScoreEvent("export_report", { type: "crm_leads", count: leads.length });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar leads');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="default" 
      onClick={handleExport}
      disabled={exporting || leads.length === 0}
    >
      <Download className="w-4 h-4 mr-2" />
      {exporting ? 'Exportando...' : 'Exportar'}
    </Button>
  );
};
