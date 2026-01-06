import { useState } from 'react';
import { type PipelineStage } from '@/hooks/useCRM';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  onAddLead: (lead: {
    phone: string;
    company_name?: string;
    contact_name?: string;
    category?: string;
    city?: string;
    region?: string;
    website?: string;
    pipeline_stage_id?: string;
    estimated_value?: number;
  }) => Promise<unknown>;
}

export const AddLeadDialog = ({
  open,
  onOpenChange,
  stages,
  onAddLead,
}: AddLeadDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    company_name: '',
    contact_name: '',
    category: '',
    city: '',
    region: '',
    website: '',
    pipeline_stage_id: stages[0]?.id || '',
    estimated_value: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone.trim()) {
      toast.error('O telefone é obrigatório');
      return;
    }

    setIsLoading(true);
    try {
      await onAddLead({
        phone: formData.phone.replace(/\D/g, ''),
        company_name: formData.company_name || undefined,
        contact_name: formData.contact_name || undefined,
        category: formData.category || undefined,
        city: formData.city || undefined,
        region: formData.region || undefined,
        website: formData.website || undefined,
        pipeline_stage_id: formData.pipeline_stage_id || undefined,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined,
      });
      
      toast.success('Lead adicionado com sucesso!');
      onOpenChange(false);
      setFormData({
        phone: '',
        company_name: '',
        contact_name: '',
        category: '',
        city: '',
        region: '',
        website: '',
        pipeline_stage_id: stages[0]?.id || '',
        estimated_value: '',
      });
    } catch (error) {
      toast.error('Erro ao adicionar lead');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Lead</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Você pode começar apenas com o número. O nome será preenchido conforme a conversa evoluir.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="5511999999999"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                O telefone é o identificador único do lead
              </p>
            </div>

            <div>
              <Label htmlFor="company_name">Empresa</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>

            <div>
              <Label htmlFor="contact_name">Contato</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Nome do contato"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Nicho/Categoria"
              />
            </div>

            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
              />
            </div>

            <div>
              <Label htmlFor="region">Região</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="Estado/Região"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="pipeline_stage">Etapa do Pipeline</Label>
              <Select
                value={formData.pipeline_stage_id}
                onValueChange={(value) => setFormData({ ...formData, pipeline_stage_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimated_value">Valor Estimado (R$)</Label>
              <Input
                id="estimated_value"
                type="number"
                step="0.01"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
