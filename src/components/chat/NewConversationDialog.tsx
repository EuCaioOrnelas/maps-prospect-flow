import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");

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

  const handleManualStart = () => {
    const cleanPhone = manualPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return;
    onStartConversation(cleanPhone, manualName || undefined);
    onOpenChange(false);
    resetState();
  };

  const handleLeadSelect = (lead: CRMLead) => {
    onStartConversation(lead.phone, lead.contact_name || lead.company_name || undefined);
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setSearch("");
    setManualPhone("");
    setManualName("");
    setMode("search");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="sm:max-w-[440px] max-w-[calc(100vw-32px)] p-0 gap-0 overflow-hidden rounded-xl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-medium">Nova conversa</DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex border-b px-5">
          <button
            onClick={() => setMode("search")}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              mode === "search"
                ? "border-[#00a884] text-[#00a884]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Search size={14} className="inline mr-1.5 -mt-0.5" />
            Buscar no CRM
          </button>
          <button
            onClick={() => setMode("manual")}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              mode === "manual"
                ? "border-[#00a884] text-[#00a884]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <UserPlus size={14} className="inline mr-1.5 -mt-0.5" />
            Novo contato
          </button>
        </div>

        {mode === "search" ? (
          <div className="flex flex-col">
            <div className="px-4 py-3">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, empresa ou telefone..."
                className="h-9"
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 rounded-full border-2 border-[#00a884]/20 border-t-[#00a884] animate-spin" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-sm text-muted-foreground">
                    {search ? "Nenhum lead encontrado" : "Nenhum lead no CRM"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-[#00a884]"
                    onClick={() => setMode("manual")}
                  >
                    Adicionar manualmente
                  </Button>
                </div>
              ) : (
                filteredLeads.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => handleLeadSelect(lead)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-[40px] h-[40px] rounded-full bg-[#00a884]/10 flex items-center justify-center shrink-0">
                      <MessageSquare size={16} className="text-[#00a884]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.contact_name || lead.company_name || lead.phone}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.phone}
                        {lead.company_name && lead.contact_name ? ` · ${lead.company_name}` : ""}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Telefone *</label>
              <Input
                value={manualPhone}
                onChange={e => setManualPhone(e.target.value)}
                placeholder="5511999999999"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">Formato: código do país + DDD + número</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome (opcional)</label>
              <Input
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Nome do contato"
                className="h-10"
              />
            </div>
            <Button
              onClick={handleManualStart}
              disabled={manualPhone.replace(/\D/g, "").length < 10}
              className="w-full bg-[#00a884] hover:bg-[#06cf9c] text-white"
            >
              <MessageSquare size={16} className="mr-2" />
              Iniciar conversa
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ A primeira mensagem requer um template aprovado pela Meta (janela de 24h).
              Se já houver uma conversa ativa, a mensagem será enviada normalmente.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
