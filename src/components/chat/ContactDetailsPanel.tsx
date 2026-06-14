import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X, Search as SearchIcon, Ban, Trash2, Image as ImageIcon, FileText,
  Phone, Mail, MapPin, Globe, Building2, Tag, DollarSign, Clock, StickyNote,
  ExternalLink, Eraser, ChevronRight, User, Plus, Copy, Check, Play, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getChatAvatarColor, getChatInitials } from "@/lib/chatAvatar";
import { ImageLightbox } from "./ImageLightbox";
import { RegisterSaleDialog } from "@/components/crm/RegisterSaleDialog";
import type { ChatConversation, ChatMessage } from "@/hooks/useChat";

type Props = {
  open: boolean;
  onClose: () => void;
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  accountOwnerId: string | null;
  onOpenSearch: () => void;
  onToggleBlock?: (conversationId: string) => Promise<any> | void;
  onDeleteConversation?: (conversationId: string) => Promise<any> | void;
  onSaveContact: () => void;
};

type Lead = any;

const PERIODS: Array<{ label: string; days: number | null }> = [
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 60 dias", days: 60 },
  { label: "Últimos 90 dias", days: 90 },
  { label: "Toda a conversa", days: null },
];

// Minimal DDI -> country map (PT-BR labels for common ones)
const COUNTRY_BY_DDI: Record<string, string> = {
  "1": "EUA/Canadá", "44": "Reino Unido", "33": "França", "34": "Espanha",
  "39": "Itália", "49": "Alemanha", "351": "Portugal", "52": "México",
  "54": "Argentina", "56": "Chile", "57": "Colômbia", "58": "Venezuela",
  "591": "Bolívia", "595": "Paraguai", "598": "Uruguai", "593": "Equador",
  "51": "Peru", "55": "Brasil", "81": "Japão", "82": "Coreia do Sul",
  "86": "China", "91": "Índia", "61": "Austrália", "353": "Irlanda",
  "31": "Holanda", "41": "Suíça", "32": "Bélgica", "43": "Áustria",
  "46": "Suécia", "47": "Noruega", "45": "Dinamarca", "358": "Finlândia",
  "972": "Israel", "971": "Emirados Árabes", "966": "Arábia Saudita",
  "27": "África do Sul", "20": "Egito", "212": "Marrocos", "351": "Portugal",
};

function detectDDI(digits: string): { ddi: string; rest: string; country: string } {
  for (const len of [3, 2, 1]) {
    const candidate = digits.slice(0, len);
    if (COUNTRY_BY_DDI[candidate]) {
      return { ddi: candidate, rest: digits.slice(len), country: COUNTRY_BY_DDI[candidate] };
    }
  }
  // fallback: assume BR
  if (digits.startsWith("55")) return { ddi: "55", rest: digits.slice(2), country: "Brasil" };
  return { ddi: digits.slice(0, 2), rest: digits.slice(2), country: "Internacional" };
}

function formatPhonePretty(raw: string): { display: string; country: string } {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return { display: raw || "—", country: "" };
  const { ddi, rest, country } = detectDDI(digits);

  if (ddi === "55" && (rest.length === 10 || rest.length === 11)) {
    const dd = rest.slice(0, 2);
    const sub = rest.slice(2);
    if (sub.length === 9) return { display: `+55 (${dd}) ${sub[0]} ${sub.slice(1, 5)}-${sub.slice(5)}`, country };
    return { display: `+55 (${dd}) ${sub.slice(0, 4)}-${sub.slice(4)}`, country };
  }
  // Generic international grouping
  const grouped = rest.replace(/(\d{4})(?=\d)/g, "$1 ");
  return { display: `+${ddi} ${grouped}`.trim(), country };
}

function fmtCurrency(v?: number | null) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return "—"; }
}

export function ContactDetailsPanel({
  open, onClose, conversation, messages, accountOwnerId,
  onOpenSearch, onToggleBlock, onDeleteConversation, onSaveContact,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearDays, setClearDays] = useState<number | null>(30);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const initials = useMemo(
    () => getChatInitials(conversation?.contact_name, conversation?.contact_phone || ""),
    [conversation],
  );
  const avatarColor = useMemo(
    () => getChatAvatarColor(conversation?.contact_phone || ""),
    [conversation],
  );

  const reloadLeadData = async (leadId: string) => {
    const [n, a, d] = await Promise.all([
      supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
      supabase.from("lead_activities").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
      supabase.from("lead_deals").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    ]);
    setNotes(n.data || []);
    setActivities(a.data || []);
    setDeals(d.data || []);
  };

  // Load lead by phone
  useEffect(() => {
    if (!open || !conversation || !accountOwnerId) return;
    setLoading(true); setLead(null); setNotes([]); setActivities([]); setDeals([]);
    const last8 = conversation.contact_phone.replace(/\D/g, "").slice(-8);
    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", accountOwnerId)
        .ilike("phone", `%${last8}`)
        .limit(1)
        .maybeSingle();
      setLead(data);
      if (data?.id) await reloadLeadData(data.id);
      setLoading(false);
    })();
  }, [open, conversation, accountOwnerId]);

  const mediaMessages = useMemo(
    () => messages.filter((m) => ["image", "video"].includes(m.message_type) && !!m.media_url),
    [messages],
  );
  const imageMessages = useMemo(
    () => messages.filter((m) => m.message_type === "image" && !!m.media_url),
    [messages],
  );
  const docMessages = useMemo(
    () => messages.filter((m) => m.message_type === "document" && !!m.media_url),
    [messages],
  );

  const totalSales = useMemo(
    () => (deals || []).reduce((s, d) => s + Number(d.value || 0), 0),
    [deals],
  );

  const phoneFmt = useMemo(
    () => formatPhonePretty(conversation?.contact_phone || ""),
    [conversation],
  );

  const handleCopyPhone = async () => {
    if (!conversation) return;
    try {
      await navigator.clipboard.writeText(phoneFmt.display);
      setPhoneCopied(true);
      toast.success("Telefone copiado");
      setTimeout(() => setPhoneCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleClearByPeriod = async () => {
    if (!conversation) return;
    const cutoff =
      clearDays === null
        ? null
        : new Date(Date.now() - clearDays * 24 * 60 * 60 * 1000).toISOString();
    try {
      let q = supabase.from("chat_messages").delete().eq("conversation_id", conversation.id);
      if (cutoff) q = q.lt("created_at", cutoff);
      const { error } = await q;
      if (error) throw error;
      toast.success("Mensagens removidas");
      setClearOpen(false);
    } catch (e: any) {
      toast.error("Erro ao limpar: " + (e?.message || ""));
    }
  };

  const handleBlock = async () => {
    if (!conversation || !onToggleBlock) return;
    try {
      await onToggleBlock(conversation.id);
      toast.success((conversation as any).is_blocked ? "Contato desbloqueado" : "Contato bloqueado");
    } catch { toast.error("Erro ao bloquear"); }
  };

  const handleDelete = async () => {
    if (!conversation || !onDeleteConversation) return;
    try {
      await onDeleteConversation(conversation.id);
      toast.success("Conversa apagada");
      setConfirmDeleteOpen(false);
      onClose();
    } catch { toast.error("Erro ao apagar"); }
  };

  const handleAddNote = async () => {
    const content = noteDraft.trim();
    if (!content) return;
    if (!lead?.id) {
      toast.error("Salve o contato no CRM antes de adicionar notas");
      return;
    }
    if (!user || !accountOwnerId) return;
    setSavingNote(true);
    try {
      const { data, error } = await supabase
        .from("lead_notes")
        .insert({
          lead_id: lead.id,
          user_id: user.id,
          owner_user_id: accountOwnerId,
          content,
        })
        .select()
        .single();
      if (error) throw error;
      setNotes((prev) => [data, ...prev]);
      setNoteDraft("");
      toast.success("Nota adicionada");
    } catch (e: any) {
      toast.error("Erro ao salvar nota: " + (e?.message || ""));
    } finally {
      setSavingNote(false);
    }
  };

  const handleRequireLead = () => {
    toast.error("Salve o contato no CRM primeiro");
    onSaveContact();
  };

  if (!conversation) return null;

  return (
    <>
      <aside
        className={cn(
          "absolute top-0 right-0 h-full w-full sm:w-[400px] bg-card border-l border-border z-30",
          "flex flex-col shadow-2xl transform transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full pointer-events-none",
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="h-[58px] flex items-center gap-3 px-4 border-b border-border shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted" aria-label="Fechar">
            <X size={20} />
          </button>
          <h3 className="text-[15px] font-semibold text-foreground">Dados do contato</h3>
        </div>

        <div className="flex-1 overflow-y-auto wa-scrollbar">
          {/* Identity */}
          <div className="flex flex-col items-center gap-3 px-6 py-6 border-b border-border">
            <div className={cn(
              "w-[110px] h-[110px] rounded-full flex items-center justify-center text-white text-3xl font-medium",
              avatarColor,
            )}>
              {conversation.contact_profile_pic ? (
                <img src={conversation.contact_profile_pic} className="w-full h-full rounded-full object-cover" alt="" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="text-center w-full">
              <h2 className="text-lg font-semibold text-foreground truncate">
                {conversation.contact_name || "Sem nome"}
              </h2>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="text-sm text-muted-foreground tabular-nums">{phoneFmt.display}</span>
                <button
                  onClick={handleCopyPhone}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                  aria-label="Copiar telefone"
                  title="Copiar telefone"
                >
                  {phoneCopied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                </button>
              </div>
              {phoneFmt.country && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{phoneFmt.country}</p>
              )}
            </div>
            {!lead && !loading && (
              <Button size="sm" variant="outline" onClick={onSaveContact} className="gap-2">
                <User size={14} /> Salvar no CRM
              </Button>
            )}
            {lead && (
              <Button size="sm" variant="outline" onClick={() => navigate("/crm", { state: { openLeadId: lead.id } })} className="gap-2">
                <ExternalLink size={14} /> Abrir no CRM
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="geral" className="px-3 pt-3">
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
              <TabsTrigger value="vendas" className="text-xs">Vendas</TabsTrigger>
              <TabsTrigger value="notas" className="text-xs">Notas</TabsTrigger>
              <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
            </TabsList>

            {/* GERAL */}
            <TabsContent value="geral" className="space-y-4 py-4">
              {/* Search on top — not page-specific */}
              <button
                onClick={onOpenSearch}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-background/50 hover:bg-muted/60 transition text-left"
              >
                <SearchIcon size={16} className="text-primary" />
                <span className="flex-1 text-sm text-foreground">Pesquisar na conversa</span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>

              <section className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Dados do contato
                </div>
                <Row icon={Phone} label="Telefone" value={phoneFmt.display} />
                {lead?.email && <Row icon={Mail} label="E-mail" value={lead.email} />}
                {lead?.company_name && <Row icon={Building2} label="Empresa" value={lead.company_name} />}
                {lead?.city && <Row icon={MapPin} label="Cidade" value={`${lead.city}${lead.region ? ` - ${lead.region}` : ""}`} />}
                {lead?.website && <Row icon={Globe} label="Site" value={lead.website} link />}
                {lead?.category && <Row icon={Tag} label="Categoria" value={lead.category} />}
              </section>

              <section className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Resumo da conversa
                </div>
                <Row icon={Clock} label="Última mensagem" value={fmtDate(conversation.last_message_at)} />
                <Row icon={FileText} label="Total de mensagens" value={String(messages.length)} />
                <Row icon={ImageIcon} label="Mídias trocadas" value={String(mediaMessages.length + docMessages.length)} />
              </section>

              {/* Media preview (below summary) */}
              <section className="rounded-xl border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Imagens & vídeos
                  </div>
                  <span className="text-[11px] text-muted-foreground">{mediaMessages.length}</span>
                </div>
                {mediaMessages.length === 0 ? (
                  <div className="py-6 flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon size={22} className="opacity-40" />
                    <span className="text-[11px]">Nenhuma mídia trocada</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {mediaMessages.slice(0, 7).map((m) => {
                      const isImage = m.message_type === "image";
                      const firstImageId = imageMessages[0]?.id ?? null;
                      const targetId = isImage ? m.id : firstImageId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            if (isImage) {
                              setLightboxId(m.id);
                              onClose();
                            } else {
                              window.open(m.media_url!, "_blank", "noopener,noreferrer");
                            }
                          }}
                          className="relative aspect-square rounded-md overflow-hidden bg-muted group"
                          title={isImage ? "Abrir imagem" : "Abrir vídeo"}
                        >
                          {isImage ? (
                            <img src={m.media_url!} className="w-full h-full object-cover" alt="" loading="lazy" />
                          ) : (
                            <>
                              <video src={m.media_url!} className="w-full h-full object-cover" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play size={16} className="text-white fill-white" />
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })}
                    {mediaMessages.length > 7 && imageMessages.length > 0 && (
                      <button
                        onClick={() => { setLightboxId(imageMessages[0].id); onClose(); }}
                        className="aspect-square rounded-md bg-muted hover:bg-muted/70 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition"
                        title="Ver todas"
                      >
                        <Plus size={18} />
                        <span className="text-[10px] mt-0.5">+{mediaMessages.length - 7}</span>
                      </button>
                    )}
                  </div>
                )}

                {docMessages.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Documentos ({docMessages.length})
                    </div>
                    {docMessages.slice(0, 5).map((m) => (
                      <a key={m.id} href={m.media_url!} target="_blank" rel="noreferrer"
                         className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-2 hover:bg-muted/50 transition">
                        <FileText size={14} className="text-primary shrink-0" />
                        <span className="text-xs text-foreground truncate flex-1">{m.media_filename || "documento"}</span>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* Quick actions */}
              <section className="rounded-xl border border-border bg-background/50 overflow-hidden">
                <ActionRow icon={Eraser} label="Limpar conversa" onClick={() => setClearOpen(true)} />
                <ActionRow
                  icon={Ban}
                  label={(conversation as any).is_blocked ? "Desbloquear contato" : "Bloquear contato"}
                  onClick={handleBlock}
                />
                <ActionRow
                  icon={Trash2}
                  label="Apagar conversa"
                  destructive
                  onClick={() => setConfirmDeleteOpen(true)}
                />
              </section>
            </TabsContent>

            {/* VENDAS */}
            <TabsContent value="vendas" className="space-y-3 py-4">
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total de vendas</span>
                  <span className="text-base font-semibold text-foreground">{fmtCurrency(totalSales)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Negócios</span>
                  <span className="text-xs text-foreground">{deals.length}</span>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => (lead?.id ? setSaleDialogOpen(true) : handleRequireLead())}
              >
                <Plus size={14} /> Registrar nova venda
              </Button>

              {deals.length === 0 && <EmptyState icon={DollarSign} text="Nenhuma venda registrada" />}
              {deals.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm text-foreground truncate">{d.title || d.sale_type || "Venda"}</div>
                    <div className="text-sm font-semibold text-primary shrink-0">{fmtCurrency(d.value)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                    <span>{fmtDate(d.closed_at || d.created_at)}</span>
                    {d.status && <span className="px-1.5 py-0.5 rounded bg-muted">{d.status}</span>}
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{d.description}</p>}
                </div>
              ))}
            </TabsContent>

            {/* NOTAS */}
            <TabsContent value="notas" className="space-y-3 py-4">
              <div className="rounded-xl border border-border bg-background/50 p-2.5 space-y-2">
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder={lead?.id ? "Escreva uma nota sobre este contato..." : "Salve o contato no CRM para adicionar notas"}
                  rows={3}
                  disabled={!lead?.id || savingNote}
                  className="text-sm resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!noteDraft.trim() || !lead?.id || savingNote}
                    className="gap-1.5"
                  >
                    {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Adicionar nota
                  </Button>
                </div>
              </div>
              {notes.length === 0 && <EmptyState icon={StickyNote} text="Nenhuma nota cadastrada" />}
              {notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-border bg-background/50 p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{n.content}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{fmtDate(n.created_at)}</p>
                </div>
              ))}
            </TabsContent>

            {/* HISTÓRICO */}
            <TabsContent value="historico" className="space-y-2 py-4">
              {activities.length === 0 && <EmptyState icon={Clock} text="Sem histórico" />}
              {activities.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{a.activity_type}</span>
                    <span className="text-[11px] text-muted-foreground">{fmtDate(a.created_at)}</span>
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="h-6" />
        </div>
      </aside>

      {/* Lightbox for media */}
      <ImageLightbox
        open={!!lightboxId}
        images={imageMessages}
        initialMessageId={lightboxId}
        contactName={conversation.contact_name || phoneFmt.display}
        contactSubtitle={conversation.last_message_at ? `Último contato: ${fmtDate(conversation.last_message_at)}` : undefined}
        onClose={() => setLightboxId(null)}
      />

      {/* Register Sale */}
      {lead?.id && (
        <RegisterSaleDialog
          open={saleDialogOpen}
          onOpenChange={setSaleDialogOpen}
          leadId={lead.id}
          leadName={lead.contact_name || lead.company_name || conversation.contact_name || undefined}
          onCreated={() => reloadLeadData(lead.id)}
        />
      )}

      {/* Clear period dialog */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha o período. As mensagens serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2">
            {PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => setClearDays(p.days)}
                className={cn(
                  "rounded-lg border p-3 text-sm text-left transition",
                  clearDays === p.days
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:border-primary/40 text-muted-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearByPeriod}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as mensagens serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Row({ icon: Icon, label, value, link }: { icon: any; label: string; value: string; link?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <Icon size={15} className="text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        {link ? (
          <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer"
             className="text-sm text-primary truncate block hover:underline">{value}</a>
        ) : (
          <div className="text-sm text-foreground truncate">{value}</div>
        )}
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, label, onClick, destructive }: { icon: any; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-muted/60 border-b border-border last:border-0 text-left",
        destructive ? "text-destructive" : "text-foreground",
      )}
    >
      <Icon size={16} className={destructive ? "text-destructive" : "text-muted-foreground"} />
      <span className="flex-1">{label}</span>
      <ChevronRight size={14} className="text-muted-foreground" />
    </button>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
      <Icon size={28} className="opacity-40" />
      <span className="text-xs">{text}</span>
    </div>
  );
}
