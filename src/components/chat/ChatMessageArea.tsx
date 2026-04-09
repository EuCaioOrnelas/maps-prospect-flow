import { useRef, useEffect, useState } from "react";
import { Search, MoreVertical, X, User, MessageSquareText, BellOff, Star, Trash2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage, ChatConversation } from "@/hooks/useChat";
import { format, parseISO, isSameDay, differenceInHours } from "date-fns";
import { ChatInput } from "./ChatInput";
import { ExpiredWindowBanner } from "./ExpiredWindowBanner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import logoIconNew from "@/assets/logo-icon-new.png";

// Format phone: 5511999887766 → +55 (11) 99988-7766
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

interface ChatMessageAreaProps {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onReopenConversation?: (templateName: string) => void;
}

// ─── Status icons ───
function MessageStatus({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <svg viewBox="0 0 16 15" width="16" height="15" className="wa-status-pending">
        <path fill="currentColor" d="M9.75 7.713H8.244V5.359a.5.5 0 0 0-.5-.5H7.65a.5.5 0 0 0-.5.5v2.947a.5.5 0 0 0 .5.5h2.1a.5.5 0 0 0 .5-.5v-.093a.5.5 0 0 0-.5-.5zM7.894.982a6.512 6.512 0 1 0 0 13.024 6.512 6.512 0 0 0 0-13.024zm0 11.795a5.283 5.283 0 1 1 0-10.566 5.283 5.283 0 0 1 0 10.566z" />
      </svg>
    );
  }
  if (status === "sent") {
    return (
      <svg viewBox="0 0 16 11" width="16" height="11" className="wa-status-sent">
        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.353.178.477.477 0 0 0-.076.541l2.432 4.31a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.564-.25z" fill="currentColor" />
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg viewBox="0 0 16 11" width="16" height="11" className="wa-status-delivered">
        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.353.178.477.477 0 0 0-.076.541l2.432 4.31a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.564-.25z" fill="currentColor" />
        <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.026-1.07-.964.636 1.994 3.538a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.912-.573z" fill="currentColor" />
      </svg>
    );
  }
  if (status === "read") {
    return (
      <svg viewBox="0 0 16 11" width="16" height="11" className="text-[#53bdeb]">
        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.353.178.477.477 0 0 0-.076.541l2.432 4.31a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.564-.25z" fill="currentColor" />
        <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.026-1.07-.964.636 1.994 3.538a.494.494 0 0 0 .42.254.457.457 0 0 0 .369-.178l7.07-9.76a.477.477 0 0 0-.076-.559l-.912-.573z" fill="currentColor" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" className="text-red-500">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4v5M8 11v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

// ─── Date divider ───
function DateDivider({ date }: { date: Date }) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label = format(date, "dd/MM/yyyy");
  if (isSameDay(date, today)) label = "HOJE";
  else if (isSameDay(date, yesterday)) label = "ONTEM";

  return (
    <div className="flex justify-center my-[12px]">
      <span className="wa-date-badge text-[12.5px] px-[12px] py-[5px] rounded-[7.5px] font-normal shadow-sm select-none">
        {label}
      </span>
    </div>
  );
}

// ─── Media previews ───
function MediaPreview({ msg }: { msg: ChatMessage }) {
  if (msg.message_type === "image") {
    return (
      <div className="rounded-[6px] overflow-hidden mb-[3px] max-w-[330px]">
        <img src={msg.media_url || ""} alt={msg.media_caption || "Imagem"} className="w-full max-h-[330px] object-cover cursor-pointer" loading="lazy" />
        {msg.media_caption && <p className="text-[14.2px] wa-text-primary mt-[4px] px-[2px] leading-[19px]">{msg.media_caption}</p>}
      </div>
    );
  }
  if (msg.message_type === "video") {
    return (
      <div className="rounded-[6px] overflow-hidden mb-[3px] max-w-[330px]">
        <video src={msg.media_url || ""} controls className="w-full max-h-[330px]" preload="metadata" />
        {msg.media_caption && <p className="text-[14.2px] wa-text-primary mt-[4px] px-[2px] leading-[19px]">{msg.media_caption}</p>}
      </div>
    );
  }
  if (msg.message_type === "document") {
    return (
      <a href={msg.media_url || "#"} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-[10px] wa-doc-bg rounded-[8px] p-[10px] mb-[3px] max-w-[330px] group/doc">
        <div className="h-[40px] w-[40px] rounded-[4px] wa-doc-icon flex items-center justify-center shrink-0">
          <svg viewBox="0 0 37 40" width="28" height="30"><path fill="#aaa" d="M22.94 0H5.63C2.52 0 0 2.52 0 5.63v28.74c0 3.11 2.52 5.63 5.63 5.63h25.74c3.11 0 5.63-2.52 5.63-5.63V14.06L22.94 0z" /><path fill="#ccc" d="M37 14.06h-8.43c-3.11 0-5.63-2.52-5.63-5.63V0L37 14.06z" /></svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.6px] wa-text-primary truncate leading-[18px]">{msg.media_filename || "Documento"}</p>
          <p className="text-[11px] wa-text-muted mt-[2px]">{msg.media_mime_type || "arquivo"}</p>
        </div>
      </a>
    );
  }
  return null;
}

// ─── Tail SVGs ───
function OutboundTail() {
  return (
    <span className="absolute top-0 -right-[8px] w-[8px] h-[13px]">
      <svg viewBox="0 0 8 13" width="8" height="13"><path className="wa-bubble-out-fill" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" /></svg>
    </span>
  );
}
function InboundTail() {
  return (
    <span className="absolute top-0 -left-[8px] w-[8px] h-[13px]">
      <svg viewBox="0 0 8 13" width="8" height="13"><path className="wa-bubble-in-fill" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" /></svg>
    </span>
  );
}

// ─── Search messages bar ───
function SearchMessagesBar({ messages, onClose }: { messages: ChatMessage[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const results = query.trim().length >= 2
    ? messages.filter(m => m.content?.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="wa-search-panel flex flex-col border-l wa-border-light w-[360px] shrink-0 h-full">
      <div className="h-[59px] flex items-center gap-3 px-4 wa-header-bg border-b wa-border-light">
        <button onClick={onClose} className="wa-icon-button p-2">
          <X size={20} className="wa-icon-header" />
        </button>
        <span className="text-[16px] wa-text-primary font-normal">Pesquisar mensagens</span>
      </div>
      <div className="px-3 py-2">
        <div className="flex items-center h-[35px] rounded-lg px-3 gap-3 wa-bg-search">
          <Search size={16} className="wa-icon-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar..."
            autoFocus
            className="flex-1 bg-transparent text-[13px] wa-text-primary placeholder:wa-text-muted outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto wa-scrollbar px-3 py-1">
        {query.trim().length < 2 ? (
          <p className="text-center text-[13px] wa-text-muted py-8">Pesquise nas mensagens desta conversa</p>
        ) : results.length === 0 ? (
          <p className="text-center text-[13px] wa-text-muted py-8">Nenhuma mensagem encontrada</p>
        ) : (
          results.map(msg => (
            <div key={msg.id} className="py-3 border-b wa-border-light">
              <p className="text-[11px] wa-text-timestamp mb-1">{format(parseISO(msg.created_at), "dd/MM/yyyy HH:mm")}</p>
              <p className="text-[13px] wa-text-primary leading-[18px] line-clamp-2">{msg.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ChatMessageArea({
  conversation, messages, loading, onSendMessage, onSendMedia, messagesEndRef, onReopenConversation,
}: ChatMessageAreaProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ─── Empty state ───
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center wa-empty-bg select-none">
        <div className="text-center max-w-[500px] px-8">
          <div className="mb-[28px]">
            <img src={logoIconNew} alt="Wiize" className="w-[120px] h-[120px] mx-auto opacity-[0.12] grayscale" />
          </div>
          <h1 className="text-[32px] font-light wa-text-primary leading-[38px] mb-[14px]">Wiize Chat</h1>
          <p className="text-[14px] wa-text-secondary leading-[20px]">
            Envie e receba mensagens pelo WhatsApp Business.<br />
            Selecione uma conversa à esquerda para começar.
          </p>
          <div className="mt-[48px] flex items-center justify-center gap-[6px]">
            <svg viewBox="0 0 10 12" width="10" height="12" className="wa-icon-muted">
              <path fill="currentColor" d="M5.002 0C3.17 0 1.684 1.486 1.684 3.318v1.316H.87a.87.87 0 0 0-.87.87v5.626a.87.87 0 0 0 .87.87h8.264a.87.87 0 0 0 .87-.87V5.504a.87.87 0 0 0-.87-.87h-.813V3.318C8.321 1.486 6.834 0 5.002 0zM3.2 3.318c0-.993.808-1.8 1.8-1.8 .994 0 1.801.807 1.801 1.8v1.316H3.2V3.318z" />
            </svg>
            <span className="text-[12px] wa-text-muted">Suas mensagens são protegidas com criptografia</span>
          </div>
        </div>
      </div>
    );
  }

  // Avatar color
  const AVATAR_COLORS = ["bg-[#00a884]", "bg-[#53bdeb]", "bg-[#7f66ff]", "bg-[#ff6f69]", "bg-[#ffa62b]"];
  const hash = conversation.contact_phone.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const avatarColor = AVATAR_COLORS[hash % AVATAR_COLORS.length];

  return (
    <div className="flex-1 flex min-w-0">
      <div className="flex-1 flex flex-col min-w-0">
        {/* ─── Chat Header ─── */}
        <div className="h-[58px] min-h-[58px] flex items-center gap-[10px] px-[16px] wa-chat-header-bg wa-border-header-bottom shrink-0">
          <div className={cn(
            "w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 text-white text-[15px] font-light",
            avatarColor
          )}>
            {conversation.contact_profile_pic ? (
              <img src={conversation.contact_profile_pic} className="w-full h-full rounded-full object-cover" alt="" />
            ) : (
              <span>
                {conversation.contact_name
                  ? conversation.contact_name.split(/\s+/).map(n => n[0]).join("").substring(0, 2).toUpperCase()
                  : conversation.contact_phone.slice(-2)
                }
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-normal wa-chat-header-text truncate leading-[21px]">
              {conversation.contact_name || formatPhoneDisplay(conversation.contact_phone)}
            </h3>
            <p className="text-[13px] wa-chat-header-sub truncate leading-[18px]">
              {formatPhoneDisplay(conversation.contact_phone)}
            </p>
          </div>
          <div className="flex items-center gap-[20px]">
            <button className="wa-icon-button p-1" onClick={() => setShowSearch(!showSearch)}>
              <Search size={20} className="wa-chat-header-icon" />
            </button>
            {/* 3-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="wa-icon-button p-1">
                  <MoreVertical size={20} className="wa-chat-header-icon" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="wa-dropdown-bg border wa-border min-w-[220px] rounded-xl shadow-2xl py-1.5 overflow-hidden">
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] wa-text-primary cursor-pointer hover:bg-white/5 transition-colors">
                  <User size={15} className="wa-icon-muted" /> Dados do contato
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] wa-text-primary cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setShowSearch(true)}>
                  <Search size={15} className="wa-icon-muted" /> Pesquisar
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] wa-text-primary cursor-pointer hover:bg-white/5 transition-colors">
                  <MessageSquareText size={15} className="wa-icon-muted" /> Selecionar mensagens
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] wa-text-primary cursor-pointer hover:bg-white/5 transition-colors">
                  <BellOff size={15} className="wa-icon-muted" /> Silenciar
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] wa-text-primary cursor-pointer hover:bg-white/5 transition-colors">
                  <Star size={15} className="wa-icon-muted" /> Favoritos
                </DropdownMenuItem>
                <div className="my-1 mx-3 border-t wa-border-light" />
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] wa-text-primary cursor-pointer hover:bg-white/5 transition-colors">
                  <Ban size={15} className="wa-icon-muted" /> Bloquear
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] text-red-400 cursor-pointer hover:bg-red-500/10 transition-colors">
                  <Trash2 size={15} /> Apagar conversa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ─── Messages area ─── */}
        <div className="flex-1 overflow-y-auto wa-chat-bg wa-scrollbar relative" ref={scrollContainerRef}>
          {/* WhatsApp wallpaper doodle pattern */}
          <div className="absolute inset-0 wa-chat-pattern pointer-events-none" />
          {/* Glow effects */}
          <div className="wa-chat-glow" />

          <div className="relative z-[1] px-[63px] py-[4px] min-h-full flex flex-col justify-end">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-[3px] border-[#00a884]/20 border-t-[#00a884] animate-spin" />
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                  const showDate = !prevMsg || !isSameDay(parseISO(msg.created_at), parseISO(prevMsg.created_at));
                  const isOutbound = msg.direction === "outbound";
                  const isSameAuthorAsPrev = prevMsg && prevMsg.direction === msg.direction && !showDate;
                  const showTail = !isSameAuthorAsPrev;

                  return (
                    <div key={msg.id}>
                      {showDate && <DateDivider date={parseISO(msg.created_at)} />}
                      <div className={cn(
                        "flex",
                        isOutbound ? "justify-end" : "justify-start",
                        isSameAuthorAsPrev ? "mt-[2px]" : "mt-[10px]"
                      )}>
                        <div className={cn(
                          "relative max-w-[65%]",
                          showTail ? (isOutbound ? "mr-0" : "ml-0") : (isOutbound ? "mr-[8px]" : "ml-[8px]")
                        )}>
                          {showTail && (isOutbound ? <OutboundTail /> : <InboundTail />)}

                          <div className={cn(
                            "inline-block shadow-[0_1px_0.5px_rgba(11,20,26,.13)] relative",
                            isOutbound
                              ? "wa-bubble-out rounded-[7.5px]"
                              : "wa-bubble-in rounded-[7.5px]",
                            showTail && isOutbound && "!rounded-tr-none",
                            showTail && !isOutbound && "!rounded-tl-none"
                          )}>
                            {msg.message_type !== "text" && (
                              <div className="p-[3px]"><MediaPreview msg={msg} /></div>
                            )}

                            {msg.content && msg.message_type === "text" && (
                              <div className="px-[9px] pt-[6px] pb-[8px]">
                                <span className="text-[14.2px] wa-text-primary leading-[19px] whitespace-pre-wrap break-words">
                                  {msg.content}
                                </span>
                              </div>
                            )}

                            {/* Timestamp + status — below text, right-aligned */}
                            <div className="flex items-center justify-end gap-[3px] px-[7px] pb-[5px] -mt-[2px]">
                              <span className="text-[11px] leading-[15px] wa-text-timestamp select-none">
                                {format(parseISO(msg.created_at), "HH:mm")}
                              </span>
                              {isOutbound && <MessageStatus status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-[2px]" />
              </>
            )}
          </div>
        </div>

        {/* ─── Input or Expired Banner ─── */}
        {(() => {
          const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
          const isWindowExpired = lastInbound
            ? differenceInHours(new Date(), parseISO(lastInbound.created_at)) > 24
            : messages.length > 0;

          if (isWindowExpired && onReopenConversation) {
            return (
              <ExpiredWindowBanner
                contactName={conversation.contact_name}
                contactPhone={conversation.contact_phone}
                onReopenConversation={onReopenConversation}
              />
            );
          }
          return <ChatInput onSendMessage={onSendMessage} onSendMedia={onSendMedia} />;
        })()}
      </div>

      {/* Search panel */}
      {showSearch && (
        <SearchMessagesBar messages={messages} onClose={() => setShowSearch(false)} />
      )}
    </div>
  );
}
