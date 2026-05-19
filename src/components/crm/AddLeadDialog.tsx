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
import { 
  Loader2, 
  Plus, 
  AlertTriangle, 
  User, 
  Phone, 
  Building2, 
  MapPin, 
  Globe, 
  Tag, 
  Layers,
  DollarSign,
  Navigation,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CountryCodeSelect } from '@/components/crm/CountryCodeSelect';
import { useContactLimit } from '@/hooks/useContactLimit';
import { useNavigate } from 'react-router-dom';

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  origins: string[];
  defaultStageId?: string;
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

// Format number to Brazilian currency format (1.234,56)
const formatCurrency = (value: number): string => {
  if (!value && value !== 0) return '';
  return value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

// Parse Brazilian currency format to number
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Format input as user types in Brazilian currency format
const formatCurrencyInput = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const AddLeadDialog = ({
  open,
  onOpenChange,
  stages,
  origins,
  defaultStageId,
  onAddLead,
  onAddOrigin,
  checkLeadExists,
}: AddLeadDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { count, limit, hasLimit, isAtLimit } = useContactLimit();
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
    estimated_value: 0,
    origin: '',
  });

  useEffect(() => {
    if (stages.length > 0 && !formData.pipeline_stage_id) {
      setFormData(prev => ({ ...prev, pipeline_stage_id: defaultStageId || stages[0]?.id || '' }));
    }
  }, [stages, defaultStageId]);

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
        pipeline_stage_id: defaultStageId || stages[0]?.id || '',
        estimated_value: 0,
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

    if (isAtLimit) {
      toast.error(`Limite de ${limit.toLocaleString('pt-BR')} contatos atingido. Faça upgrade para adicionar mais.`);
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    const fullPhone = countryCode + phoneDigits;

    if (!phoneDigits.trim()) {
      toast.error('O telefone é obrigatório');
      return;
    }

    // Validate phone format - must have 8-12 digits (without country code)
    if (phoneDigits.length < 8 || phoneDigits.length > 12) {
      toast.error('Número de telefone inválido. Use entre 8 e 12 dígitos.');
      return;
    }

    // Block group IDs and invalid formats
    if (fullPhone.includes('@') || fullPhone.includes('-') || fullPhone.length > 15) {
      toast.error('Formato de telefone inválido');
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
        contact_name: formData.contact_name || (fullPhone),
        category: formData.category || undefined,
        city: formData.city || undefined,
        region: formData.region || undefined,
        website: formData.website || undefined,
        pipeline_stage_id: formData.pipeline_stage_id || undefined,
        estimated_value: formData.estimated_value || undefined,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden w-[95vw] sm:w-full rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Adicionar Lead
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Campos obrigatórios: telefone e origem.
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] sm:max-h-[calc(85vh-8rem)] -mr-6 pr-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Primary Fields - Name and Phone with emphasis */}
          <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            {/* Contact Name - Prominent */}
            <div>
              <Label htmlFor="contact_name" className="flex items-center gap-2 text-base font-medium mb-2">
                <User className="w-4 h-4 text-primary" />
                Nome do Contato
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Nome do contato"
                  className="pl-10 h-11 text-base"
                />
              </div>
            </div>

            {/* Phone - Prominent */}
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2 text-base font-medium mb-2">
                <Phone className="w-4 h-4 text-primary" />
                Telefone (WhatsApp) *
              </Label>
              <div className="flex gap-2">
                <CountryCodeSelect value={countryCode} onValueChange={setCountryCode} />
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onBlur={handlePhoneBlur}
                    placeholder="11999999999"
                    className="pl-10 h-11 text-base"
                    required
                  />
                </div>
              </div>
              {existingLeadWarning && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600">Este lead já existe no CRM</span>
                </div>
              )}
            </div>
          </div>

          {/* Origin - Required */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-muted-foreground" />
              Origem *
            </Label>
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

          {/* Secondary Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name" className="flex items-center gap-2 mb-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Empresa
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>

            <div>
              <Label htmlFor="category" className="flex items-center gap-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                Categoria
              </Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Nicho/Categoria"
              />
            </div>

            <div>
              <Label htmlFor="city" className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Cidade
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
              />
            </div>

            <div>
              <Label htmlFor="region" className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Região
              </Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="Estado/Região"
              />
            </div>

            <div>
              <Label htmlFor="website" className="flex items-center gap-2 mb-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                Website
              </Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="pipeline_stage" className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                Etapa do Pipeline
              </Label>
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
          </div>

          {/* Negotiation Value */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="w-4 h-4 text-primary" />
              Valor da Negociação
            </Label>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-primary font-medium text-lg">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatCurrency(formData.estimated_value)}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value);
                    const value = parseCurrency(formatted);
                    setFormData({ ...formData, estimated_value: value });
                  }}
                  className="flex-1 text-lg font-semibold bg-transparent outline-none text-foreground"
                  placeholder="0,00"
                />
              </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
