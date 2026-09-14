import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2, Phone } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PipelineStageLite {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface AddToCRMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string | null;
  contactPhone: string;
  conversationId?: string | null;
  stages: PipelineStageLite[];
  onCreated?: (lead: { id: string; pipeline_stage_id: string | null }) => void;
}

const formatCurrencyInput = (input: string) => {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** +55 (44) 9 9999-9999 */
const prettyPhone = (raw: string) => {
  const d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    if (rest.length === 9) return `+55 (${ddd}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`;
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return formatPhoneNumber(d);
};

const parseCurrency = (value: string) => {
  if (!value) return 0;
  const parsed = parseFloat(value.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Adiciona um contato do WhatsApp ao CRM, com nome e telefone já preenchidos.
 */
export function AddToCRMDialog({
  open, onOpenChange, contactName, contactPhone, conversationId = null, stages, onCreated,
}: AddToCRMDialogProps) {
  const { user, accountOwnerId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [stageId, setStageId] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.position - b.position), [stages]);

  useEffect(() => {
    if (!open) return;
    setName(contactName || "");
    setCompany("");
    setEmail("");
    setValue("");
    setNotes("");
    setStageId(sortedStages[0]?.id || "");
  }, [open, contactName, sortedStages]);

  const handleSave = async () => {
    if (!user) return;
    const normalizedPhone = contactPhone.replace(/\D/g, "");
    if (!normalizedPhone) {
      toast.error("Telefone inválido para cadastro no CRM.");
      return;
    }

    setSaving(true);
    try {
      const last8 = normalizedPhone.slice(-8);
      const ownerId = accountOwnerId || user.id;

      const { data: existing } = await supabase
        .from("leads")
        .select("id, pipeline_stage_id")
        .eq("user_id", ownerId)
        .ilike("phone", `%${last8}`)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.info("Este contato já está no CRM.");
        onCreated?.(existing[0] as any);
        onOpenChange(false);
        return;
      }

      const { data, error } = await supabase
        .from("leads")
        .insert({
          user_id: ownerId,
          owner_user_id: ownerId,
          phone: normalizedPhone,
          contact_name: name.trim() || null,
          company_name: company.trim() || null,
          email: email.trim() || null,
          origin: "whatsapp",
          pipeline_stage_id: stageId || sortedStages[0]?.id || null,
          estimated_value: parseCurrency(value),
          tags: [],
        })
        .select("id, pipeline_stage_id")
        .single();

      if (error) throw error;

      if (notes.trim() && data?.id) {
        await supabase.from("lead_notes").insert({ lead_id: data.id, user_id: user.id, content: notes.trim() });
      }

      toast.success("Contato adicionado no CRM.");
      onCreated?.(data as any);
      onOpenChange(false);
    } catch (err: any) {
      console.error("add-to-crm error", err);
      toast.error(err?.message || "Não foi possível adicionar no CRM.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-popover p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl wa-accent-bg-soft flex items-center justify-center">
                <UserPlus size={20} className="wa-accent-text" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-lg leading-tight">Adicionar no CRM</DialogTitle>
                <DialogDescription className="text-[13px] leading-snug">
                  Confira os dados do contato e escolha a etapa. Você completa o restante depois no CRM.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3.5 py-3">
            <Phone size={16} className="text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Telefone do contato</p>
              <p className="text-sm font-medium tabular-nums truncate">{prettyPhone(contactPhone)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crm-name">Nome</Label>
            <Input id="crm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João Silva" autoFocus />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="crm-company">Empresa</Label>
              <Input id="crm-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-email">E-mail</Label>
              <Input id="crm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Etapa do CRM</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                <SelectContent>
                  {sortedStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || "#10b981" }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-value">Valor estimado</Label>
              <Input
                id="crm-value"
                value={value}
                onChange={(e) => setValue(formatCurrencyInput(e.target.value))}
                placeholder="0,00"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crm-notes">Observação</Label>
            <Textarea
              id="crm-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto da conversa, próximo passo..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={15} className="mr-2 animate-spin" /> Adicionando...</> : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
