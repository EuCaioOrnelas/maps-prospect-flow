import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, Users, Target, PhoneCall, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getChatAvatarColor, getChatInitials } from "@/lib/chatAvatar";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation: (phone: string, name?: string) => void;
}

interface Lead {
  id: string;
  contact_name: string | null;
  company_name: string | null;
  phone: string;
  origin: string | null;
}

type Tab = "crm" | "oportunidades" | "novo";

const phoneKey = (p: string) => p.replace(/\D/g, "").slice(-8);

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    if (number.length === 9) return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  }
  return `+${digits}`;
};

export function NewConversationDialog({ open, onOpenChange, onStartConversation }: NewConversationDialogProps) {
  const { user, accountOwnerId } = useAuth();
  const [tab, setTab] = useState<Tab>("crm");
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [picsByPhone, setPicsByPhone] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      const [leadsRes, convRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, contact_name, company_name, phone, origin")
          .eq("owner_user_id", accountOwnerId)
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase
          .from("chat_conversations")
          .select("contact_phone, contact_profile_pic")
          .eq("owner_user_id", accountOwnerId)
          .not("contact_profile_pic", "is", null)
          .limit(2000),
      ]);
      setLeads((leadsRes.data as Lead[]) || []);
      const map: Record<string, string> = {};
      for (const c of (convRes.data || []) as any[]) {
        if (c.contact_profile_pic) map[phoneKey(c.contact_phone)] = c.contact_profile_pic;
      }
      setPicsByPhone(map);
      setLoading(false);
    };
    load();
  }, [open, user, accountOwnerId]);

  const crmLeads = useMemo(
    () => leads.filter(l => !["oportunidades", "prospeccao"].includes(l.origin || "")),
    [leads]
  );
  const opLeads = useMemo(
    () => leads.filter(l => ["oportunidades", "prospeccao"].includes(l.origin || "")),
    [leads]
  );

  const list = tab === "crm" ? crmLeads : opLeads;
  const filtered = search
    ? list.filter(l =>
        (l.contact_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search)
      )
    : list;

  const handleLeadSelect = (lead: Lead) => {
    onStartConversation(lead.phone, lead.contact_name || lead.company_name || undefined);
    onOpenChange(false);
    setSearch("");
  };

  const handleNewNumber = () => {
    const digits = newPhone.replace(/\D/g, "");
    if (digits.length < 10) return;
    onStartConversation(digits, newName.trim() || undefined);
    onOpenChange(false);
    setNewPhone("");
    setNewName("");
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "crm", label: "CRM", icon: Search },
    { id: "oportunidades", label: "Oportunidades", icon: Target },
    { id: "novo", label: "Novo número", icon: PhoneCall },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSearch(""); setTab("crm"); } }}>
      <DialogContent className="sm:max-w-[480px] w-[calc(100vw-2rem)] max-w-[480px] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-medium">Nova conversa</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b px-2 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "novo" ? (
          <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Número com DDI/DDD</label>
              <Input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="Ex.: 5511999999999"
                inputMode="tel"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome (opcional)</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome do contato"
                className="h-10"
              />
            </div>
            <Button
              onClick={handleNewNumber}
              disabled={newPhone.replace(/\D/g, "").length < 10}
              className="w-full h-10 mt-2"
            >
              Iniciar conversa
            </Button>
            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
              Inicie conversas com qualquer número desde que respeite as políticas anti-spam da Meta.
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === "crm" ? "Buscar no CRM..." : "Buscar em Oportunidades..."}
                className="h-9 rounded-full"
              />
            </div>

            <div className="max-h-[340px] overflow-y-auto pb-2">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-sm text-muted-foreground">
                    {search ? "Nenhum contato encontrado" : (tab === "crm" ? "Nenhum contato no CRM" : "Nenhuma oportunidade ainda")}
                  </p>
                </div>
              ) : (
                filtered.map(lead => {
                  const pic = picsByPhone[phoneKey(lead.phone)];
                  const displayName = lead.contact_name || lead.company_name || formatPhone(lead.phone);
                  return (
                    <button
                      key={lead.id}
                      onClick={() => handleLeadSelect(lead)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-medium overflow-hidden",
                        getChatAvatarColor(lead.phone)
                      )}>
                        {pic ? (
                          <img src={pic} alt="" className="w-full h-full object-cover" />
                        ) : tab === "oportunidades" ? (
                          <Building2 size={16} />
                        ) : (
                          <span>{getChatInitials(lead.contact_name || lead.company_name, lead.phone)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatPhone(lead.phone)}
                          {lead.company_name && lead.contact_name ? ` · ${lead.company_name}` : ""}
                        </p>
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
