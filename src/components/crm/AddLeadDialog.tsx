import { useState, useEffect } from 'react';
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
import { Loader2, Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CountryCodeSelect } from '@/components/chat/CountryCodeSelect';

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  origins: string[];
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
    origin?: string;
  }) => Promise<unknown>;
  onAddOrigin: (origin: string) => Promise<void>;
  checkLeadExists: (phone: string) => Promise<boolean>;
}

export const AddLeadDialog = ({
  open,
  onOpenChange,
  stages,
  origins,
  onAddLead,
  onAddOrigin,
  checkLeadExists,
}: AddLeadDialogProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showNewOrigin, setShowNewOrigin] = useState(false);
  const [newOriginName, setNewOriginName] = useState('');
  const [existingLeadWarning, setExistingLeadWarning] = useState(false);
  const [countryCode, setCountryCode] = useState('55');
  const [formData, setFormData] = useState({
    phone: '',
    company_name: '',
    contact_name: '',
    category: '',
    city: '',
    region: '',
    website: '',
    pipeline_stage_id: '',
    estimated_value: '',
    origin: '',
  });

  useEffect(() => {
    if (stages.length > 0 && !formData.pipeline_stage_id) {
      setFormData(prev => ({ ...prev, pipeline_stage_id: stages[0]?.id || '' }));
    }
  }, [stages]);

  useEffect(() => {
    if (!open) {
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
        origin: '',
      });
      setExistingLeadWarning(false);
      setShowNewOrigin(false);
      setNewOriginName('');
      setCountryCode('55');
    }
  }, [open, stages]);

  const handlePhoneBlur = async () => {
    if (formData.phone.trim()) {
      const fullPhone = countryCode + formData.phone.replace(/\D/g, '');
      const exists = await checkLeadExists(fullPhone);
      setExistingLeadWarning(exists);
    }
  };

  const handleAddNewOrigin = async () => {
    if (!newOriginName.trim()) return;
    await onAddOrigin(newOriginName.trim());
    setFormData(prev => ({ ...prev, origin: newOriginName.trim() }));
    setShowNewOrigin(false);
    setNewOriginName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fullPhone = countryCode + formData.phone.replace(/\D/g, '');
    
    if (!fullPhone.trim()) {
      toast.error('O telefone é obrigatório');
      return;
    }

    if (!formData.origin) {
      toast.error('A origem é obrigatória');
      return;
    }

    // Check again before submitting
    const exists = await checkLeadExists(fullPhone);
    if (exists) {
      toast.error('Este lead já existe no CRM');
      return;
    }

    setIsLoading(true);
    try {
      await onAddLead({
        phone: fullPhone,
        company_name: formData.company_name || undefined,
        contact_name: formData.contact_name || (fullPhone), // Use phone as name if empty
        category: formData.category || undefined,
        city: formData.city || undefined,
        region: formData.region || undefined,
        website: formData.website || undefined,
        pipeline_stage_id: formData.pipeline_stage_id || undefined,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined,
        origin: formData.origin,
      });
      
      toast.success('Lead adicionado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao adicionar lead');
    } finally {
      setIsLoading(false);
    }
  };

  const defaultOrigins = ['Manual', 'Google Maps', 'Importação', 'Campanha', 'Indicação', 'Site', 'Rede Social'];
  const allOrigins = [...new Set([...defaultOrigins, ...origins])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Lead</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Campos obrigatórios: telefone e origem.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone with Warning */}
          <div>
            <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
            <div className="flex gap-2">
              <CountryCodeSelect value={countryCode} onValueChange={setCountryCode} />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onBlur={handlePhoneBlur}
                placeholder="11999999999"
                className="flex-1"
                required
              />
            </div>
            {existingLeadWarning && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-600">Este lead já existe no CRM</span>
              </div>
            )}
          </div>

          {/* Origin - Required */}
          <div>
            <Label>Origem *</Label>
            {showNewOrigin ? (
              <div className="flex gap-2">
                <Input
                  value={newOriginName}
                  onChange={(e) => setNewOriginName(e.target.value)}
                  placeholder="Nome da nova origem"
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={handleAddNewOrigin}>
                  Adicionar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowNewOrigin(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.origin}
                  onValueChange={(value) => setFormData({ ...formData, origin: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {allOrigins.map((origin) => (
                      <SelectItem key={origin} value={origin}>
                        {origin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="outline" onClick={() => setShowNewOrigin(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || existingLeadWarning}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
