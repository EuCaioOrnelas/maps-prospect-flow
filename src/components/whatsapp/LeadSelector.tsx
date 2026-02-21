import { useState, useEffect, useRef, DragEvent, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  History, 
  Users, 
  FileSpreadsheet,
  CheckCircle2,
  X,
  Search,
  ArrowRight,
  Plus,
  Download,
  AlertCircle,
  Phone,
  PhoneOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import type { Lead } from "@/pages/WhatsAppCampaign";
import { BalanceIndicator } from "./BalanceIndicator";
import { CountryCodeSelect } from "@/components/crm/CountryCodeSelect";
// Use centralized phone validation helper
import { validateAndFormatPhone, isLandlinePhone } from '@/lib/phoneUtils';

interface SearchHistoryItem {
  id: string;
  keyword: string;
  location: string;
  results_count: number;
  created_at: string;
  leads?: Lead[];
}

interface LeadSelectorProps {
  selectedLeads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
  onNext: () => void;
  onCancel?: () => void;
  canProceed: boolean;
  dailyLimit: number;
  usedToday: number;
  selectedNumberId: string | null;
  selectedNumberName?: string;
  isScheduled?: boolean;
  scheduledDate?: Date;
}

export const LeadSelector = ({ 
  selectedLeads, 
  onLeadsChange, 
  onNext, 
  onCancel,
  canProceed,
  dailyLimit,
  usedToday,
  selectedNumberId,
  selectedNumberName,
  isScheduled,
  scheduledDate
}: LeadSelectorProps) => {
  const [source, setSource] = useState<'file' | 'history' | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [importStats, setImportStats] = useState<{ valid: number; invalid: number; landlines: number } | null>(null);
  const [defaultCountryCode, setDefaultCountryCode] = useState("55");
  const prevCountryCodeRef = useRef(defaultCountryCode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const remaining = dailyLimit - usedToday;
  const willExceed = selectedLeads.length > remaining;

  // Get phone validation status for display
  const getPhoneStatus = (phone: string) => validateAndFormatPhone(phone);

  // Re-process leads when country code changes
  useEffect(() => {
    const prevCode = prevCountryCodeRef.current;
    if (prevCode === defaultCountryCode || selectedLeads.length === 0) {
      prevCountryCodeRef.current = defaultCountryCode;
      return;
    }
    
    const reprocessed = selectedLeads.map(lead => {
      let digits = String(lead.phone).replace(/\D/g, '');
      // Strip previous country code if it was prepended
      if (digits.startsWith(prevCode)) {
        const withoutCode = digits.slice(prevCode.length);
        // Only strip if the remaining part looks like a local number (10-11 digits)
        if (withoutCode.length >= 10 && withoutCode.length <= 11) {
          digits = withoutCode;
        }
      }
      // Apply new country code to local numbers
      if (digits.length >= 10 && digits.length <= 11) {
        digits = defaultCountryCode + digits;
      }
      return { ...lead, phone: digits };
    });
    
    prevCountryCodeRef.current = defaultCountryCode;
    onLeadsChange(reprocessed);
  }, [defaultCountryCode]);

  useEffect(() => {
    if (source === 'history') {
      fetchHistory();
    }
  }, [source]);

  const fetchHistory = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSearchHistory((data || []).map(item => ({
        ...item,
        leads: Array.isArray(item.leads) ? (item.leads as unknown as Lead[]) : []
      })));
    } catch (err) {
      console.error('Error fetching history:', err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nome': 'Exemplo Cliente',
        'Telefone': '5511999999999',
      },
      {
        'Nome': 'Empresa ABC',
        'Telefone': '5521988888888',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
    
    // Ajustar largura das colunas
    worksheet['!cols'] = [
      { wch: 25 }, // Nome
      { wch: 15 }, // Telefone
    ];

    XLSX.writeFile(workbook, 'modelo-disparos-whatsapp.xlsx');
    
    toast({
      title: "Modelo baixado!",
      description: "Preencha com nome na 1ª coluna e telefone na 2ª",
    });
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const headers = rawData[0] || [];
        
        // Detectar formato: prospecção (com vários campos) ou modelo simples (Nome, Telefone)
        const isProspectionFormat = headers.some((h: string) => 
          ['Categoria', 'categoria', 'Category', 'Endereço', 'endereco', 'Address'].includes(h)
        );

        const leads: Lead[] = jsonData.map((row) => {
          let name = '';
          let phone = '';
          
          if (isProspectionFormat) {
            // Formato de prospecção - pegar campos específicos
            name = row['Nome'] || row['nome'] || row['Name'] || row['name'] || 'Sem nome';
            phone = row['Telefone'] || row['telefone'] || row['Phone'] || row['phone'] || 
                   row['Celular'] || row['celular'] || row['WhatsApp'] || row['whatsapp'] || '';
          } else {
            // Formato simples - 1ª coluna: Nome, 2ª coluna: Telefone
            const firstHeader = headers[0];
            const secondHeader = headers[1];
            
            // Verificar se segue o padrão Nome/Telefone
            if (firstHeader && secondHeader) {
              name = row[firstHeader] || 'Sem nome';
              phone = row[secondHeader] || '';
            }
            
            // Fallback para headers conhecidos
            if (!phone) {
              phone = row['Telefone'] || row['telefone'] || row['Phone'] || '';
            }
            if (name === 'Sem nome') {
              name = row['Nome'] || row['nome'] || row['Name'] || 'Sem nome';
            }
          }
          
          return {
            name: String(name),
            category: row['Categoria'] || row['categoria'] || row['Category'] || '',
            address: row['Endereço'] || row['endereco'] || row['Address'] || '',
            city: row['Cidade'] || row['cidade'] || row['City'] || '',
            phone: (() => {
              const digits = String(phone).replace(/\D/g, '');
              // If 10-11 digits without country code, prepend selected country code
              if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith(defaultCountryCode)) {
                return defaultCountryCode + digits;
              }
              return digits;
            })(),
            website: row['Site'] || row['site'] || row['Website'] || '',
            rating: row['Avaliação'] || row['avaliacao'] || row['Rating'] || 0,
            reviewCount: row['Nº Avaliações'] || row['reviews'] || 0,
            mapsLink: row['Link Maps'] || row['maps'] || '',
          };
        });

        // Validate phones, filter landlines, and separate valid/invalid
        const validLeads: Lead[] = [];
        const invalidPhones: string[] = [];
        const landlineLeads: Lead[] = [];

        leads.forEach(lead => {
          const phoneStatus = validateAndFormatPhone(lead.phone);
          if (phoneStatus.isValid) {
            // Check if it's a landline (Brazilian fixed line)
            if (isLandlinePhone(lead.phone)) {
              landlineLeads.push({
                ...lead,
                phone: phoneStatus.formatted
              });
            } else {
              validLeads.push({
                ...lead,
                phone: phoneStatus.formatted
              });
            }
          } else if (lead.phone) {
            invalidPhones.push(lead.name || lead.phone);
          }
        });

        if (validLeads.length === 0) {
          const landlineMsg = landlineLeads.length > 0 
            ? ` (${landlineLeads.length} números fixos excluídos)` 
            : '';
          toast({
            title: "Nenhum celular válido encontrado",
            description: `A planilha deve ter Nome na 1ª coluna e Telefone (celular) na 2ª coluna${landlineMsg}`,
            variant: "destructive",
          });
          setImportStats(null);
          return;
        }

        // Set import stats for visual feedback
        setImportStats({
          valid: validLeads.length,
          invalid: invalidPhones.length,
          landlines: landlineLeads.length
        });

        onLeadsChange(validLeads);
        
        if (invalidPhones.length > 0 || landlineLeads.length > 0) {
          const parts = [];
          parts.push(`${validLeads.length} celulares válidos`);
          if (landlineLeads.length > 0) {
            parts.push(`${landlineLeads.length} fixos excluídos`);
          }
          if (invalidPhones.length > 0) {
            parts.push(`${invalidPhones.length} inválidos`);
          }
          toast({
            title: "Planilha importada com filtros",
            description: parts.join(', '),
          });
        } else {
          toast({
            title: "Planilha importada!",
            description: `${validLeads.length} contatos carregados com sucesso`,
          });
        }
      } catch (err) {
        console.error('Error parsing file:', err);
        toast({
          title: "Erro ao ler planilha",
          description: "Verifique se o arquivo é um Excel válido",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (validExtensions.includes(fileExtension)) {
        processFile(file);
      } else {
        toast({
          title: "Arquivo inválido",
          description: "Arraste apenas arquivos Excel (.xlsx, .xls) ou CSV",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleHistory = (item: SearchHistoryItem) => {
    const newSelected = new Set(selectedHistoryIds);
    
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.add(item.id);
    }
    
    setSelectedHistoryIds(newSelected);
    
    // Merge all leads from selected history items, filtering out landlines
    const allLeads: Lead[] = [];
    let totalLandlines = 0;
    
    searchHistory.forEach(h => {
      if (newSelected.has(h.id) && h.leads) {
        h.leads.forEach(lead => {
          if (lead.phone && !allLeads.some(l => l.phone === lead.phone)) {
            // Normalize phone with selected country code
            let digits = String(lead.phone).replace(/\D/g, '');
            if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith(defaultCountryCode)) {
              digits = defaultCountryCode + digits;
            }
            // Check if it's a landline
            if (isLandlinePhone(digits)) {
              totalLandlines++;
            } else {
              allLeads.push({ ...lead, phone: digits });
            }
          }
        });
      }
    });
    
    // Update import stats for history selection
    if (newSelected.size > 0) {
      setImportStats({
        valid: allLeads.length,
        invalid: 0,
        landlines: totalLandlines
      });
    } else {
      setImportStats(null);
    }
    
    onLeadsChange(allLeads);
  };

  const handleConfirmHistorySelection = () => {
    if (selectedLeads.length === 0) {
      toast({
        title: "Nenhum lead selecionado",
        description: "Selecione pelo menos uma busca do histórico",
        variant: "destructive",
      });
      return;
    }
    
    const landlineCount = importStats?.landlines || 0;
    const msg = landlineCount > 0 
      ? `${selectedLeads.length} celulares de ${selectedHistoryIds.size} buscas (${landlineCount} fixos excluídos)`
      : `${selectedLeads.length} contatos selecionados de ${selectedHistoryIds.size} buscas`;
    
    toast({
      title: "Leads carregados!",
      description: msg,
    });
    setSource(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredHistory = searchHistory.filter(item => 
    item.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Users size={24} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Selecionar Leads</h2>
        <p className="text-muted-foreground">
          Escolha os contatos que receberão as mensagens
        </p>
      </div>

      {/* Country Code Selector */}
      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30 mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium">Código do país dos leads</p>
          <p className="text-xs text-muted-foreground">
            Aplicado a números sem código de país (10-11 dígitos)
          </p>
        </div>
        <CountryCodeSelect 
          value={defaultCountryCode} 
          onValueChange={setDefaultCountryCode} 
        />
      </div>

      {/* Source Selection */}
      {!source && selectedLeads.length === 0 && (
        <div className="space-y-4 mb-6">
          {/* Download Template Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Download size={16} />
              Baixar modelo de planilha
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Drag and Drop Import Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                setSource('file');
                fileInputRef.current?.click();
              }}
              className={`
                flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer group
                ${isDragging 
                  ? 'border-primary bg-primary/10 scale-[1.02]' 
                  : 'border-border hover:border-primary hover:bg-primary/5'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? 'bg-primary/20' : 'bg-muted group-hover:bg-primary/10'}
              `}>
                <FileSpreadsheet size={24} className={`${isDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {isDragging ? 'Solte a planilha aqui' : 'Importar Planilha'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isDragging ? 'Excel ou CSV' : 'Arraste ou clique para selecionar'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setSource('history')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <History size={24} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Usar Buscas</p>
                <p className="text-sm text-muted-foreground">Selecione uma busca anterior</p>
              </div>
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Baixe o modelo ou importe planilhas exportadas das prospecções (compatível automaticamente)
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* History List - Multi-select */}
      {source === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Selecione uma ou mais buscas para combinar os leads
            </p>
            {selectedHistoryIds.size > 0 && (
              <span className="text-sm font-medium text-primary">
                {selectedHistoryIds.size} selecionadas ({selectedLeads.length} leads)
              </span>
            )}
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar no histórico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingHistory ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhum resultado encontrado" : "Nenhuma busca no histórico"}
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredHistory.map((item) => {
                const isSelected = selectedHistoryIds.has(item.id);
                const hasLeads = item.leads && item.leads.length > 0;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => hasLeads && handleToggleHistory(item)}
                    className={`
                      flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                      ${!hasLeads ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Checkbox 
                      checked={isSelected} 
                      disabled={!hasLeads}
                      className="pointer-events-none"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.keyword}</p>
                      <p className="text-sm text-muted-foreground">{item.location}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${hasLeads ? 'text-primary' : 'text-muted-foreground'}`}>
                        {item.results_count} leads
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => {
                setSource(null);
                setSelectedHistoryIds(new Set());
                if (selectedLeads.length === 0) {
                  onLeadsChange([]);
                }
              }} 
              className="flex-1"
            >
              Voltar
            </Button>
            {selectedHistoryIds.size > 0 && (
              <Button 
                onClick={handleConfirmHistorySelection}
                className="flex-1 gap-2"
              >
                <CheckCircle2 size={16} />
                Confirmar ({selectedLeads.length} leads)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Selected Leads Summary */}
      {selectedLeads.length > 0 && source !== 'history' && (
        <div className="space-y-4">
          {/* Balance Indicator */}
          <BalanceIndicator 
            numberId={selectedNumberId}
            numberName={selectedNumberName}
            selectedCount={selectedLeads.length}
            isScheduled={isScheduled}
            scheduledDate={scheduledDate}
          />

          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-primary" />
              <div>
                <p className="font-medium">{selectedLeads.length} contatos selecionados</p>
                <p className="text-sm text-muted-foreground">Prontos para receber mensagens</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onLeadsChange([]);
                setSource(null);
                setSelectedHistoryIds(new Set());
              }}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Import stats feedback */}
          {importStats && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 text-sm flex-wrap">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 size={16} />
                <span>{importStats.valid} celulares</span>
              </div>
              {importStats.landlines > 0 && (
                <div className="flex items-center gap-2 text-warning">
                  <PhoneOff size={16} />
                  <span>{importStats.landlines} fixos excluídos</span>
                </div>
              )}
              {importStats.invalid > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle size={16} />
                  <span>{importStats.invalid} inválidos</span>
                </div>
              )}
            </div>
          )}

          {/* Preview of first 5 leads */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Prévia dos contatos:</p>
            <div className="space-y-1">
              {selectedLeads.slice(0, 5).map((lead, i) => {
                const phoneStatus = getPhoneStatus(lead.phone);
                return (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span>{lead.name}</span>
                    <div className="flex items-center gap-2">
                      {phoneStatus.isValid ? (
                        <CheckCircle2 size={14} className="text-primary" />
                      ) : (
                        <AlertCircle size={14} className="text-destructive" />
                      )}
                      <span className={`font-mono text-xs ${phoneStatus.isValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                        {phoneStatus.display}
                      </span>
                    </div>
                  </div>
                );
              })}
              {selectedLeads.length > 5 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  + {selectedLeads.length - 5} outros contatos
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="flex-1"
            >
              <Plus size={16} className="mr-2" />
              Adicionar planilha
            </Button>
            <Button
              variant="outline"
              onClick={() => setSource('history')}
              className="flex-1"
            >
              <History size={16} className="mr-2" />
              Adicionar do histórico
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {source !== 'history' && (
        <div className="flex justify-between mt-6 pt-6 border-t border-border">
          {onCancel && (
            <Button 
              variant="ghost" 
              onClick={onCancel}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <X size={16} />
              Cancelar
            </Button>
          )}
          {!onCancel && <div />}
          <Button 
            onClick={onNext} 
            disabled={!canProceed || willExceed} 
            className="gap-2"
          >
            Próximo
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};
