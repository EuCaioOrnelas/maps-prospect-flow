import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Building2,
  Phone,
  Key,
  Shield,
  Loader2,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WabaConnection {
  id: string;
  waba_id: string;
  phone_number_id: string;
  business_name: string | null;
  display_phone: string | null;
  access_token: string;
  messaging_tier: string | null;
  daily_limit: number;
}

interface MetaAccountSetupProps {
  onConnectionSaved: (connection: WabaConnection) => void;
  existingConnection?: WabaConnection | null;
}

export const MetaAccountSetup = ({ onConnectionSaved, existingConnection }: MetaAccountSetupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const STORAGE_KEY = "meta_setup_draft";

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const draft = existingConnection ? null : loadDraft();

  const [step, setStepRaw] = useState(existingConnection ? 4 : (draft?.step || 1));
  const [saving, setSaving] = useState(false);

  const [wabaId, setWabaId] = useState(existingConnection?.waba_id || draft?.wabaId || "");
  const [phoneNumberId, setPhoneNumberId] = useState(existingConnection?.phone_number_id || draft?.phoneNumberId || "");
  const [accessToken, setAccessToken] = useState(existingConnection?.access_token || draft?.accessToken || "");
  const [businessName, setBusinessName] = useState(existingConnection?.business_name || draft?.businessName || "");
  const [displayPhone, setDisplayPhone] = useState(existingConnection?.display_phone || draft?.displayPhone || "");

  const saveDraft = (updates: Record<string, any> = {}) => {
    if (existingConnection) return;
    const data = { step, wabaId, phoneNumberId, accessToken, businessName, displayPhone, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const setStep = (s: number) => {
    setStepRaw(s);
    saveDraft({ step: s });
  };

  const clearDraft = () => localStorage.removeItem(STORAGE_KEY);

  // Auto-save draft when fields change
  const saveDraftEffect = () => {
    if (!existingConnection) {
      saveDraft({ step, wabaId, phoneNumberId, accessToken, businessName, displayPhone });
    }
  };

  const steps = [
    { num: 1, title: "Conta Business", icon: Building2 },
    { num: 2, title: "Número WhatsApp", icon: Phone },
    { num: 3, title: "Token de Acesso", icon: Key },
    { num: 4, title: "Confirmação", icon: Shield },
  ];

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("user_waba_connections")
        .upsert({
          user_id: user.id,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          access_token: accessToken,
          business_name: businessName || null,
          display_phone: displayPhone || null,
        }, { onConflict: "user_id,waba_id" })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Conta configurada!",
        description: "Sua conta Meta Business foi vinculada com sucesso.",
      });

      clearDraft();
      onConnectionSaved(data as unknown as WabaConnection);
    } catch (err: any) {
      console.error("Error saving WABA connection:", err);
      toast({
        title: "Erro ao salvar",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const HelpLink = ({ url, label }: { url: string; label: string }) => (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
    >
      <ExternalLink size={10} />
      {label}
    </a>
  );

  const FieldHelp = ({ text }: { text: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle size={14} className="text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="glass rounded-2xl p-6 max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <CheckCircle2 size={18} /> : <s.icon size={18} />}
              </div>
              <span className="text-xs mt-1.5 text-muted-foreground hidden sm:block">
                {s.title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-16 mx-1 transition-colors ${
                  step > s.num ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: WABA ID */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Conta WhatsApp Business</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Informe o ID da sua conta WhatsApp Business (WABA)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="waba-id">WABA ID (WhatsApp Business Account ID)</Label>
              <FieldHelp text="O ID da sua conta WhatsApp Business. É um número de 15-18 dígitos encontrado no painel da Meta Business." />
            </div>
            <Input
              id="waba-id"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="Ex: 123456789012345"
              className="bg-secondary"
            />
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Como encontrar seu WABA ID:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Acesse o <strong>Meta Business Suite</strong></li>
                  <li>Vá em <strong>Configurações → Contas do WhatsApp</strong></li>
                  <li>O WABA ID aparece ao lado do nome da sua conta</li>
                </ol>
              </div>
            </div>
            <HelpLink
              url="https://business.facebook.com/settings/whatsapp-business-accounts"
              label="Abrir Meta Business Suite → WhatsApp"
            />
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={() => setStep(2)} disabled={!wabaId.trim()} className="gap-2">
              Próximo <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Phone Number ID */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Número do WhatsApp</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Informe o ID do número de telefone e o número que será usado nos envios
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="phone-id">Phone Number ID</Label>
                <FieldHelp text="ID do número de telefone registrado na Meta. Diferente do número em si, é um identificador interno da API." />
              </div>
              <Input
                id="phone-id"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="Ex: 109876543210987"
                className="bg-secondary"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Info size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground mb-1">Como encontrar o Phone Number ID:</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>No Meta Business Suite, vá em <strong>WhatsApp → Configuração da API</strong></li>
                    <li>Em <strong>Números de telefone</strong>, clique no número desejado</li>
                    <li>O <strong>Phone number ID</strong> aparece nos detalhes</li>
                  </ol>
                </div>
              </div>
              <HelpLink
                url="https://developers.facebook.com/apps"
                label="Abrir painel de desenvolvedor Meta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-phone">Número de exibição (opcional)</Label>
              <Input
                id="display-phone"
                value={displayPhone}
                onChange={(e) => setDisplayPhone(e.target.value)}
                placeholder="Ex: +55 11 99999-9999"
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground">
                O número real que aparecerá nas mensagens. Usado apenas para sua referência.
              </p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button onClick={() => setStep(3)} disabled={!phoneNumberId.trim()} className="gap-2">
              Próximo <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Access Token */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Token de Acesso</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Informe o token permanente para envio de mensagens via API
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="access-token">Access Token (Permanente)</Label>
              <FieldHelp text="Token de acesso permanente gerado no painel Meta. Tokens temporários expiram em 24h — use o token permanente do System User." />
            </div>
            <Input
              id="access-token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAxxxxxxx..."
              className="bg-secondary font-mono text-xs"
            />
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Como gerar o Token Permanente:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>No Meta Business Suite, vá em <strong>Configurações → Usuários do sistema</strong></li>
                  <li>Crie ou selecione um <strong>System User</strong></li>
                  <li>Clique em <strong>Gerar novo token</strong></li>
                  <li>Selecione o app e as permissões: <code>whatsapp_business_messaging</code>, <code>whatsapp_business_management</code></li>
                  <li>Copie o token gerado e cole aqui</li>
                </ol>
              </div>
            </div>
            <HelpLink
              url="https://business.facebook.com/settings/system-users"
              label="Abrir Meta → Usuários do sistema"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="biz-name">Nome do negócio (opcional)</Label>
            <Input
              id="biz-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Minha Empresa Ltda"
              className="bg-secondary"
            />
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button onClick={() => setStep(4)} disabled={!accessToken.trim()} className="gap-2">
              Próximo <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Confirmar configuração</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique os dados antes de salvar
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                <span className="text-sm font-medium">WABA ID</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{wabaId}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-primary" />
                <span className="text-sm font-medium">Phone Number ID</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{phoneNumberId}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-primary" />
                <span className="text-sm font-medium">Token</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                {accessToken.slice(0, 10)}...{accessToken.slice(-4)}
              </span>
            </div>

            {businessName && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-primary" />
                  <span className="text-sm font-medium">Negócio</span>
                </div>
                <span className="text-sm text-muted-foreground">{businessName}</span>
              </div>
            )}

            {displayPhone && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-primary" />
                  <span className="text-sm font-medium">Número</span>
                </div>
                <span className="text-sm text-muted-foreground">{displayPhone}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep(3)} className="gap-2">
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {existingConnection ? "Atualizar configuração" : "Salvar e conectar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
