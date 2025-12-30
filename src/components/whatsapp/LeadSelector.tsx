import { useState, useEffect, useRef } from "react";
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
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import type { Lead } from "@/pages/WhatsAppCampaign";
import { DailyLimitIndicator } from "./DailyLimitIndicator";

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
  canProceed: boolean;
  dailyLimit: number;
  usedToday: number;
}

export const LeadSelector = ({ 
  selectedLeads, 
  onLeadsChange, 
  onNext, 
  canProceed,
  dailyLimit,
  usedToday
}: LeadSelectorProps) => {
  const [source, setSource] = useState<'file' | 'history' | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const remaining = dailyLimit - usedToday;
  const willExceed = selectedLeads.length > remaining;

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Map columns - try to find phone column
        const leads: Lead[] = jsonData.map(row => {
          const phone = row['Telefone'] || row['telefone'] || row['Phone'] || row['phone'] || 
                       row['Celular'] || row['celular'] || row['WhatsApp'] || row['whatsapp'] || '';
          
          return {
            name: row['Nome'] || row['nome'] || row['Name'] || row['name'] || 'Sem nome',
            category: row['Categoria'] || row['categoria'] || row['Category'] || '',
            address: row['Endereço'] || row['endereco'] || row['Address'] || '',
            city: row['Cidade'] || row['cidade'] || row['City'] || '',
            phone: String(phone).replace(/\D/g, ''),
            website: row['Site'] || row['site'] || row['Website'] || '',
            rating: row['Avaliação'] || row['avaliacao'] || row['Rating'] || 0,
            reviewCount: row['Nº Avaliações'] || row['reviews'] || 0,
            mapsLink: row['Link Maps'] || row['maps'] || '',
          };
        }).filter(lead => lead.phone);

        if (leads.length === 0) {
          toast({
            title: "Nenhum contato encontrado",
            description: "Certifique-se de que a planilha possui uma coluna com telefones",
            variant: "destructive",
          });
          return;
        }

        onLeadsChange(leads);
        toast({
          title: "Planilha importada!",
          description: `${leads.length} contatos carregados`,
        });
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

  const handleToggleHistory = (item: SearchHistoryItem) => {
    const newSelected = new Set(selectedHistoryIds);
    
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.add(item.id);
    }
    
    setSelectedHistoryIds(newSelected);
    
    // Merge all leads from selected history items
    const allLeads: Lead[] = [];
    searchHistory.forEach(h => {
      if (newSelected.has(h.id) && h.leads) {
        h.leads.forEach(lead => {
          if (lead.phone && !allLeads.some(l => l.phone === lead.phone)) {
            allLeads.push(lead);
          }
        });
      }
    });
    
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
    
    toast({
      title: "Leads carregados!",
      description: `${selectedLeads.length} contatos selecionados de ${selectedHistoryIds.size} buscas`,
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

      {/* Source Selection */}
      {!source && selectedLeads.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => {
              setSource('file');
              fileInputRef.current?.click();
            }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <FileSpreadsheet size={24} className="text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Importar Planilha</p>
              <p className="text-sm text-muted-foreground">Excel ou CSV com telefones</p>
            </div>
          </button>
          
          <button
            onClick={() => setSource('history')}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <History size={24} className="text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Usar Histórico</p>
              <p className="text-sm text-muted-foreground">Selecione uma busca anterior</p>
            </div>
          </button>
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
          {/* Daily Limit Indicator */}
          <DailyLimitIndicator 
            usedToday={usedToday}
            dailyLimit={dailyLimit}
            selectedCount={selectedLeads.length}
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

          {/* Preview of first 5 leads */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Prévia dos contatos:</p>
            <div className="space-y-1">
              {selectedLeads.slice(0, 5).map((lead, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <span>{lead.name}</span>
                  <span className="text-muted-foreground">{lead.phone}</span>
                </div>
              ))}
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
        <div className="flex justify-end mt-6 pt-6 border-t border-border">
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
