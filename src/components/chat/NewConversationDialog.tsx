import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation: (phone: string, name?: string) => void;
}

interface CRMLead {
  id: string;
  contact_name: string | null;
  company_name: string | null;
  phone: string;
}

export function NewConversationDialog({ open, onOpenChange, onStartConversation }: NewConversationDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const loadLeads = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("leads")
        .select("id, contact_name, company_name, phone")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      setLeads(data || []);
      setLoading(false);
    };
    loadLeads();
  }, [open, user]);

  const filteredLeads = search
    ? leads.filter(l =>
        (l.contact_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search)
      )
    : leads;

  const handleLeadSelect = (lead: CRMLead) => {
    onStartConversation(lead.phone, lead.contact_name || lead.company_name || undefined);
    onOpenChange(false);
    setSearch("");
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("55") && digits.length >= 12) {
      const ddd = digits.slice(2, 4);
      const number = digits.slice(4);
      if (number.length === 9) {
        return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
      }
      return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
    return `+${digits}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSearch(""); }}>
      <DialogContent className="sm:max-w-[440px] w-[95vw] p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-medium">Nova conversa</DialogTitle>
        </DialogHeader>

        {/* Tab indicator */}
        <div className="flex border-b px-5">
          <div className="flex-1 py-3 text-sm font-medium border-b-2 border-primary text-primary text-center">
            <Search size={14} className="inline mr-1.5 -mt-0.5" />
            Buscar no CRM
          </div>
        </div>

        {/* Info banner */}
        <div className="mx-4 mt-3 p-3 rounded-lg bg-muted/60 border border-border/40 flex gap-2.5 items-start">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            A Meta Partners Inbound permite conversar apenas com contatos que já possuem <strong>opt-in ativo</strong>. 
            Não é possível iniciar conversas com leads frios ou contatos novos por este canal.
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou telefone..."
            className="h-9 rounded-full"
          />
        </div>

        {/* Lead list */}
        <div className="max-h-[300px] overflow-y-auto pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum contato encontrado" : "Nenhum contato no CRM"}
              </p>
            </div>
          ) : (
            filteredLeads.map(lead => (
              <button
                key={lead.id}
                onClick={() => handleLeadSelect(lead)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {lead.contact_name || lead.company_name || formatPhone(lead.phone)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatPhone(lead.phone)}
                    {lead.company_name && lead.contact_name ? ` · ${lead.company_name}` : ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
