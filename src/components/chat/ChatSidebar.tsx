import { useState } from "react";
import { Search, Pin, Archive, Volume2, VolumeX, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatConversation, WabaConnection } from "@/hooks/useChat";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM/yyyy");
}

function getInitials(name: string | null, phone: string): string {
  if (name) return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  return phone.substring(phone.length - 2);
}

function getLastMessagePreview(conv: ChatConversation): string {
  if (!conv.last_message_text) return "";
  const prefix = conv.last_message_direction === "outbound" ? "Você: " : "";
  const text = conv.last_message_text;
  return prefix + (text.length > 40 ? text.substring(0, 40) + "…" : text);
}

export function ChatSidebar({
  conversations, activeConversationId, onSelectConversation,
  searchQuery, onSearchChange, connections, activeConnectionId,
  onConnectionChange, onTogglePin, onArchive, onToggleMute, loading,
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-[#111b21] border-r border-[#222d34]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-[#202c33]">
        <h2 className="text-base font-medium text-[#e9edef]">Chat</h2>
        {connections.length > 1 && (
          <select
            value={activeConnectionId || ""}
            onChange={e => onConnectionChange(e.target.value)}
            className="text-xs bg-[#2a3942] text-[#e9edef] border border-[#3b4a54] rounded px-2 py-1"
          >
            {connections.map(c => (
              <option key={c.id} value={c.id}>
                {c.nickname || c.display_phone_number || c.business_name || "Número"}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-[#111b21]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
          <Input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Pesquisar ou começar uma nova conversa"
            className="pl-10 h-[35px] text-sm bg-[#202c33] border-none text-[#e9edef] placeholder:text-[#8696a0] rounded-lg focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 rounded-full border-2 border-[#00a884]/20 border-t-[#00a884] animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm text-[#8696a0]">Nenhuma conversa ainda</p>
            <p className="text-xs text-[#8696a0]/60 mt-1">As mensagens recebidas aparecerão aqui</p>
          </div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[#222d34]/50",
                activeConversationId === conv.id ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
              )}
            >
              <Avatar className="h-[49px] w-[49px] shrink-0">
                <AvatarFallback className="bg-[#6b7b8d] text-white text-sm font-medium">
                  {getInitials(conv.contact_name, conv.contact_phone)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-normal text-[#e9edef] truncate flex items-center gap-1.5">
                    {conv.contact_name || conv.contact_phone}
                    {conv.is_pinned && <Pin size={12} className="text-[#8696a0] shrink-0" />}
                    {conv.is_muted && <VolumeX size={12} className="text-[#8696a0] shrink-0" />}
                  </span>
                  <span className={cn(
                    "text-xs shrink-0 ml-2",
                    conv.unread_count > 0 ? "text-[#00a884]" : "text-[#8696a0]"
                  )}>
                    {formatTimestamp(conv.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm text-[#8696a0] truncate">
                    {getLastMessagePreview(conv)}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {conv.unread_count > 0 && (
                      <Badge className="bg-[#00a884] text-white text-[11px] font-medium h-5 min-w-5 px-1.5 rounded-full border-0 hover:bg-[#00a884]">
                        {conv.unread_count}
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className="p-0.5 hover:bg-[#3b4a54] rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical size={16} className="text-[#8696a0]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#233138] border-[#3b4a54] text-[#e9edef]">
                        <DropdownMenuItem onClick={() => onTogglePin(conv.id)} className="hover:bg-[#182229]">
                          <Pin size={14} className="mr-2" /> {conv.is_pinned ? "Desafixar" : "Fixar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleMute(conv.id)} className="hover:bg-[#182229]">
                          {conv.is_muted ? <Volume2 size={14} className="mr-2" /> : <VolumeX size={14} className="mr-2" />}
                          {conv.is_muted ? "Ativar som" : "Silenciar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(conv.id)} className="hover:bg-[#182229]">
                          <Archive size={14} className="mr-2" /> Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
