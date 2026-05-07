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

interface MetaManualSetupProps {
  onConnectionSaved: (connection: WabaConnection | null) => void;
  isAddingExtra?: boolean;
  embedded?: boolean;
}


export const MetaManualSetup = ({ onConnectionSaved, isAddingExtra, embedded }: MetaManualSetupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Draft persistido por usuário para não perder dados ao sair/voltar da página
  const draftKey = user ? `meta-manual-setup-draft:${user.id}:${isAddingExtra ? "extra" : "primary"}` : null;
  const hydratedRef = useRef(false);

  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [nickname, setNickname] = useState("");
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

      const { data: connection, error: dbError } = await supabase
        .from("user_waba_connections")
        .upsert(
          {
            user_id: user.id,
            waba_id: cleanWaba,
            phone_number_id: cleanPhone,
            access_token: cleanToken,
            display_phone_number: displayPhone,
            business_name: businessName,
            nickname: nickname.trim() || null,
            status: "active",
            raw_signup_data: { source: "manual" },
          },
          { onConflict: "user_id,waba_id" }
        )
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

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
        description: `${displayPhone || cleanPhone} vinculado com sucesso.`,
      });

      clearDraft();

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
        {/* Step-by-step guide */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Info size={12} /> Como obter os dados
          </p>

          <Step
            number={1}
            icon={<KeyRound size={14} />}
            title="Gere um Access Token permanente"
            description={
              <>
                Acesse{" "}
                <ExternalLink_ href="https://business.facebook.com/settings/system-users">
                  Meta Business Suite → Usuários do Sistema
                </ExternalLink_>
                . Crie (ou selecione) um System User com função <strong>Admin</strong>, clique em{" "}
                <strong>Gerar token</strong>, escolha seu app e marque as permissões{" "}
                <code className="text-[11px] bg-muted px-1 py-0.5 rounded">whatsapp_business_messaging</code> e{" "}
                <code className="text-[11px] bg-muted px-1 py-0.5 rounded">whatsapp_business_management</code>. Defina
                expiração para <strong>Nunca</strong>.
              </>
            }
          />

          <Step
            number={2}
            icon={<Hash size={14} />}
            title="Encontre o WABA ID (Conta do WhatsApp Business)"
            description={
              <>
                Em{" "}
                <ExternalLink_ href="https://business.facebook.com/wa/manage/home">
                  Meta Business Suite → Contas do WhatsApp
                </ExternalLink_>
                , clique na sua conta. O <strong>ID da conta</strong> aparece no topo (em "Informações da conta") — é
                uma sequência numérica longa.
              </>
            }
          />

          <Step
            number={3}
            icon={<Phone size={14} />}
            title="Encontre o Phone Number ID"
            description={
              <>
                Na mesma tela da conta WhatsApp, vá em <strong>Números de telefone</strong> e clique no número desejado.
                O <strong>ID do número</strong> aparece nos detalhes (não confunda com o número em si).
              </>
            }
          />
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
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Chat em breve */}
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Chat em breve</p>
              <p className="text-xs text-muted-foreground mt-1">
                O módulo de chat integrado está em desenvolvimento. Por enquanto, você pode usar o sistema oficial da Meta para responder leads.
              </p>
              <a
                href="https://business.facebook.com/wa/manage/home"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                Acessar Meta Business Suite <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>

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
