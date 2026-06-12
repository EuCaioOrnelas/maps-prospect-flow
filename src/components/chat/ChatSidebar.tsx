import { useMemo, useRef, useState } from "react";
import { Search, Pin, VolumeX, ChevronDown, MessageSquarePlus, Phone, Check, SlidersHorizontal, AlertTriangle, UserPlus, Trash2, Ban, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatConversation, WabaConnection } from "@/hooks/useChat";
import { getChatPhoneKey, useChatCRMFilters } from "@/hooks/useChatCRMFilters";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { NewConversationDialog } from "./NewConversationDialog";
import { ChatFiltersDialog, type ChatFilterConfig } from "./ChatFiltersDialog";
import { AddContactDialog } from "./AddContactDialog";
import { getChatAvatarColor, getChatInitials } from "@/lib/chatAvatar";
import { getResponsibleColor } from "@/lib/responsibleColor";
import { toast } from "sonner";

interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  connections: WabaConnection[];
  activeConnectionId: string | null;
  onConnectionChange: (id: string) => void;
  onTogglePin: (id: string) => void;
  onArchive: (id: string) => void;
  onToggleMute: (id: string) => void;
  loading: boolean;
  onNewConversation?: (phone: string, name?: string) => void;
  onSaveContactName?: (conversationId: string, name: string) => Promise<void>;
  onDeleteConversation?: (conversationId: string) => Promise<void>;
  onToggleBlock?: (conversationId: string) => Promise<void>;
  connectionHealth?: Record<string, boolean>;
  topToolbar?: React.ReactNode;
  members?: Array<{ user_id: string; name: string | null; email: string | null }>;
  currentUserId?: string | null;
  responsibleFilter?: string;
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM/yyyy");
  } catch { return ""; }
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + "…";
}

function getLastMessagePreview(conv: ChatConversation): string {
  if (!conv.last_message_text) return "";
  return truncateText(conv.last_message_text, 28);
}

type FilterType = "all" | "unread" | "filtered";

const DEFAULT_FILTER_CONFIG: ChatFilterConfig = { tags: [], crmStages: [], scoreMin: 0, scoreMax: 1000 };

export function ChatSidebar({
  conversations, activeConversationId, onSelectConversation,
  searchQuery, onSearchChange, connections, activeConnectionId,
  onConnectionChange, onTogglePin, onArchive, onToggleMute, loading,
  onNewConversation, onSaveContactName, onDeleteConversation, onToggleBlock,
  connectionHealth = {}, topToolbar, members = [], currentUserId = null, responsibleFilter = "all",
}: ChatSidebarProps) {
  const [addContactFor, setAddContactFor] = useState<ChatConversation | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customFilters, setCustomFilters] = useState<ChatFilterConfig>(DEFAULT_FILTER_CONFIG);
  const searchRef = useRef<HTMLInputElement>(null);
  const {
    availableTags,
    availableStages,
    crmLeadByPhoneKey,
    loading: loadingCrmFilters,
  } = useChatCRMFilters();

  const memberMap = useMemo(() => {
    const m: Record<string, { name: string | null; email: string | null }> = {};
    for (const x of members) m[x.user_id] = { name: x.name, email: x.email };
    return m;
  }, [members]);

  const hasCustomFilters = customFilters.tags.length > 0 || customFilters.crmStages.length > 0 || customFilters.scoreMin > 0 || customFilters.scoreMax < 1000;
  const customFilterCount = customFilters.tags.length + customFilters.crmStages.length + (customFilters.scoreMin > 0 || customFilters.scoreMax < 1000 ? 1 : 0);

  const handleApplyFilters = (filters: ChatFilterConfig) => {
    const nextHasFilters = filters.tags.length > 0 || filters.crmStages.length > 0 || filters.scoreMin > 0 || filters.scoreMax < 1000;

    setCustomFilters(filters);
    setActiveFilter(nextHasFilters ? "filtered" : "all");
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (activeFilter === "unread" && conv.unread_count <= 0) {
        return false;
      }

      if (activeFilter !== "filtered" || !hasCustomFilters) {
        return true;
      }

      const crmLead = crmLeadByPhoneKey[getChatPhoneKey(conv.contact_phone)];

      if (!crmLead) {
        return false;
      }

      if (customFilters.tags.length > 0) {
        const leadTags = new Set([
          ...crmLead.tags,
          ...(crmLead.statusLabel ? [crmLead.statusLabel] : []),
        ]);

        if (!customFilters.tags.some((tag) => leadTags.has(tag))) {
          return false;
        }
      }

      if (customFilters.crmStages.length > 0) {
        if (!crmLead.stageName || !customFilters.crmStages.includes(crmLead.stageName)) {
          return false;
        }
      }

      if (crmLead.score < customFilters.scoreMin || crmLead.score > customFilters.scoreMax) {
        return false;
      }

      return true;
    });
  }, [activeFilter, conversations, crmLeadByPhoneKey, customFilters, hasCustomFilters]);

  const isListLoading = loading || (activeFilter === "filtered" && loadingCrmFilters);

  return (
    <div className="flex flex-col h-full wa-sidebar-bg">
      {/* Header */}
      <div className="h-[58px] min-h-[58px] flex items-center justify-between px-4 wa-sidebar-header-bg wa-border-header-bottom">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-semibold wa-sidebar-header-text">Conversas</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Number selector dropdown */}
          {connections.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs wa-sidebar-header-select border transition-colors hover:brightness-110">
                  <Phone size={12} className="shrink-0 opacity-70" />
                  <span className="truncate max-w-[120px]">
                    {truncateText(
                      connections.find(c => c.id === activeConnectionId)?.nickname 
                        || connections.find(c => c.id === activeConnectionId)?.display_phone_number 
                        || "Número",
                      18
                    )}
                  </span>
                  {activeConnectionId && connectionHealth[activeConnectionId] === false && (
                    <AlertTriangle size={12} className="text-red-500 shrink-0 animate-pulse" />
                  )}
                  <ChevronDown size={11} className="shrink-0 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="wa-dropdown-bg border wa-border min-w-[240px] rounded-xl shadow-2xl py-1.5 overflow-hidden">
                <div className="px-3 py-2 border-b wa-border-light">
                  <p className="text-[11px] uppercase tracking-wider wa-text-muted font-semibold">Números conectados</p>
                </div>
                {connections.map(c => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => onConnectionChange(c.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 mx-1 my-0.5 rounded-lg cursor-pointer transition-colors",
                      c.id === activeConnectionId
                        ? "wa-accent-bg-soft wa-accent-text"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      connectionHealth[c.id] === false 
                        ? "bg-red-500/20" 
                        : c.id === activeConnectionId ? "wa-accent-bg-softer" : "bg-white/5"
                    )}>
                      {connectionHealth[c.id] === false ? (
                        <AlertTriangle size={14} className="text-red-500" />
                      ) : (
                        <Phone size={14} className={c.id === activeConnectionId ? "wa-accent-text" : "wa-icon-muted"} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("text-[13px] font-medium truncate", c.id === activeConnectionId ? "wa-accent-text" : "wa-text-primary")}>
                          {truncateText(c.nickname || c.business_name || "Número", 22)}
                        </p>
                        {connectionHealth[c.id] === false && (
                          <span className="text-[9px] font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                            Expirado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] wa-text-muted truncate">{c.display_phone_number || c.phone_number_id}</p>
                    </div>
                    {c.id === activeConnectionId && (
                      <Check size={16} className="wa-accent-text shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {(topToolbar || onNewConversation) && (
        <div className="px-3 py-2 border-b border-border/40 bg-background/40 flex items-center gap-2">
          <div className="flex-1 min-w-0 overflow-hidden">
            {topToolbar}
          </div>
          <button
            onClick={() => navigate("/chat/configuracoes")}
            className="shrink-0 p-[7px] rounded-full wa-sidebar-header-btn transition-colors border border-border/40 hover:border-primary/40"
            title="Configurações do chat"
            aria-label="Configurações do chat"
          >
            <Settings size={18} className="wa-sidebar-header-icon" />
          </button>
          {onNewConversation && (
            <button
              onClick={() => setNewConvOpen(true)}
              className="shrink-0 p-[7px] rounded-full wa-sidebar-header-btn transition-colors border border-border/40 hover:border-primary/40"
              title="Nova conversa"
              aria-label="Nova conversa"
            >
              <MessageSquarePlus size={18} className="wa-sidebar-header-icon" />
            </button>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className="px-3 py-[7px] wa-sidebar-search-area">
        <div className={cn(
          "flex items-center h-[35px] rounded-lg px-3 gap-3 transition-all duration-200",
          "wa-bg-search",
          searchFocused && "wa-search-focused"
        )}>
          <div className={cn(
            "flex items-center justify-center transition-transform duration-200",
            searchFocused ? "transform -translate-x-1" : ""
          )}>
            {searchFocused ? (
              <button onClick={() => { onSearchChange(""); searchRef.current?.blur(); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" className="wa-icon-tinted">
                  <path fill="currentColor" d="m12 4 1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z" />
                </svg>
              </button>
            ) : (
              <Search size={16} className="wa-icon-muted" />
            )}
          </div>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => { if (!searchQuery) setSearchFocused(false); }}
            placeholder="Pesquisar"
            className="flex-1 bg-transparent text-[13px] wa-text-primary placeholder:wa-text-muted outline-none"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center justify-center gap-2 px-3 pb-2 wa-sidebar-search-area">
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "px-3 py-[5px] rounded-full text-[12px] font-medium whitespace-nowrap transition-all duration-150 border",
            activeFilter === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "wa-text-muted border-white/10 hover:border-primary/40 hover:text-primary"
          )}
        >
          Todas
        </button>
        <button
          onClick={() => setActiveFilter(activeFilter === "unread" ? "all" : "unread")}
          className={cn(
            "px-3 py-[5px] rounded-full text-[12px] font-medium whitespace-nowrap transition-all duration-150 border",
            activeFilter === "unread"
              ? "bg-primary text-primary-foreground border-primary"
              : "wa-text-muted border-white/10 hover:border-primary/40 hover:text-primary"
          )}
        >
          Não lidas
        </button>
        <button
          onClick={() => setFiltersOpen(true)}
          className={cn(
            "flex items-center gap-1 px-3 py-[5px] rounded-full text-[12px] font-medium whitespace-nowrap transition-all duration-150 border",
            hasCustomFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "wa-text-muted border-white/10 hover:border-primary/40 hover:text-primary"
          )}
        >
          <SlidersHorizontal size={12} />
          Filtros
          {customFilterCount > 0 && (
            <span className="ml-0.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0 rounded-full leading-[16px]">
              {customFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto wa-scrollbar">
        {isListLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-[#128c7e]/20 border-t-[#128c7e] animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-sm wa-text-muted">
              {activeFilter === "filtered"
                ? "Nenhuma conversa encontrada nesses filtros"
                : activeFilter !== "all"
                  ? "Nenhuma conversa neste filtro"
                  : "Nenhuma conversa"}
            </p>
            <p className="text-xs wa-text-muted mt-1 opacity-60">As mensagens recebidas aparecerão aqui</p>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isActive = activeConversationId === conv.id;
            const hasUnread = conv.unread_count > 0;
            const hasName = !!conv.contact_name?.trim();
            const displayName = hasName
              ? truncateText(conv.contact_name as string, 24)
              : formatPhoneDisplay(conv.contact_phone);
            const respColor = getResponsibleColor(conv.responsible_user_id);
            const respMember = conv.responsible_user_id ? memberMap[conv.responsible_user_id] : null;
            const respLabel = respMember ? (respMember.name || respMember.email || "") : "";
            const respShort = respLabel ? respLabel.split(/\s+/)[0] : "";
            const isMine = conv.responsible_user_id && conv.responsible_user_id === currentUserId;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "flex items-center gap-[13px] pr-[15px] pl-[13px] cursor-pointer group relative",
                  "h-[72px] transition-colors duration-100",
                  isActive ? "wa-conv-active" : "wa-conv-hover"
                )}
                title={respLabel ? `Responsável: ${respLabel}${isMine ? " (você)" : ""}` : undefined}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-[49px] h-[49px] rounded-full flex items-center justify-center shrink-0 text-white text-[17px] font-medium relative",
                  getChatAvatarColor(conv.contact_phone)
                )}>
                  {conv.contact_profile_pic ? (
                    <img src={conv.contact_profile_pic} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <span>{getChatInitials(conv.contact_name, conv.contact_phone)}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 border-b wa-border-conversation py-[10px] h-full flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2 mb-[1px]">
                    <span className="text-[17px] leading-[21px] wa-text-primary truncate flex items-center gap-1.5 min-w-0 flex-1">
                      {conv.is_muted && (
                        <VolumeX size={14} className="wa-icon-muted shrink-0" />
                      )}
                      <span className="truncate">{displayName}</span>
                      {!hasName && onSaveContactName && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setAddContactFor(conv); }}
                          title="Salvar contato no CRM"
                          className="shrink-0 inline-flex items-center justify-center w-[20px] h-[20px] rounded-full wa-accent-surface wa-accent-text transition-colors"
                        >
                          <UserPlus size={11} />
                        </button>
                      )}
                    </span>
                    <div className="shrink-0 w-[104px] flex items-center justify-end gap-1.5">
                        {hasUnread && (
                          <span className="wa-accent-bg text-white text-[11px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-[5px]">
                            {conv.unread_count}
                          </span>
                        )}
                        <span className={cn(
                          "text-[12px] leading-[14px]",
                          hasUnread ? "wa-accent-text" : "wa-text-timestamp"
                        )}>
                          {formatTimestamp(conv.last_message_at)}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <button className="w-[20px] h-[20px] -mr-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <ChevronDown size={18} className="wa-icon-muted" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="wa-dropdown-menu border wa-border min-w-[210px] rounded-xl shadow-2xl py-1.5 overflow-hidden">
                          <DropdownMenuItem
                            onClick={() => onTogglePin(conv.id)}
                            className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                          >
                            <Pin size={14} />
                            {conv.is_pinned ? "Desafixar conversa" : "Fixar conversa"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onToggleMute(conv.id)}
                            className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                          >
                            <VolumeX size={14} />
                            {conv.is_muted ? "Ativar notificações" : "Silenciar notificações"}
                          </DropdownMenuItem>
                          {onToggleBlock && (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  await onToggleBlock(conv.id);
                                  toast.success((conv as any).is_blocked ? "Desbloqueado" : "Bloqueado");
                                } catch { toast.error("Erro"); }
                              }}
                              className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                            >
                              <Ban size={14} />
                              {(conv as any).is_blocked ? "Desbloquear" : "Bloquear"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onArchive(conv.id)}
                            className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
                            Arquivar conversa
                          </DropdownMenuItem>
                          {onDeleteConversation && (
                            <DropdownMenuItem
                              onClick={async () => {
                                if (!confirm("Apagar esta conversa? Esta ação não pode ser desfeita.")) return;
                                try { await onDeleteConversation(conv.id); toast.success("Conversa apagada"); }
                                catch { toast.error("Erro ao apagar"); }
                              }}
                              className="wa-dropdown-item-destructive flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                            >
                              <Trash2 size={14} />
                              Apagar conversa
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0 flex-1 min-w-0">
                      {conv.last_message_direction === "outbound" && (() => {
                        const st = (conv as any).last_message_status as string | null | undefined;
                        const isRead = st === "read";
                        const isDelivered = st === "delivered" || isRead;
                        const colorStyle = isRead ? { color: "#53bdeb" } : undefined;
                        if (isDelivered) {
                          return (
                            <span
                              className={cn("mr-1 shrink-0", isRead ? "" : "wa-text-muted")}
                              style={colorStyle}
                              aria-label={isRead ? "Visualizada" : "Entregue"}
                            >
                              <svg viewBox="0 0 18 11" height="11" width="18" fill="none">
                                <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.353.178.477.477 0 0 0-.076.541l2.432 4.31a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.564-.25z" fill="currentColor" />
                                <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-.58-.604a.456.456 0 0 0-.65.018.475.475 0 0 0-.013.66l1.002 1.045a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.667-.588z" fill="currentColor" />
                              </svg>
                            </span>
                          );
                        }
                        // sent or pending: single check
                        return (
                          <span className="wa-text-muted mr-1 shrink-0" aria-label={st === "failed" ? "Falhou" : "Enviada"}>
                            <svg viewBox="0 0 16 11" height="11" width="16" fill="none">
                              <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.353.178.477.477 0 0 0-.076.541l2.432 4.31a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.564-.25z" fill="currentColor" />
                            </svg>
                          </span>
                        );
                      })()}
                      <span className="text-[14px] leading-[20px] wa-text-secondary truncate">
                        {getLastMessagePreview(conv)}
                      </span>
                    </div>
                    <div className="shrink-0 w-[104px] ml-2 pr-[22px] flex items-center justify-end gap-[6px]">
                      {responsibleFilter === "all" && respShort && respColor && (
                        <span
                          className="inline-flex items-center px-[7px] py-[1px] rounded-full text-[10px] font-semibold leading-[14px] max-w-[82px] border"
                          style={{
                            backgroundColor: `${respColor}26`,
                            color: respColor,
                            borderColor: `${respColor}55`,
                          }}
                          title={`Responsável: ${respLabel}${isMine ? " (você)" : ""}`}
                        >
                          <span className="truncate">{truncateText(respShort, 10)}</span>
                        </span>
                      )}
                      {conv.is_pinned && (
                        <Pin size={14} className="wa-icon-muted fill-current" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New conversation dialog */}
      {onNewConversation && (
        <NewConversationDialog
          open={newConvOpen}
          onOpenChange={setNewConvOpen}
          onStartConversation={onNewConversation}
        />
      )}

      {/* Custom filters dialog */}
      <ChatFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={customFilters}
        onApply={handleApplyFilters}
        availableTags={availableTags}
        availableStages={availableStages}
        loading={loadingCrmFilters}
      />

      {/* Save contact to CRM (per-conversation) */}
      {onSaveContactName && addContactFor && (
        <AddContactDialog
          open={!!addContactFor}
          onOpenChange={(open) => { if (!open) setAddContactFor(null); }}
          phone={addContactFor.contact_phone}
          defaultName={addContactFor.contact_name}
          onSave={async (name) => {
            try {
              await onSaveContactName(addContactFor.id, name);
              toast.success("Contato salvo no CRM");
            } catch {
              toast.error("Erro ao salvar contato");
            }
          }}
        />
      )}
    </div>
  );
}
