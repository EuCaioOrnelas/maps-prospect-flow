import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, X, Calendar, Image, Mic, FileText, Filter, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { formatPhoneNumber } from '@/lib/phoneUtils';
import { cn } from '@/lib/utils';
import type { Message } from '@/hooks/useChat';

interface MessageSearchProps {
  messages: Message[];
  onSelectMessage: (messageId: string) => void;
  onClose: () => void;
  isGroup?: boolean;
}

type MediaFilter = 'all' | 'text' | 'image' | 'audio' | 'document';

// Format sender phone for groups - uses centralized utility
const formatSenderPhone = (phone: string | null): string => {
  if (!phone) return 'Desconhecido';
  return formatPhoneNumber(phone);
};

export const MessageSearch = ({ messages, onSelectMessage, onClose, isGroup = false }: MessageSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const mediaFilters: { value: MediaFilter; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: 'Todos', icon: Filter },
    { value: 'text', label: 'Texto', icon: FileText },
    { value: 'image', label: 'Imagens', icon: Image },
    { value: 'audio', label: 'Áudios', icon: Mic },
    { value: 'document', label: 'Documentos', icon: FileText },
  ];

  const filteredMessages = messages.filter((msg) => {
    // Text search
    if (searchQuery && msg.content) {
      if (!msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    // Media type filter
    if (mediaFilter !== 'all') {
      if (mediaFilter === 'text' && msg.message_type !== 'text') return false;
      if (mediaFilter === 'image' && msg.message_type !== 'image') return false;
      if (mediaFilter === 'audio' && msg.message_type !== 'audio') return false;
      if (mediaFilter === 'document' && msg.message_type !== 'document') return false;
    }

    // Date range filter
    const msgDate = new Date(msg.created_at);
    if (dateFrom && msgDate < dateFrom) return false;
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (msgDate > endOfDay) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setMediaFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = mediaFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="absolute inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <h3 className="font-semibold text-foreground">Buscar mensagens</h3>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por conteúdo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
            autoFocus
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "w-full justify-between",
            hasActiveFilters && "border-primary text-primary"
          )}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {[mediaFilter !== 'all', dateFrom, dateTo].filter(Boolean).length}
              </Badge>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
        </Button>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-3">
            {/* Media type filter */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tipo de mídia</p>
              <div className="flex flex-wrap gap-1.5">
                {mediaFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={mediaFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMediaFilter(filter.value)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <filter.icon className="h-3 w-3" />
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Período</p>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start text-xs h-8">
                      <Calendar className="h-3 w-3 mr-1.5" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'De'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start text-xs h-8">
                      <Calendar className="h-3 w-3 mr-1.5" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Até'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs">
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery || hasActiveFilters 
                  ? 'Nenhuma mensagem encontrada' 
                  : 'Digite para buscar mensagens'}
              </p>
            </div>
          ) : (
            <>
              <p className="px-2 py-1 text-xs text-muted-foreground">
                {filteredMessages.length} mensage{filteredMessages.length === 1 ? 'm' : 'ns'} encontrada{filteredMessages.length === 1 ? '' : 's'}
              </p>
              {filteredMessages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => {
                    onSelectMessage(message.id);
                    onClose();
                  }}
                  className="w-full p-3 text-left rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      message.from_me ? "bg-primary/20" : "bg-muted"
                    )}>
                      {message.message_type === 'image' && <Image className="h-4 w-4 text-muted-foreground" />}
                      {message.message_type === 'audio' && <Mic className="h-4 w-4 text-muted-foreground" />}
                      {message.message_type === 'document' && <FileText className="h-4 w-4 text-muted-foreground" />}
                      {message.message_type === 'text' && <FileText className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-primary">
                          {message.from_me 
                            ? 'Você' 
                            : isGroup 
                              ? (message.sender_name || formatSenderPhone(message.sender_jid)) 
                              : 'Contato'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {message.content || `[${message.message_type}]`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
