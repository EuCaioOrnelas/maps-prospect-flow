import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Search, Trash2, Wrench, Phone, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface InvalidPhone {
  id: string;
  phone: string;
  contact_name: string | null;
  company_name: string | null;
  fixed_phone: string | null;
  reason: string;
}

interface ScanResult {
  totalLeads: number;
  validCount: number;
  invalidCount: number;
  invalidPhones: InvalidPhone[];
  hasMore: boolean;
}

export const PhoneCleanupTool = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    setSelectedIds(new Set());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('cleanup-invalid-phones', {
        body: { action: 'scan' },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setScanResult(data);
      toast.success(`Encontrados ${data.invalidCount} números inválidos`);
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Erro ao escanear números');
    } finally {
      setScanning(false);
    }
  };

  const handleFixSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos um número para corrigir');
      return;
    }

    const fixableIds = Array.from(selectedIds).filter(id => {
      const phone = scanResult?.invalidPhones.find(p => p.id === id);
      return phone?.fixed_phone !== null;
    });

    if (fixableIds.length === 0) {
      toast.error('Nenhum dos selecionados pode ser corrigido automaticamente');
      return;
    }

    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('cleanup-invalid-phones', {
        body: { action: 'fix', leadIds: fixableIds },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`${data.fixedCount} números corrigidos com sucesso`);
      
      // Re-scan after fixing
      handleScan();
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Erro ao corrigir números');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos um lead para excluir');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} lead(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('cleanup-invalid-phones', {
        body: { action: 'delete', leadIds: Array.from(selectedIds) },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`${data.deletedCount} leads excluídos`);
      
      // Re-scan after deleting
      handleScan();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir leads');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === scanResult?.invalidPhones.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scanResult?.invalidPhones.map(p => p.id) || []));
    }
  };

  const selectFixable = () => {
    const fixableIds = scanResult?.invalidPhones
      .filter(p => p.fixed_phone !== null)
      .map(p => p.id) || [];
    setSelectedIds(new Set(fixableIds));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Limpeza de Telefones Inválidos
        </CardTitle>
        <CardDescription>
          Identifique e corrija números de telefone inválidos no banco de dados de leads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan Button */}
        <Button onClick={handleScan} disabled={scanning} className="w-full">
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Escaneando...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Escanear Números Inválidos
            </>
          )}
        </Button>

        {/* Results */}
        {scanResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{scanResult.totalLeads}</div>
                <div className="text-xs text-muted-foreground">Total de Leads</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{scanResult.validCount}</div>
                <div className="text-xs text-muted-foreground">Válidos</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{scanResult.invalidCount}</div>
                <div className="text-xs text-muted-foreground">Inválidos</div>
              </div>
            </div>

            {scanResult.invalidPhones.length > 0 && (
              <>
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedIds.size === scanResult.invalidPhones.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectFixable}>
                    Selecionar Corrigíveis
                  </Button>
                  <div className="flex-1" />
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleFixSelected}
                    disabled={processing || selectedIds.size === 0}
                  >
                    {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wrench className="w-4 h-4 mr-1" />}
                    Corrigir ({selectedIds.size})
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDeleteSelected}
                    disabled={processing || selectedIds.size === 0}
                  >
                    {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                    Excluir ({selectedIds.size})
                  </Button>
                </div>

                {/* List */}
                <ScrollArea className="h-[400px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {scanResult.invalidPhones.map((phone) => (
                      <div 
                        key={phone.id}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox 
                          checked={selectedIds.has(phone.id)}
                          onCheckedChange={() => toggleSelect(phone.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {phone.contact_name || phone.company_name || 'Sem nome'}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {phone.phone}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {phone.reason}
                          </Badge>
                          {phone.fixed_phone ? (
                            <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/50">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              → {phone.fixed_phone}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/50">
                              Não corrigível
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {scanResult.hasMore && (
                  <p className="text-xs text-muted-foreground text-center">
                    Mostrando os primeiros 100 números inválidos. Existem mais registros.
                  </p>
                )}
              </>
            )}

            {scanResult.invalidPhones.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Todos os números de telefone estão válidos!</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
