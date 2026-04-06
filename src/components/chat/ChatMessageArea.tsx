import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, CheckCheck, Clock, Download, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage, ChatConversation } from "@/hooks/useChat";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChatInput } from "./ChatInput";

interface ChatMessageAreaProps {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case "pending": return <Clock size={14} className="text-[#8696a0]" />;
    case "sent": return <Check size={14} className="text-[#8696a0]" />;
    case "delivered": return <CheckCheck size={14} className="text-[#8696a0]" />;
    case "read": return <CheckCheck size={14} className="text-[#53bdeb]" />;
    case "failed": return <X size={14} className="text-red-400" />;
    default: return null;
  }
}

function DateDivider({ date }: { date: Date }) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label = format(date, "dd/MM/yyyy");
  if (isSameDay(date, today)) label = "HOJE";
  else if (isSameDay(date, yesterday)) label = "ONTEM";

  return (
    <div className="flex justify-center my-3">
      <span className="bg-[#182229] text-[#8696a0] text-[11px] px-3 py-1 rounded-lg shadow-sm">
        {label}
      </span>
    </div>
  );
}

function MediaPreview({ msg }: { msg: ChatMessage }) {
  if (msg.message_type === "image") {
    return (
      <div className="mb-1 rounded-lg overflow-hidden max-w-[330px]">
        <img
          src={msg.media_url || ""}
          alt={msg.media_caption || "Imagem"}
          className="w-full max-h-[300px] object-cover cursor-pointer"
          loading="lazy"
        />
        {msg.media_caption && (
          <p className="text-[13px] text-[#e9edef] mt-1 px-1">{msg.media_caption}</p>
        )}
      </div>
    );
  }
  if (msg.message_type === "video") {
    return (
      <div className="mb-1 rounded-lg overflow-hidden max-w-[330px]">
        <video
          src={msg.media_url || ""}
          controls
          className="w-full max-h-[300px]"
          preload="metadata"
        />
        {msg.media_caption && (
          <p className="text-[13px] text-[#e9edef] mt-1 px-1">{msg.media_caption}</p>
        )}
      </div>
    );
  }
  if (msg.message_type === "document") {
    return (
      <a
        href={msg.media_url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#1d282f] rounded-lg p-2.5 mb-1 max-w-[330px] hover:bg-[#26353d] transition-colors"
      >
        <div className="h-10 w-10 bg-[#00a884]/20 rounded-lg flex items-center justify-center shrink-0">
          <Download size={18} className="text-[#00a884]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#e9edef] truncate">{msg.media_filename || "Documento"}</p>
          <p className="text-xs text-[#8696a0]">{msg.media_mime_type || ""}</p>
        </div>
      </a>
    );
  }
  return null;
}

export function ChatMessageArea({
  conversation, messages, loading, onSendMessage, onSendMedia, messagesEndRef,
}: ChatMessageAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35]">
        <div className="text-center max-w-md px-8">
          <div className="w-[240px] h-[240px] mx-auto mb-6 flex items-center justify-center">
            <svg viewBox="0 0 303 172" width="240" className="text-[#364147]">
              <path fill="currentColor" d="M229.565 160.229c32.647-16.166 55.455-48.497 55.455-85.94C285.02 33.599 251.251 0 209.556 0c-27.124 0-50.93 14.425-64.209 36.071C131.967 14.425 108.161 0 81.037 0 39.342 0 5.573 33.599 5.573 74.289c0 37.443 22.808 69.774 55.455 85.94l84.319 85.791 84.218-85.791z" opacity=".08" />
            </svg>
          </div>
          <h1 className="text-[32px] font-light text-[#e9edef] mb-2">Wiize Chat</h1>
          <p className="text-sm text-[#8696a0] leading-relaxed">
            Envie e receba mensagens via WhatsApp Business API.<br />
            Selecione uma conversa para começar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0b141a] relative">
      {/* Chat wallpaper pattern */}
      <div className="absolute inset-0 opacity-[0.06] bg-repeat" style={{
        backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAB+SURBVHgB7dCxDQAgDMBAt/9/pgvYAFnJBFf6sCRJkiRJkiRJkiRJkiRJkqQf2N0jl919Yvcxu3vE7mN2d8fuY3b3iN3H7O6O3cfs7hG7j9ndHbuP2d0jdh+zuzv+YXePxO4eu4/Z3SN2H7O7O3Yfs7tH7D5md3fsPmZ3j0iSJEmSJEk6bC/SfxEVYAGJAAAAAElFTkSuQmCC")`,
      }} />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-2.5 bg-[#202c33] border-b border-[#222d34]">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-[#6b7b8d] text-white text-sm">
            {conversation.contact_name
              ? conversation.contact_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
              : conversation.contact_phone.substring(conversation.contact_phone.length - 2)
            }
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-normal text-[#e9edef] truncate">
            {conversation.contact_name || conversation.contact_phone}
          </h3>
          <p className="text-xs text-[#8696a0] truncate">
            {conversation.contact_phone}
          </p>
        </div>
        <button className="p-2 hover:bg-[#3b4a54] rounded-full transition-colors">
          <Search size={18} className="text-[#aebac1]" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative z-10 px-[7%] py-2" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-[#00a884]/20 border-t-[#00a884] animate-spin" />
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showDate = !prevMsg || !isSameDay(parseISO(msg.created_at), parseISO(prevMsg.created_at));
              const isOutbound = msg.direction === "outbound";

              return (
                <div key={msg.id}>
                  {showDate && <DateDivider date={parseISO(msg.created_at)} />}
                  <div className={cn("flex mb-[2px]", isOutbound ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[65%] rounded-lg px-2 pt-1.5 pb-1 shadow-sm relative",
                      isOutbound ? "bg-[#005c4b]" : "bg-[#202c33]"
                    )}>
                      {/* Media */}
                      {msg.message_type !== "text" && <MediaPreview msg={msg} />}
                      {/* Text */}
                      {msg.content && msg.message_type === "text" && (
                        <p className="text-[14.2px] text-[#e9edef] leading-[19px] whitespace-pre-wrap break-words pr-12">
                          {msg.content}
                        </p>
                      )}
                      {/* Timestamp + status */}
                      <div className={cn(
                        "flex items-center gap-1 justify-end mt-0.5",
                        msg.content || msg.media_caption ? "-mt-3 float-right ml-2 relative top-1" : ""
                      )}>
                        <span className="text-[11px] text-[#8696a0]/80">
                          {format(parseISO(msg.created_at), "HH:mm")}
                        </span>
                        {isOutbound && <MessageStatus status={msg.status} />}
                      </div>
                      <div className="clear-both" />
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="relative z-10">
        <ChatInput onSendMessage={onSendMessage} onSendMedia={onSendMedia} />
      </div>
    </div>
  );
}
