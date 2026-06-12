import { useRef, useEffect, useState, useMemo } from "react";
import { Search, MoreVertical, X, User, Trash2, Ban, Reply, Forward, Copy, ChevronDown, UserCog, ArrowLeft, UserPlus, Tag, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage, ChatConversation } from "@/hooks/useChat";
import { format, parseISO, isSameDay, differenceInHours } from "date-fns";
import { ChatInput } from "./ChatInput";
import { ExpiredWindowBanner } from "./ExpiredWindowBanner";
import { AddContactDialog } from "./AddContactDialog";
import { ForwardDialog } from "./ForwardDialog";
import { ImageLightbox, downloadFromUrl } from "./ImageLightbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import logoIconNew from "@/assets/logo-icon-new.png";
import waChatBgAsset from "@/assets/wa-chat-bg.png.asset.json";
import { WhatsAppAudio } from "./WhatsAppAudio";
import { getChatAvatarColor, getChatInitials } from "@/lib/chatAvatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";


function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 12 && digits.startsWith("55")) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

interface ChatMessageAreaProps {
  conversation: ChatConversation | null;
  conversations?: ChatConversation[];
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (text: string, replyToId?: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onReopenConversation?: (templateName: string) => void;
  fetchTemplates?: () => Promise<any[]>;
  members?: { user_id: string; name: string | null; email: string | null }[];
  canChangeResponsible?: boolean;
  onTransferResponsible?: (conversationId: string, userId: string | null) => Promise<void>;
  currentUserId?: string;
  onBack?: () => void;
  onDeleteConversation?: (conversationId: string) => Promise<void>;
  onToggleBlock?: (conversationId: string) => Promise<void>;
  onSaveContactName?: (conversationId: string, name: string) => Promise<void>;
  onForwardMessages?: (targetPhone: string, targetName: string | undefined, msgs: ChatMessage[], templateName?: string) => Promise<{ requiresTemplate?: boolean }>;
}


function MessageStatus({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" className="wa-status-pending opacity-70">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 4.5v3.6l2.4 1.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
  if (msg.message_type === "audio") {
    return null; // rendered by bubble with WhatsAppAudio for avatar context
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

// Reply quote inside bubble — green for self, blue for contact
function ReplyQuote({ replyMsg }: { replyMsg: ChatMessage | undefined }) {
  if (!replyMsg) return null;
  const isSelf = replyMsg.direction === "outbound";
  const color = isSelf ? "#128c7e" : "#1f7aec";
  return (
    <div
      className="mx-[4px] mt-[4px] mb-[2px] rounded-[7px] bg-black/10 px-[8px] py-[5px] border-l-[3px] cursor-pointer"
      style={{ borderLeftColor: color }}
    >
      <p className="text-[11px] font-medium" style={{ color }}>
        {isSelf ? "Você" : "Contato"}
      </p>
      <p className="text-[12px] wa-text-muted truncate">{replyMsg.content || "📎 Mídia"}</p>
    </div>
  );
}

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

// Message action menu (reply, copy, forward) — rendered OUTSIDE the bubble
function MessageActions({
  msg, onReply, onForward, isOutbound,
}: {
  msg: ChatMessage;
  onReply: () => void;
  onForward: () => void;
  isOutbound: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "opacity-0 group-hover/msg-row:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity duration-150",
            "absolute top-0 right-0 z-10 w-[34px] h-[28px] rounded-tr-[7.5px] rounded-bl-[10px]",
            "flex items-start justify-end pt-[2px] pr-[4px]",
            isOutbound ? "wa-bubble-action-out" : "wa-bubble-action-in"
          )}
          aria-label="Ações da mensagem"
        >
          <ChevronDown size={18} strokeWidth={2.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="wa-dropdown-menu border wa-border min-w-[180px] rounded-xl shadow-2xl py-1.5 overflow-hidden">
        <DropdownMenuItem onClick={onReply} className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer">
          <Reply size={14} /> Responder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          navigator.clipboard.writeText(msg.content || "");
          toast.success("Mensagem copiada");
        }} className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer">
          <Copy size={14} /> Copiar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onForward} className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer">
          <Forward size={14} /> Encaminhar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChatMessageArea({
  conversation, conversations = [], messages, loading, onSendMessage, onSendMedia, messagesEndRef, onReopenConversation, fetchTemplates,
  members = [], canChangeResponsible = false, onTransferResponsible, currentUserId, onBack,
  onDeleteConversation, onToggleBlock, onSaveContactName, onForwardMessages,
}: ChatMessageAreaProps) {

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forwardOpen, setForwardOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<{ id: string; name: string; color: string | null; position: number }[]>([]);
  const [leadInfo, setLeadInfo] = useState<{ id: string; pipeline_stage_id: string | null } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);
  const navigate = useNavigate();
  const { accountOwnerId } = useAuth();

  // Load pipeline stages once
  useEffect(() => {
    if (!accountOwnerId) return;
    supabase
      .from("pipeline_stages")
      .select("id, name, color, position")
      .eq("user_id", accountOwnerId)
      .order("position", { ascending: true })
      .then(({ data }) => setPipelineStages((data as any) || []));
  }, [accountOwnerId]);

  // Load lead for the active conversation
  useEffect(() => {
    if (!conversation || !accountOwnerId) { setLeadInfo(null); return; }
    const last8 = conversation.contact_phone.replace(/\D/g, "").slice(-8);
    supabase
      .from("leads")
      .select("id, pipeline_stage_id")
      .eq("user_id", accountOwnerId)
      .ilike("phone", `%${last8}`)
      .limit(1)
      .then(({ data }) => setLeadInfo((data && data[0]) ? (data[0] as any) : null));
  }, [conversation?.id, conversation?.contact_phone, accountOwnerId]);

  const handleChangeStage = async (stageId: string) => {
    if (!leadInfo) { toast.error("Salve o contato no CRM antes de mudar a coluna"); return; }
    const prev = leadInfo.pipeline_stage_id;
    setLeadInfo({ ...leadInfo, pipeline_stage_id: stageId });
    const { error } = await supabase.from("leads").update({ pipeline_stage_id: stageId }).eq("id", leadInfo.id);
    if (error) { setLeadInfo({ ...leadInfo, pipeline_stage_id: prev }); toast.error("Erro ao mudar coluna"); }
    else toast.success("Coluna do CRM atualizada");
  };


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    setReplyingTo(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [conversation?.id]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 30) { toast.error("Máximo de 30 mensagens"); return prev; }
        next.add(id);
      }
      return next;
    });
  };

  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const startForwardFromMessage = (msg: ChatMessage) => {
    setSelectionMode(true);
    setSelectedIds(new Set([msg.id]));
  };

  const openForwardDialog = () => {
    if (selectedIds.size === 0) return;
    setForwardOpen(true);
  };

  const selectedMessages = messages.filter(m => selectedIds.has(m.id));

  const handleOpenContactData = async () => {
    if (!conversation) return;
    const cleanPhone = conversation.contact_phone.replace(/\D/g, "");
    const last8 = cleanPhone.slice(-8);
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("user_id", accountOwnerId)
      .ilike("phone", `%${last8}`)
      .limit(1);
    if (existing && existing.length > 0) {
      navigate("/crm", { state: { openLeadId: existing[0].id } });
    } else {
      toast.info("Contato não está no CRM. Salve para abrir a ficha.");
      setAddContactOpen(true);
    }
  };

  const handleToggleBlock = async () => {
    if (!conversation || !onToggleBlock) return;
    try {
      await onToggleBlock(conversation.id);
      toast.success((conversation as any).is_blocked ? "Contato desbloqueado" : "Contato bloqueado");
    } catch {
      toast.error("Erro ao bloquear contato");
    }
  };

  const handleConfirmDelete = async () => {
    if (!conversation || !onDeleteConversation) return;
    try {
      await onDeleteConversation(conversation.id);
      toast.success("Conversa apagada");
      setConfirmDeleteOpen(false);
    } catch {
      toast.error("Erro ao apagar conversa");
    }
  };

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

  const avatarColor = getChatAvatarColor(conversation.contact_phone);
  const initials = getChatInitials(conversation.contact_name, conversation.contact_phone);
  const hasContactName = !!conversation.contact_name?.trim();

  // Build a map for reply lookups
  const messagesMap = new Map(messages.map(m => [m.id, m]));

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  };
  const handleDragLeave = (e: React.DragEvent) => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length) setDroppedFiles(files);
  };

  return (
    <div
      className="flex-1 flex min-w-0 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 p-4 pointer-events-none">
          <div className="w-full h-full rounded-2xl border-2 border-dashed wa-accent-border wa-accent-surface flex flex-col items-center justify-center gap-3 transition-colors">
            <div className="w-[72px] h-[72px] rounded-2xl bg-white shadow-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="36" height="36" className="wa-accent-text" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
              </svg>
            </div>
            <span className="text-[20px] font-medium wa-accent-text">Solte o arquivo aqui</span>
            <span className="text-[13px] wa-text-muted">Imagens, vídeos ou documentos</span>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-[58px] min-h-[58px] flex items-center gap-[10px] px-[16px] wa-chat-header-bg wa-border-header-bottom shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="wa-icon-button -ml-1 p-1.5 rounded-full hover:bg-white/5 lg:hidden"
              aria-label="Voltar"
            >
              <ArrowLeft size={22} className="wa-chat-header-icon" />
            </button>
          )}
          <div className={cn(
            "w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 text-white text-[15px] font-medium",
            avatarColor
          )}>
            {conversation.contact_profile_pic ? (
              <img src={conversation.contact_profile_pic} className="w-full h-full rounded-full object-cover" alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-normal wa-chat-header-text truncate leading-[21px]">
                {conversation.contact_name || formatPhoneDisplay(conversation.contact_phone)}
              </h3>
              {!hasContactName && onSaveContactName && (
                <button
                  onClick={() => setAddContactOpen(true)}
                  title="Salvar contato no CRM"
                  className="shrink-0 inline-flex items-center justify-center w-[26px] h-[26px] rounded-full wa-accent-surface wa-accent-text transition-colors"
                >
                  <UserPlus size={14} />
                </button>
              )}
            </div>
            <p className="text-[13px] wa-chat-header-sub truncate leading-[18px]">
              {conversation.last_message_at
                ? `Último contato: ${format(parseISO(conversation.last_message_at), "dd/MM/yyyy 'às' HH:mm")}`
                : formatPhoneDisplay(conversation.contact_phone)
              }
            </p>
          </div>
          <div className="flex items-center gap-[10px]">
            {/* CRM stage selector */}
            {pipelineStages.length > 0 && (() => {
              const currentStage = pipelineStages.find(s => s.id === leadInfo?.pipeline_stage_id);
              const stageColor = currentStage?.color || "#128c7e";
              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="hidden md:flex items-center gap-1.5 h-[30px] pl-2 pr-2.5 rounded-full border transition-colors hover:opacity-90"
                      style={{
                        borderColor: leadInfo ? `${stageColor}55` : undefined,
                        backgroundColor: leadInfo ? `${stageColor}1a` : "transparent",
                      }}
                      title={leadInfo ? `Coluna no CRM: ${currentStage?.name || "—"}` : "Salve o contato para definir uma coluna"}
                    >
                      <span
                        className="w-[8px] h-[8px] rounded-full shrink-0"
                        style={{ backgroundColor: leadInfo ? stageColor : "#9ca3af" }}
                      />
                      <span
                        className="text-[12px] font-medium max-w-[140px] truncate"
                        style={{ color: leadInfo ? stageColor : undefined }}
                      >
                        {leadInfo ? (currentStage?.name || "Sem coluna") : "Não está no CRM"}
                      </span>
                      <ChevronDown size={12} style={{ color: leadInfo ? stageColor : undefined }} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-1.5 bg-popover">
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Mover no CRM
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {pipelineStages.map(s => {
                        const selected = s.id === leadInfo?.pipeline_stage_id;
                        const color = s.color || "#128c7e";
                        return (
                          <button
                            key={s.id}
                            onClick={() => void handleChangeStage(s.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-md transition-colors",
                              selected ? "bg-muted" : "hover:bg-muted"
                            )}
                          >
                            <span className="w-[10px] h-[10px] rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="flex-1 text-left truncate">{s.name}</span>
                            {selected && <Check size={14} className="wa-accent-text" />}
                          </button>
                        );
                      })}
                    </div>
                    {!leadInfo && (
                      <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                        Salve o contato no CRM para habilitar a mudança de coluna.
                      </p>
                    )}
                  </PopoverContent>
                </Popover>
              );
            })()}
            {canChangeResponsible && onTransferResponsible && (() => {
              const respMember = members.find(m => m.user_id === conversation.responsible_user_id);
              const respLabel = respMember?.name?.split(" ")[0] || respMember?.email?.split("@")[0] || null;
              const respColor = getChatAvatarColor(respMember?.user_id || "none");
              const respInitials = respMember
                ? getChatInitials(respMember.name, respMember.email || "")
                : null;
              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-2 h-[34px] pl-1 pr-3 rounded-full border transition-colors",
                        conversation.responsible_user_id
                          ? "wa-accent-border-soft wa-accent-bg-soft wa-accent-hover-bg-softer"
                          : "border-white/10 hover:border-white/20 bg-transparent"
                      )}
                      title={respLabel ? `Responsável: ${respMember?.name || respMember?.email}` : "Atribuir responsável"}
                    >
                      {respInitials ? (
                        <span className={cn("w-[24px] h-[24px] rounded-full flex items-center justify-center text-white text-[10px] font-medium", respColor)}>
                          {respInitials}
                        </span>
                      ) : (
                        <span className="w-[24px] h-[24px] rounded-full bg-white/5 flex items-center justify-center">
                          <UserCog size={13} className="wa-chat-header-icon" />
                        </span>
                      )}
                      <span className="text-[12px] font-medium wa-chat-header-text max-w-[110px] truncate">
                        {respLabel || "Atribuir"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-1.5 bg-popover">
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Responsável pela conversa
                    </div>
                    <button
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground"
                      onClick={async () => {
                        try { await onTransferResponsible(conversation.id, null); toast.success("Sem responsável definido"); }
                        catch { toast.error("Erro ao transferir"); }
                      }}
                    >
                      <span className="w-[28px] h-[28px] rounded-full bg-muted flex items-center justify-center">
                        <X size={14} />
                      </span>
                      Sem responsável
                    </button>
                    <div className="max-h-56 overflow-y-auto mt-0.5">
                      {members.map((m) => {
                        const c = getChatAvatarColor(m.user_id);
                        const i = getChatInitials(m.name, m.email || "");
                        const selected = m.user_id === conversation.responsible_user_id;
                        return (
                          <button
                            key={m.user_id}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors",
                              selected ? "wa-accent-bg-soft text-foreground" : "hover:bg-muted"
                            )}
                            onClick={async () => {
                              try { await onTransferResponsible(conversation.id, m.user_id); toast.success("Conversa transferida"); }
                              catch { toast.error("Erro ao transferir"); }
                            }}
                          >
                            <span className={cn("w-[28px] h-[28px] rounded-full flex items-center justify-center text-white text-[11px] font-medium", c)}>
                              {i}
                            </span>
                            <span className="flex-1 text-left truncate">
                              {m.name || m.email || m.user_id.slice(0, 8)}
                              {m.user_id === currentUserId && <span className="text-[10px] text-muted-foreground ml-1">(você)</span>}
                            </span>
                            {selected && <span className="wa-accent-text text-[10px] font-semibold">●</span>}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })()}
            <button className="wa-icon-button p-1" onClick={() => setShowSearch(!showSearch)}>
              <Search size={20} className="wa-chat-header-icon" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>

                <button className="wa-icon-button p-1">
                  <MoreVertical size={20} className="wa-chat-header-icon" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="wa-dropdown-menu border wa-border min-w-[220px] rounded-xl shadow-2xl py-1.5 overflow-hidden">
                <DropdownMenuItem
                  onClick={() => void handleOpenContactData()}
                  className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                >
                  <User size={15} /> Dados do contato
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowSearch(true)}
                  className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                >
                  <Search size={15} /> Pesquisar mensagens
                </DropdownMenuItem>
                <div className="my-1 mx-3 border-t wa-border-light" />
                <DropdownMenuItem
                  onClick={() => void handleToggleBlock()}
                  className="wa-dropdown-item flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                >
                  <Ban size={15} /> {(conversation as any).is_blocked ? "Desbloquear" : "Bloquear"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="wa-dropdown-item-destructive flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-lg text-[13px] cursor-pointer"
                >
                  <Trash2 size={15} /> Apagar conversa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages area + input — background extends fully */}
        <div
          className="flex-1 flex flex-col min-h-0 wa-chat-bg relative"
          style={{ ['--wa-chat-bg-pattern' as any]: `url(${waChatBgAsset.url})` }}
        >
          <div className="wa-chat-glow" />

          <div className="flex-1 overflow-y-auto wa-scrollbar relative z-[1]" ref={scrollContainerRef}>
            <div className="px-3 sm:px-6 lg:px-[63px] py-[4px] min-h-full flex flex-col justify-end">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 rounded-full border-[3px] border-[#128c7e]/20 border-t-[#128c7e] animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showDate = !prevMsg || !isSameDay(parseISO(msg.created_at), parseISO(prevMsg.created_at));
                    const isOutbound = msg.direction === "outbound";
                    const isSameAuthorAsPrev = prevMsg && prevMsg.direction === msg.direction && !showDate;
                    const showTail = !isSameAuthorAsPrev;
                    const replyMsg = msg.reply_to_message_id ? messagesMap.get(msg.reply_to_message_id) : undefined;

                    const isSelected = selectedIds.has(msg.id);
                    const rowClickable = selectionMode;
                    return (
                      <div key={msg.id}>
                        {showDate && <DateDivider date={parseISO(msg.created_at)} />}
                        <div
                          className={cn(
                            "group/msg-row flex items-center transition-colors rounded-md",
                            isSameAuthorAsPrev ? "mt-[2px]" : "mt-[10px]",
                            selectionMode && "px-2 -mx-2 hover:bg-foreground/5 cursor-pointer",
                            selectionMode && isSelected && "wa-accent-bg-soft"
                          )}
                          onClick={rowClickable ? () => toggleSelect(msg.id) : undefined}
                        >
                          {/* Checkbox on the left during selection */}
                          {selectionMode && (
                            <div className="shrink-0 mr-2 w-[22px] h-[22px] flex items-center justify-center">
                              <span className={cn(
                                "w-[20px] h-[20px] rounded-[5px] border-2 flex items-center justify-center transition-colors",
                                isSelected ? "wa-accent-bg wa-accent-border" : "border-foreground/30"
                              )}>
                                {isSelected && <Check size={14} className="text-white" />}
                              </span>
                            </div>
                          )}

                          {/* Bubble container — actions live INSIDE at top-right */}
                          <div className={cn(
                            "flex-1 flex items-start gap-1",
                            isOutbound ? "justify-end" : "justify-start",
                            selectionMode && !isOutbound && "pl-2"
                          )}>
                            <div className={cn(
                              "relative max-w-[65%]",
                              isOutbound ? "mr-[8px]" : "ml-[8px]"
                            )}>
                              {showTail && (isOutbound ? <OutboundTail /> : <InboundTail />)}
                              <div className={cn(
                                "inline-block shadow-[0_1px_0.5px_rgba(11,20,26,.13)] relative overflow-hidden",
                                isOutbound ? "wa-bubble-out rounded-[7.5px]" : "wa-bubble-in rounded-[7.5px]",
                                showTail && isOutbound && "!rounded-tr-none",
                                showTail && !isOutbound && "!rounded-tl-none"
                              )}>
                                {!selectionMode && (
                                  <MessageActions
                                    msg={msg}
                                    isOutbound={isOutbound}
                                    onReply={() => setReplyingTo(msg)}
                                    onForward={() => startForwardFromMessage(msg)}
                                  />
                                )}
                                {replyMsg && <ReplyQuote replyMsg={replyMsg} />}
                                {msg.message_type === "audio" && (
                                  <div className="p-[3px]">
                                    <WhatsAppAudio
                                      src={msg.media_url || ""}
                                      isOutbound={isOutbound}
                                      avatarUrl={!isOutbound ? conversation.contact_profile_pic : null}
                                      avatarInitials={!isOutbound ? initials : "EU"}
                                      avatarColorClass={!isOutbound ? avatarColor : "bg-[#128c7e]"}
                                    />
                                  </div>
                                )}
                                {msg.message_type !== "text" && msg.message_type !== "audio" && (
                                  <div className="p-[3px]"><MediaPreview msg={msg} /></div>
                                )}
                                {msg.content && msg.message_type === "text" && (
                                  <div className="px-[9px] pt-[6px] pb-[8px] pr-[36px]">
                                    <span className="text-[14.2px] wa-text-primary leading-[19px] whitespace-pre-wrap break-words">
                                      {msg.content}
                                    </span>
                                  </div>
                                )}
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
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} className="h-[2px]" />
                </>
              )}
            </div>
          </div>

          {/* Input — inside background container so pattern extends behind it */}
          <div className="relative z-10 shrink-0">
            {selectionMode ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 wa-input-field border-t wa-border-light">
                <button
                  onClick={exitSelection}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
                >
                  Cancelar
                </button>
                <span className="text-sm font-medium wa-text-primary">
                  {selectedIds.size} {selectedIds.size === 1 ? "selecionada" : "selecionadas"}
                </span>
                <button
                  onClick={openForwardDialog}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-lg wa-accent-bg text-white disabled:opacity-40 transition-colors"
                >
                  <Forward size={16} /> Encaminhar
                </button>
              </div>
            ) : (() => {
              const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
              const isWindowExpired = lastInbound
                ? differenceInHours(new Date(), parseISO(lastInbound.created_at)) >= 24
                : false;

              if (isWindowExpired && onReopenConversation) {
                  return (
                    <ExpiredWindowBanner
                      contactName={conversation.contact_name}
                      contactPhone={conversation.contact_phone}
                      onReopenConversation={onReopenConversation}
                      fetchTemplates={fetchTemplates}
                    />
                  );
              }
              return (
                <ChatInput
                  onSendMessage={onSendMessage}
                  onSendMedia={onSendMedia}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  externalFiles={droppedFiles}
                  onExternalConsumed={() => setDroppedFiles([])}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Search panel */}
      {showSearch && (
        <SearchMessagesBar messages={messages} onClose={() => setShowSearch(false)} />
      )}

      {/* Add / Save contact to CRM */}
      {onSaveContactName && (
        <AddContactDialog
          open={addContactOpen}
          onOpenChange={setAddContactOpen}
          phone={conversation.contact_phone}
          defaultName={conversation.contact_name}
          onSave={async (name) => {
            try {
              await onSaveContactName(conversation.id, name);
              toast.success("Contato salvo no CRM");
            } catch {
              toast.error("Erro ao salvar contato");
            }
          }}
        />
      )}

      {/* Confirm delete */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as mensagens desta conversa serão removidas permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forward dialog */}
      {onForwardMessages && (
        <ForwardDialog
          open={forwardOpen}
          onOpenChange={(v) => { setForwardOpen(v); if (!v) exitSelection(); }}
          messages={selectedMessages}
          conversations={conversations}
          fetchTemplates={fetchTemplates}
          onForward={onForwardMessages}
        />
      )}
    </div>
  );
}
