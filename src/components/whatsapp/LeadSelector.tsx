import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  History, 
  Users, 
  FileSpreadsheet,
  CheckCircle2,
  X,
  Search,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import type { Lead } from "@/pages/WhatsAppCampaign";

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
}

export const LeadSelector = ({ selectedLeads, onLeadsChange, onNext, canProceed }: LeadSelectorProps) => {
  const [source, setSource] = useState<'file' | 'history' | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

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

  const handleSelectHistory = (item: SearchHistoryItem) => {
    if (!item.leads || item.leads.length === 0) {
      toast({
        title: "Sem leads",
        description: "Esta busca não possui leads salvos",
        variant: "destructive",
      });
      return;
    }

    const leadsWithPhone = item.leads.filter(lead => lead.phone);
    onLeadsChange(leadsWithPhone);
    toast({
      title: "Leads carregados!",
      description: `${leadsWithPhone.length} contatos selecionados`,
    });
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

      {/* History List */}
      {source === 'history' && selectedLeads.length === 0 && (
        <div className="space-y-4">
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
              {filteredHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectHistory(item)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div>
                    <p className="font-medium">{item.keyword}</p>
                    <p className="text-sm text-muted-foreground">{item.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{item.results_count} leads</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Button variant="ghost" onClick={() => setSource(null)} className="w-full">
            Voltar
          </Button>
        </div>
      )}

      {/* Selected Leads Summary */}
      {selectedLeads.length > 0 && (
        <div className="space-y-4">
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

          <Button
            variant="outline"
            onClick={() => {
              setSource(null);
              fileInputRef.current?.click();
            }}
            className="w-full"
          >
            <Upload size={16} className="mr-2" />
            Importar outra planilha
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end mt-6 pt-6 border-t border-border">
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Próximo
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
};
