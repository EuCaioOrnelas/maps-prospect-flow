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

        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] sm:max-h-[calc(85vh-8rem)] pr-1">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Primary Fields - Name and Phone with emphasis */}
          <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
      </DialogContent>
    </Dialog>
  );
};
