import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Target, PhoneCall, MessageSquare, ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getChatAvatarColor, getChatInitials } from "@/lib/chatAvatar";
import { toast } from "sonner";
import { differenceInHours, parseISO } from "date-fns";
import type { ChatConversation, ChatMessage } from "@/hooks/useChat";

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  conversations: ChatConversation[];
  onForward: (targetPhone: string, targetName: string | undefined, msgs: ChatMessage[], templateName?: string) => Promise<{ requiresTemplate?: boolean }>;
  fetchTemplates?: () => Promise<any[]>;
}

type Tab = "recentes" | "crm" | "oportunidades" | "novo";

const phoneKey = (p: string) => p.replace(/\D/g, "").slice(-8);
const formatPhone = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) {
    const ddd = d.slice(2, 4);
    const n = d.slice(4);
    return n.length === 9 ? `(${ddd}) ${n.slice(0, 5)}-${n.slice(5)}` : `(${ddd}) ${n.slice(0, 4)}-${n.slice(4)}`;
  }
  return `+${d}`;
};

export function ForwardDialog({ open, onOpenChange, messages, conversations, onForward, fetchTemplates }: ForwardDialogProps) {
  const { accountOwnerId } = useAuth();
  const [tab, setTab] = useState<Tab>("recentes");
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [sending, setSending] = useState(false);

  // Template phase
  const [phase, setPhase] = useState<"pick" | "template">("pick");
  const [pendingTarget, setPendingTarget] = useState<{ phone: string; name?: string } | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tplSearch, setTplSearch] = useState("");
  const [loadingTpl, setLoadingTpl] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("pick"); setPendingTarget(null); setSearch(""); setTplSearch("");
    if (tab === "recentes" || tab === "novo") return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("leads")
        .select("id, contact_name, company_name, phone, origin")
        .eq("owner_user_id", accountOwnerId)
        .order("updated_at", { ascending: false })
        .limit(500);
      setLeads(data || []);
      setLoading(false);
    })();
  }, [open, tab, accountOwnerId]);

  const list = useMemo(() => {
    if (tab === "recentes") {
      return conversations.map(c => ({
        id: c.id, phone: c.contact_phone,
        name: c.contact_name, company: null, pic: c.contact_profile_pic,
      }));
    }
    const isOp = (o: string | null) => ["oportunidades", "prospeccao"].includes(o || "");
    return leads
      .filter(l => tab === "crm" ? !isOp(l.origin) : isOp(l.origin))
      .map(l => ({ id: l.id, phone: l.phone, name: l.contact_name, company: l.company_name, pic: null }));
  }, [tab, conversations, leads]);

  const filtered = search
    ? list.filter(x =>
        (x.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (x.company || "").toLowerCase().includes(search.toLowerCase()) ||
        x.phone.includes(search))
    : list;

  const doForward = async (phone: string, name?: string, templateName?: string) => {
    setSending(true);
    try {
      // Check 24h window for this target
      const targetKey = phoneKey(phone);
      const conv = conversations.find(c => phoneKey(c.contact_phone) === targetKey);
      const lastInboundAt = conv?.last_message_direction === "inbound" ? conv?.last_message_at : null;
      const windowOpen = lastInboundAt ? differenceInHours(new Date(), parseISO(lastInboundAt)) < 24 : false;

      if (!windowOpen && !templateName) {
        // Need template
        setPendingTarget({ phone, name });
        setPhase("template");
        if (fetchTemplates) {
          setLoadingTpl(true);
          const t = await fetchTemplates();
          setTemplates(t || []);
          setLoadingTpl(false);
        }
        setSending(false);
        return;
      }

      const res = await onForward(phone, name, messages, templateName);
      if (res?.requiresTemplate) {
        setPendingTarget({ phone, name });
        setPhase("template");
        if (fetchTemplates) {
          setLoadingTpl(true);
          const t = await fetchTemplates();
          setTemplates(t || []);
          setLoadingTpl(false);
        }
      } else {
        toast.success(`${messages.length} mensagem(ns) encaminhada(s)`);
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error("Erro ao encaminhar", { description: e?.message });
    } finally {
      setSending(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "recentes", label: "Recentes", icon: MessageSquare },
    { id: "crm", label: "CRM", icon: Search },
    { id: "oportunidades", label: "Oportunidades", icon: Target },
    { id: "novo", label: "Novo número", icon: PhoneCall },
  ];

  const filteredTpls = templates.filter(t => {
    const q = tplSearch.toLowerCase();
    if (!q) return true;
    if ((t.name || "").toLowerCase().includes(q)) return true;
    return (t.components || []).some((c: any) =>
      typeof c?.text === "string" && c.text.toLowerCase().includes(q));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:hidden">
        {phase === "pick" ? (
          <>
            <DialogHeader className="px-5 pt-5 pb-3 flex-row items-center justify-between">
              <DialogTitle className="text-lg font-medium">
                Encaminhar {messages.length > 1 ? `${messages.length} mensagens` : "mensagem"} para
              </DialogTitle>
            </DialogHeader>

            <div className="flex border-b px-2 overflow-x-auto">
              {tabs.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                      tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon size={14} />{t.label}
                  </button>
                );
              })}
            </div>

            {tab === "novo" ? (
              <div className="p-4 space-y-3">
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Ex.: 5511999999999" className="h-10" />
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome (opcional)" className="h-10" />
                <Button
                  disabled={newPhone.replace(/\D/g, "").length < 10 || sending}
                  onClick={() => doForward(newPhone.replace(/\D/g, ""), newName.trim() || undefined)}
                  className="w-full h-10"
                >Encaminhar</Button>
              </div>
            ) : (
              <>
                <div className="px-4 py-3">
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar nome ou número" className="h-9 rounded-full" />
                </div>
                <div className="max-h-[340px] overflow-y-auto pb-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="text-center py-10 text-sm text-muted-foreground">Nenhum contato encontrado</p>
                  ) : (
                    filtered.map(x => (
                      <button
                        key={x.id}
                        disabled={sending}
                        onClick={() => doForward(x.phone, x.name || x.company || undefined)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                      >
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-medium overflow-hidden", getChatAvatarColor(x.phone))}>
                          {x.pic ? <img src={x.pic} alt="" className="w-full h-full object-cover" /> : <span>{getChatInitials(x.name || x.company, x.phone)}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{x.name || x.company || formatPhone(x.phone)}</p>
                          <p className="text-xs text-muted-foreground truncate">{formatPhone(x.phone)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <DialogHeader className="px-5 pt-5 pb-3 flex-row items-center gap-2">
              <button onClick={() => setPhase("pick")} className="p-1 rounded hover:bg-muted">
                <ArrowLeft size={18} />
              </button>
              <DialogTitle className="text-lg font-medium">
                Selecionar template
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-3">
              <p className="text-xs text-muted-foreground mb-2">
                A janela de 24h está fechada para {pendingTarget?.name || formatPhone(pendingTarget?.phone || "")}. Escolha um template aprovado para iniciar.
              </p>
              <Input value={tplSearch} onChange={e => setTplSearch(e.target.value)} placeholder="Pesquisar título ou conteúdo" className="h-9 rounded-full" />
            </div>
            <div className="max-h-[340px] overflow-y-auto px-2 pb-3">
              {loadingTpl ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
              ) : filteredTpls.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground">Nenhum template encontrado</p>
              ) : (
                filteredTpls.map(t => {
                  const body = (t.components || []).find((c: any) => c.type === "BODY")?.text || "";
                  return (
                    <button
                      key={t.id}
                      disabled={sending}
                      onClick={() => pendingTarget && doForward(pendingTarget.phone, pendingTarget.name, t.name)}
                      className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{body}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
