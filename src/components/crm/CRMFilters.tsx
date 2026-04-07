import { useState, useEffect, useCallback } from 'react';
import { type PipelineStage, type WhatsAppStatus, WHATSAPP_STATUS_LABELS } from '@/hooks/useCRM';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, X, SlidersHorizontal, Smartphone, CalendarIcon, Layers, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface CRMFiltersState {
  search: string;
  stage: string;
  whatsappStatus: string;
  tags: string[];
  origin: string;
  whatsappNumberId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface WhatsAppNumber {
  id: string;
  name: string;
  phone_number: string | null;
}

interface CRMFiltersProps {
  stages: PipelineStage[];
  filters: CRMFiltersState;
  onFiltersChange: (filters: CRMFiltersState) => void;
  availableTags: string[];
  whatsappNumbers: WhatsAppNumber[];
  availableOrigins: string[];
}

export const CRMFilters = ({
  stages,
  filters,
  onFiltersChange,
  availableTags,
  whatsappNumbers,
  availableOrigins,
}: CRMFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch]);

  // Sync local search when filters.search changes externally (e.g., clear filters)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const activeFiltersCount = [
    filters.stage,
    filters.whatsappStatus,
    filters.origin,
    filters.whatsappNumberId,
    filters.dateFrom,
    filters.dateTo,
    ...filters.tags,
  ].filter(Boolean).length;

  const updateFilter = <K extends keyof CRMFiltersState>(
    key: K,
    value: CRMFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      stage: '',
      whatsappStatus: '',
      tags: [],
      origin: '',
      whatsappNumberId: '',
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    updateFilter('tags', newTags);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Search with debounce */}
      <div className="relative flex-1 max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Buscar contatos..."
          className="pl-9 rounded-full"
        />
      </div>

      {/* Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="default" className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              )}
            </div>

            {/* Pipeline Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Layers className="w-3 h-3" />
                Pipeline
              </div>
              
              {/* Stage Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Etapa
                </label>
                <Select
                  value={filters.stage}
                  onValueChange={(value) => updateFilter('stage', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as etapas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as etapas</SelectItem>
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

            <Separator />

            {/* WhatsApp Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </div>

              {/* WhatsApp Status Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Status
                </label>
                <Select
                  value={filters.whatsappStatus}
                  onValueChange={(value) => updateFilter('whatsappStatus', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(WHATSAPP_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* WhatsApp Number Filter */}
              {whatsappNumbers.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Número
                  </label>
                  <Select
                    value={filters.whatsappNumberId}
                    onValueChange={(value) => updateFilter('whatsappNumberId', value === 'all' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os números" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os números</SelectItem>
                      {whatsappNumbers.map((number) => (
                        <SelectItem key={number.id} value={number.id}>
                          {number.name}
                          {number.phone_number && (
                            <span className="text-muted-foreground ml-1">
                              ({number.phone_number})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Other Filters Section */}
            <div className="space-y-3">
              {/* Origin Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Origem
                </label>
                <Select
                  value={filters.origin}
                  onValueChange={(value) => updateFilter('origin', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as origens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as origens</SelectItem>
                    {availableOrigins.map((origin) => (
                      <SelectItem key={origin} value={origin}>
                        {origin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    Período de criação
                  </div>
                </label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal text-xs h-9",
                          !filters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => updateFilter('dateFrom', date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal text-xs h-9",
                          !filters.dateTo && "text-muted-foreground"
                        )}
                      >
                        {filters.dateTo ? format(filters.dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => updateFilter('dateTo', date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {(filters.dateFrom || filters.dateTo) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-1 h-7 text-xs w-full"
                    onClick={() => {
                      updateFilter('dateFrom', undefined);
                      updateFilter('dateTo', undefined);
                    }}
                  >
                    Limpar período
                  </Button>
                )}
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <>
                <Separator />
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="w-4 h-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
};
