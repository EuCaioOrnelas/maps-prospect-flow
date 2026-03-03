import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, MapPin, Users, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SearchGroup {
  keyword: string;
  location: string;
  leadsCount: number;
  isAssigned: boolean;
  assignedTo?: string;
}

interface SelectWarmingSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  numberId: string;
  numberName: string;
  onSearchSelected: (search: { keyword: string; location: string }) => void;
}

const ITEMS_PER_PAGE = 3;
const MAX_ITEMS = 12;

export function SelectWarmingSearchDialog({
  open,
  onOpenChange,
  userId,
  numberId,
  numberName,
  onSearchSelected,
}: SelectWarmingSearchDialogProps) {
  const navigate = useNavigate();
  const [searches, setSearches] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSearch, setSelectedSearch] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (open && userId) {
      fetchAvailableSearches();
      setCurrentPage(0);
      setSelectedSearch(null);
    }
  }, [open, userId]);

  const fetchAvailableSearches = async () => {
    setLoading(true);
    try {
      // Fetch last 12 unique searches from history
      const { data: searchHistory, error: searchError } = await supabase
        .from('search_history')
        .select('keyword, location, leads')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (searchError) throw searchError;

      // Fetch already assigned searches
      const { data: assignments, error: assignError } = await supabase
        .from('warming_search_assignments')
        .select('search_query, search_city, whatsapp_number_id, whatsapp_numbers(name)')
        .eq('user_id', userId);

      if (assignError) throw assignError;

      // Fetch actual leads count from leads table grouped by category+city
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('category, city')
        .eq('user_id', userId);

      if (leadsError) throw leadsError;

      // Build a map of category|city -> count from the real leads table
      const realLeadsMap = new Map<string, number>();
      leadsData?.forEach(lead => {
        const key = `${lead.category || ''}|${lead.city || ''}`;
        realLeadsMap.set(key, (realLeadsMap.get(key) || 0) + 1);
      });

      // Group searches and count leads
      const searchMap = new Map<string, SearchGroup>();
      
      searchHistory?.forEach(s => {
        const key = `${s.keyword}|${s.location}`;
        if (!searchMap.has(key) && searchMap.size < MAX_ITEMS) {
          // Count from search_history JSON
          const leadsArray = Array.isArray(s.leads) ? s.leads : [];
          const jsonCount = leadsArray.length;

          // Also check real leads table (match by category=keyword, city=location)
          const realKey = `${s.keyword}|${s.location}`;
          const realCount = realLeadsMap.get(realKey) || 0;

          // Use the higher count between JSON and real leads table
          const leadsCount = Math.max(jsonCount, realCount);

          // Check if assigned to another number
          const assignment = assignments?.find(
            a => a.search_query === s.keyword && a.search_city === s.location
          );

          searchMap.set(key, {
            keyword: s.keyword,
            location: s.location,
            leadsCount,
            isAssigned: !!assignment && assignment.whatsapp_number_id !== numberId,
            assignedTo: assignment && assignment.whatsapp_number_id !== numberId
              ? (assignment.whatsapp_numbers as any)?.name
              : undefined
          });
        }
      });

      setSearches(Array.from(searchMap.values()));
    } catch (error) {
      console.error('Error fetching searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedSearch) return;
    
    setSaving(true);
    try {
      const [keyword, location] = selectedSearch.split('|');
      
      // Check if assignment exists for this number
      const { data: existing } = await supabase
        .from('warming_search_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('whatsapp_number_id', numberId)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from('warming_search_assignments')
          .update({
            search_query: keyword,
            search_city: location,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new
        await supabase
          .from('warming_search_assignments')
          .insert({
            user_id: userId,
            whatsapp_number_id: numberId,
            search_query: keyword,
            search_city: location
          });
      }

      onSearchSelected({ keyword, location });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignment:', error);
    } finally {
      setSaving(false);
    }
  };

  const availableSearches = searches.filter(s => !s.isAssigned && s.leadsCount >= 50);
  const insufficientLeads = searches.filter(s => !s.isAssigned && s.leadsCount < 50 && s.leadsCount > 0);
  const hasNoSearches = searches.length === 0;
  const hasNoAvailableSearches = availableSearches.length === 0;

  // Pagination
  const totalPages = Math.ceil(availableSearches.length / ITEMS_PER_PAGE);
  const paginatedSearches = availableSearches.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Selecionar Busca para Aquecimento
          </DialogTitle>
          <DialogDescription>
            Selecione qual busca de leads será usada para aquecer o número <strong>{numberName}</strong>. 
            Cada número precisa usar uma busca diferente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : hasNoSearches ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma busca encontrada
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Você precisa fazer buscas na página de prospecção primeiro para ter leads disponíveis para o aquecimento.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                <Search className="w-4 h-4 mr-2" />
                Ir para Prospecção
              </Button>
            </div>
          ) : hasNoAvailableSearches ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Não há buscas disponíveis com pelo menos 50 leads. Todas as buscas estão sendo usadas por outros números ou não têm leads suficientes.
                </AlertDescription>
              </Alert>
              
              {insufficientLeads.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Buscas com leads insuficientes:</p>
                  {insufficientLeads.slice(0, 3).map((s) => (
                    <div key={`${s.keyword}|${s.location}`} className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{s.keyword}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {s.location}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-destructive">
                          {s.leadsCount}/50 leads
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Button className="w-full" onClick={() => navigate('/dashboard')}>
                <Search className="w-4 h-4 mr-2" />
                Fazer Nova Busca
              </Button>
            </div>
          ) : (
            <>
              <RadioGroup value={selectedSearch || ""} onValueChange={setSelectedSearch}>
                <div className="space-y-3">
                  {paginatedSearches.map((search) => {
                    const value = `${search.keyword}|${search.location}`;
                    return (
                      <div
                        key={value}
                        className={`relative flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                          selectedSearch === value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedSearch(value)}
                      >
                        <RadioGroupItem value={value} id={value} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={value} className="cursor-pointer">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground">
                                {search.keyword}
                              </span>
                              <Badge variant="secondary" className="text-green-600">
                                <Users className="w-3 h-3 mr-1" />
                                {search.leadsCount} leads
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {search.location}
                            </p>
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage + 1} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleConfirm}
                  disabled={!selectedSearch || saving}
                >
                  {saving ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
