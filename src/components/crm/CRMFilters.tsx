import { useState } from 'react';
import { type PipelineStage, type WhatsAppStatus, WHATSAPP_STATUS_LABELS } from '@/hooks/useCRM';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, X, SlidersHorizontal, Smartphone } from 'lucide-react';

export interface CRMFiltersState {
  search: string;
  stage: string;
  whatsappStatus: string;
  tags: string[];
  origin: string;
  whatsappNumberId: string;
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
}

export const CRMFilters = ({
  stages,
  filters,
  onFiltersChange,
  availableTags,
  whatsappNumbers,
}: CRMFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = [
    filters.stage,
    filters.whatsappStatus,
    filters.origin,
    filters.whatsappNumberId,
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
    });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    updateFilter('tags', newTags);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Buscar leads..."
          className="pl-9"
        />
      </div>

      {/* Stage Filter */}
      <Select
        value={filters.stage}
        onValueChange={(value) => updateFilter('stage', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-44">
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

      {/* WhatsApp Status Filter */}
      <Select
        value={filters.whatsappStatus}
        onValueChange={(value) => updateFilter('whatsappStatus', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Status WhatsApp" />
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

      {/* Advanced Filters */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
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
              <h4 className="font-medium text-sm">Filtros Avançados</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              )}
            </div>

            {/* WhatsApp Number Filter */}
            {whatsappNumbers.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  <div className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    Número WhatsApp
                  </div>
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
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="google_maps">Google Maps</SelectItem>
                  <SelectItem value="import">Importação</SelectItem>
                  <SelectItem value="campaign">Campanha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
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
