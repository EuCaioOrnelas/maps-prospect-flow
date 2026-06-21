import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle2,
  ExternalLink,
  Shield,
  Loader2,
  Info,
  MessageSquare,
  AlertTriangle,
  KeyRound,
  Hash,
  Phone,
  Clock,
} from "lucide-react";
import type { WabaConnection } from "@/pages/MetaCampaigns";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startChatBackup } from "@/hooks/useChatBackup";

interface MetaManualSetupProps {
  onConnectionSaved: (connection: WabaConnection | null) => void;
  isAddingExtra?: boolean;
  embedded?: boolean;
}


export const MetaManualSetup = ({ onConnectionSaved, isAddingExtra, embedded }: MetaManualSetupProps) => {
  const { user, accountOwnerId } = useAuth();
  const { toast } = useToast();
  const { members } = useAccountMembers();

  // Draft persistido por usuário para não perder dados ao sair/voltar da página
  const draftKey = user ? `meta-manual-setup-draft:${user.id}:${isAddingExtra ? "extra" : "primary"}` : null;
  const hydratedRef = useRef(false);

  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [nickname, setNickname] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState<string>(""); // "" = não escolheu | "none" = sem responsável | <uuid>
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Hidratar do localStorage uma vez quando o user estiver disponível
  useEffect(() => {
    if (!draftKey || hydratedRef.current) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.accessToken) setAccessToken(draft.accessToken);
        if (draft.wabaId) setWabaId(draft.wabaId);
        if (draft.phoneNumberId) setPhoneNumberId(draft.phoneNumberId);
        if (draft.nickname) setNickname(draft.nickname);
      }
    } catch {
      // ignore parse errors
    }
    hydratedRef.current = true;
  }, [draftKey]);

  // Salvar draft a cada alteração (após hidratação)
  useEffect(() => {
    if (!draftKey || !hydratedRef.current) return;
    const payload = { accessToken, wabaId, phoneNumberId, nickname };
    const isEmpty = !accessToken && !wabaId && !phoneNumberId && !nickname;
    try {
      if (isEmpty) {
        localStorage.removeItem(draftKey);
      } else {
        localStorage.setItem(draftKey, JSON.stringify(payload));
      }
    } catch {
      // ignore quota errors
    }
  }, [draftKey, accessToken, wabaId, phoneNumberId, nickname]);

  const clearDraft = () => {
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    }
  };

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: `${label} copiado!` });
  };

  const handleSave = async () => {
    if (!user) return;

    const cleanToken = accessToken.trim();
    const cleanWaba = wabaId.trim();
    const cleanPhone = phoneNumberId.trim();

    if (!cleanToken || !cleanWaba || !cleanPhone) {
      setError("Preencha Access Token, WABA ID e Phone Number ID.");
      return;
    }

    if (!responsibleUserId) {
      setError("Selecione o responsável por este número (ou 'Sem responsável').");
      return;
    }

    setSaving(true);
    setError(null);


    try {
      // Validate token by fetching phone info from Meta
      const validateRes = await fetch(
        `https://graph.facebook.com/v21.0/${cleanPhoneId(cleanPhone)}?access_token=${encodeURIComponent(cleanToken)}`
      );
      const validateData = await validateRes.json();

      if (validateData?.error) {
        const meta = validateData.error;
        const friendly =
          meta.code === 190
            ? "Token inválido ou expirado. Use um token permanente de System User."
            : meta.code === 100
            ? "Phone Number ID inválido. Confira se copiou o ID correto no Meta Business Suite."
            : meta.message || "A Meta recusou os dados informados.";
        throw new Error(friendly);
      }

      const displayPhone = validateData?.display_phone_number || null;

      // Try to fetch business name (optional, doesn't block save)
      let businessName: string | null = null;
      try {
        const wabaRes = await fetch(
          `https://graph.facebook.com/v21.0/${cleanWaba}?access_token=${encodeURIComponent(cleanToken)}`
        );
        const wabaData = await wabaRes.json();
        if (!wabaData?.error) businessName = wabaData?.name || null;
      } catch {
        // ignore — not critical
      }

      // Partial unique index não funciona com upsert/onConflict no PostgREST.
      // Fazemos check manual para dar erro amigável quando o número já está em outra conta.
      const ownerId = accountOwnerId || user.id;
      const { data: existing, error: existErr } = await supabase
        .from("user_waba_connections")
        .select("id, owner_user_id")
        .eq("phone_number_id", cleanPhone)
        .maybeSingle();

      if (existErr) throw new Error(existErr.message);

      if (existing && existing.owner_user_id && existing.owner_user_id !== ownerId) {
        throw new Error(
          "Este número (Phone Number ID) já está conectado em outra conta Wiize. Cada número só pode estar vinculado a uma conta por vez. Desconecte-o na outra conta antes de tentar novamente — se você não tem acesso à outra conta, fale com o suporte para liberar."
        );
      }

      const responsibleId = responsibleUserId === "none" ? null : responsibleUserId;

      const payload: Record<string, any> = {
        user_id: ownerId,
        owner_user_id: ownerId,
        waba_id: cleanWaba,
        phone_number_id: cleanPhone,
        access_token: cleanToken,
        display_phone_number: displayPhone,
        business_name: businessName,
        nickname: nickname.trim() || null,
        responsible_user_id: responsibleId,
        status: "active",
        raw_signup_data: { source: "manual" },
      };

      const op = existing?.id
        ? await (supabase.from("user_waba_connections") as any).update(payload).eq("id", existing.id).select().single()
        : await (supabase.from("user_waba_connections") as any).insert(payload).select().single();

      const connection = op.data;
      const dbError = op.error;

      if (dbError) {
        const msg = dbError.message || "";
        if (msg.includes("duplicate key") || msg.includes("phone_number_id_uniq")) {
          throw new Error("Este número já está conectado em outra conta Wiize. Desconecte-o lá antes de vincular aqui — ou fale com o suporte.");
        }
        if (msg.includes("ON CONFLICT")) {
          throw new Error("Erro temporário ao salvar. Atualize a página e tente de novo; se persistir, fale com o suporte.");
        }
        throw new Error(msg);
      }

      // Try to subscribe webhook (best-effort)
      try {
        await fetch(`https://graph.facebook.com/v21.0/${cleanWaba}/subscribed_apps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: cleanToken }),
        });
      } catch {
        // ignore
      }

      toast({
        title: "Número conectado!",
        description: `${displayPhone || cleanPhone} vinculado. Iniciando importação de contatos do CRM…`,
      });

      clearDraft();

      // Dispara backup CRM → Chat em background (não bloqueia UI)
      const label = nickname.trim() || displayPhone || cleanPhone;
      void startChatBackup({
        connectionId: (connection as any).id,
        ownerUserId: ownerId,
        responsibleUserId: responsibleId,
        connectionLabel: label,
      });

      onConnectionSaved({
        id: (connection as any).id,
        waba_id: (connection as any).waba_id,
        phone_number_id: (connection as any).phone_number_id,
        business_name: (connection as any).business_name,
        display_phone_number: (connection as any).display_phone_number,
        access_token: (connection as any).access_token,
        status: (connection as any).status,
        nickname: (connection as any).nickname,
      });

    } catch (err: any) {
      console.error("[MetaManualSetup] Save error:", err);
      setError(err.message || "Erro ao salvar conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={embedded ? "" : "max-w-3xl mx-auto"}>
      <div className={embedded ? "space-y-6" : "glass rounded-2xl p-6 sm:p-8 space-y-6"}>
        {/* Header */}
        {!embedded && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <MessageSquare size={28} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              {isAddingExtra ? "Adicionar outro número" : "Conecte sua conta WhatsApp Business"}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Cole abaixo as credenciais geradas no seu Meta Business Suite. Siga o passo a passo se for a primeira vez.
            </p>
          </div>
        )}
        {/* CTA principal: Guia completo em nova aba */}
        <button
          type="button"
          onClick={() => window.open("/meta/guia-conexao", "_blank", "noopener,noreferrer")}
          className="group w-full text-left rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 hover:border-primary/50 hover:from-primary/15 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Info size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base">Não sabe como obter esses dados?</p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  Guia completo
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Tutorial passo a passo das <strong>3 fases</strong> (App, Número, System User) com vídeo,
                prints e troubleshooting. <strong>Abre em nova guia</strong> para você acompanhar enquanto preenche aqui.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                Abrir guia de conexão <ExternalLink size={13} />
              </div>
            </div>
          </div>
        </button>

        {/* Resumo rápido dos 3 dados que serão pedidos */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Você vai precisar de 3 informações:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <MiniHint icon={<KeyRound size={12} />} label="Access Token" detail="permanente, do System User" />
            <MiniHint icon={<Hash size={12} />} label="WABA ID" detail="da Conta WhatsApp Business" />
            <MiniHint icon={<Phone size={12} />} label="Phone Number ID" detail="do número cadastrado" />
          </div>
        </div>


        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access_token" className="flex items-center gap-1.5">
              <KeyRound size={13} /> Access Token <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="access_token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAN..."
              className="font-mono text-xs min-h-[70px]"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="waba_id" className="flex items-center gap-1.5">
                <Hash size={13} /> WABA ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="waba_id"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="123456789012345"
                className="font-mono text-xs"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number_id" className="flex items-center gap-1.5">
                <Phone size={13} /> Phone Number ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone_number_id"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="987654321098765"
                className="font-mono text-xs"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">Apelido (opcional)</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Atendimento, Vendas..."
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              Responsável pelo número <span className="text-destructive">*</span>
            </Label>
            <Select value={responsibleUserId} onValueChange={setResponsibleUserId} disabled={saving}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione quem vai atender por este número" />
              </SelectTrigger>
              <SelectContent>
                {members.slice(0, Math.ceil(members.length / 2)).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name || m.email || m.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
                <SelectItem value="none">— Sem responsável (CRM inteiro) —</SelectItem>
                {members.slice(Math.ceil(members.length / 2)).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name || m.email || m.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Ao conectar, importamos os contatos do CRM deste responsável para o chat. Sem responsável, importamos todos os contatos da conta.
            </p>
          </div>
        </div>


        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}


        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={saving} size="lg" className="flex-1 gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {saving ? "Validando e salvando..." : "Conectar número"}
          </Button>
          {isAddingExtra && (
            <Button variant="ghost" onClick={() => onConnectionSaved(null)} disabled={saving}>
              Cancelar
            </Button>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
          <Shield size={14} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Suas credenciais ficam armazenadas com segurança e só são usadas para enviar mensagens em seu nome. Você
            pode revogar o acesso a qualquer momento no Meta Business Suite.
          </p>
        </div>
      </div>
    </div>
  );
};

const cleanPhoneId = (v: string) => v.replace(/\s+/g, "");

const Step = ({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) => (
  <div className="flex gap-3">
    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-xs font-bold text-primary">{number}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <span className="text-primary">{icon}</span>
        {title}
      </p>
      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</div>
    </div>
  </div>
);

const ExternalLink_ = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline inline-flex items-center gap-0.5"
  >
    {children}
    <ExternalLink size={9} />
  </a>
);

const MiniHint = ({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) => (
  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background border border-border">
    <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold truncate">{label}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{detail}</p>
    </div>
  </div>
);


const CopyField = ({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string, l: string) => void;
}) => (
  <div className="flex items-center gap-2 p-2 rounded-md bg-background border border-border">
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-mono truncate">{value}</p>
    </div>
    <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => onCopy(value, label)}>
      Copiar
    </Button>
  </div>
);
