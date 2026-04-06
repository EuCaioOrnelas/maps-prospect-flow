import { useState, useRef } from "react";
import { Search, Pin, VolumeX, ChevronDown, MessageSquarePlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatConversation, WabaConnection } from "@/hooks/useChat";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { NewConversationDialog } from "./NewConversationDialog";

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

function getInitials(name: string | null, phone: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

function getLastMessagePreview(conv: ChatConversation): string {
  if (!conv.last_message_text) return "";
  const text = conv.last_message_text;
  return text.length > 45 ? text.substring(0, 45) + "…" : text;
}

const AVATAR_COLORS = [
  "bg-[#00a884]", "bg-[#53bdeb]", "bg-[#7f66ff]", "bg-[#ff6f69]",
  "bg-[#ffa62b]", "bg-[#25d366]", "bg-[#5f66cd]", "bg-[#ff4081]",
];

function getAvatarColor(phone: string): string {
  const hash = phone.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function ChatSidebar({
  conversations, activeConversationId, onSelectConversation,
  searchQuery, onSearchChange, connections, activeConnectionId,
  onConnectionChange, onTogglePin, onArchive, onToggleMute, loading,
  onNewConversation,
}: ChatSidebarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col h-full wa-sidebar-bg">
      {/* Header - distinct background */}
      <div className="h-[60px] flex items-center justify-between px-4 bg-[#008069] dark:bg-[#1f2c34]">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-semibold text-white dark:text-[#e9edef]">Conversas</span>
        </div>
        <div className="flex items-center gap-2">
          {connections.length > 1 && (
            <select
              value={activeConnectionId || ""}
              onChange={e => onConnectionChange(e.target.value)}
              className="text-xs bg-white/10 text-white border border-white/20 rounded-md px-2 py-1.5 outline-none"
            >
              {connections.map(c => (
                <option key={c.id} value={c.id} className="text-black">
                  {c.nickname || c.display_phone_number || c.business_name || "Número"}
                </option>
              ))}
            </select>
          )}
          {onNewConversation && (
            <button
              onClick={() => setNewConvOpen(true)}
              className="p-[6px] rounded-full hover:bg-white/10 transition-colors"
              title="Nova conversa"
            >
              <MessageSquarePlus size={20} className="text-white/90" />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-[7px]">
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

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto wa-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-[#00a884]/20 border-t-[#00a884] animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-sm wa-text-muted">Nenhuma conversa</p>
            <p className="text-xs wa-text-muted mt-1 opacity-60">As mensagens recebidas aparecerão aqui</p>
          </div>
        ) : (
          conversations.map(conv => {
            const isActive = activeConversationId === conv.id;
            const hasUnread = conv.unread_count > 0;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "flex items-center gap-[13px] pr-[15px] pl-[13px] cursor-pointer group relative",
                  "h-[72px] transition-colors duration-100",
                  isActive ? "wa-conv-active" : "wa-conv-hover"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-[49px] h-[49px] rounded-full flex items-center justify-center shrink-0 text-white text-[17px] font-light",
                  getAvatarColor(conv.contact_phone)
                )}>
                  {conv.contact_profile_pic ? (
                    <img src={conv.contact_profile_pic} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <span>{getInitials(conv.contact_name, conv.contact_phone)}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 border-b wa-border-conversation py-[14px] h-full flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-[2px]">
                    <span className="text-[17px] leading-[21px] wa-text-primary truncate flex items-center gap-1">
                      {conv.contact_name || conv.contact_phone}
                    </span>
                    <span className={cn(
                      "text-[12px] leading-[14px] shrink-0 ml-2",
                      hasUnread ? "text-[#00a884] dark:text-[#00a884]" : "wa-text-timestamp"
                    )}>
                      {formatTimestamp(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0 flex-1 min-w-0">
                      {conv.last_message_direction === "outbound" && (
                        <span className="wa-text-muted mr-1 shrink-0">
                          <svg viewBox="0 0 16 11" height="11" width="16" fill="none">
                            <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.353.178.477.477 0 0 0-.076.541l2.432 4.31a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.564-.25z" fill="currentColor" />
                          </svg>
                        </span>
                      )}
                      <span className="text-[14px] leading-[20px] wa-text-secondary truncate">
                        {getLastMessagePreview(conv)}
                      </span>
                    </div>
                    <div className="flex items-center gap-[6px] shrink-0 ml-1">
                      {conv.is_pinned && (
                        <Pin size={14} className="wa-icon-muted fill-current" />
                      )}
                      {conv.is_muted && (
                        <VolumeX size={14} className="wa-icon-muted" />
                      )}
                      {hasUnread && (
                        <span className="bg-[#00a884] text-white text-[11px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-[5px]">
                          {conv.unread_count}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <ChevronDown size={18} className="wa-icon-muted" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="wa-dropdown-bg wa-border wa-text-primary min-w-[170px] rounded-[3px] shadow-xl py-[9px]">
                          <DropdownMenuItem onClick={() => onTogglePin(conv.id)} className="wa-dropdown-item text-[14.5px] px-6 py-[9px]">
                            {conv.is_pinned ? "Desafixar conversa" : "Fixar conversa"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleMute(conv.id)} className="wa-dropdown-item text-[14.5px] px-6 py-[9px]">
                            {conv.is_muted ? "Ativar notificações" : "Silenciar notificações"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onArchive(conv.id)} className="wa-dropdown-item text-[14.5px] px-6 py-[9px]">
                            Arquivar conversa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
    </div>
  );
}
