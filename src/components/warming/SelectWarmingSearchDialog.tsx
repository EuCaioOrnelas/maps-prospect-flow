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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MapPin, Users, AlertCircle, ExternalLink } from "lucide-react";
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

  useEffect(() => {
    if (open && userId) {
      fetchAvailableSearches();
    }
  }, [open, userId]);

  const fetchAvailableSearches = async () => {
    setLoading(true);
    try {
      // Fetch all search history
      const { data: searchHistory, error: searchError } = await supabase
        .from('search_history')
        .select('keyword, location, results_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (searchError) throw searchError;

      // Fetch already assigned searches
      const { data: assignments, error: assignError } = await supabase
        .from('warming_search_assignments')
        .select('search_query, search_city, whatsapp_number_id, whatsapp_numbers(name)')
        .eq('user_id', userId);

      if (assignError) throw assignError;

      // Count leads per search group
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('category, city')
        .eq('user_id', userId);

      if (leadsError) throw leadsError;

      // Group searches and check assignments
      const searchMap = new Map<string, SearchGroup>();
      
      searchHistory?.forEach(s => {
        const key = `${s.keyword}|${s.location}`;
        if (!searchMap.has(key)) {
          // Count leads matching this search
          const matchingLeads = leads?.filter(l => 
            l.category === s.keyword && l.city === s.location
          ).length || 0;

          // Check if assigned
          const assignment = assignments?.find(
            a => a.search_query === s.keyword && a.search_city === s.location
          );

          searchMap.set(key, {
            keyword: s.keyword,
            location: s.location,
            leadsCount: matchingLeads,
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
                  {insufficientLeads.map((s) => (
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
              <ScrollArea className="max-h-[300px] pr-4">
                <RadioGroup value={selectedSearch || ""} onValueChange={setSelectedSearch}>
                  <div className="space-y-3">
                    {availableSearches.map((search) => {
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
              </ScrollArea>

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
