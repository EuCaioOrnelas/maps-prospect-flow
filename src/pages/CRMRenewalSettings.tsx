import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  BellRing,
  Loader2,
  Mail,
  MessageSquareText,
  MousePointerClick,
  Palette,
  Phone,
  Send,
  Eye,
  Type,
  User,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useRenewalSettings } from "@/hooks/useRenewalSettings";
import { ColorField } from "@/components/ui/color-field";
import { LogoDropField } from "@/components/ui/logo-drop-field";

import {
  SENDER_DOMAIN,
  SAMPLE_RENEWAL_DATA,
  isValidSenderLocalPart,
  normalizeSenderLocalPart,
  renderRenewalEmail,
} from "@/lib/renewalEmailTemplate";

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BellRing;
  title: string;
  description?: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
      <Icon className="w-[18px] h-[18px] text-primary" />
    </div>
    <div className="min-w-0">
      <h2 className="text-sm font-semibold leading-tight">{title}</h2>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  </div>
);

const FieldLabel = ({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) => (
  <Label className="text-xs flex items-center gap-1.5">
    <Icon className="w-3.5 h-3.5 text-primary" /> {children}
  </Label>
);

export default function CRMRenewalSettings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { settings, setSettings, isLoading, isSaving, save, uploadLogo } = useRenewalSettings();
  const [uploading, setUploading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: sidebarProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const senderValid = isValidSenderLocalPart(settings.sender_local_part || "");
  const preview = useMemo(() => renderRenewalEmail(settings, SAMPLE_RENEWAL_DATA).html, [settings]);

  const handleToggle = async (enabled: boolean) => {
    try {
      await save({ enabled });
      toast.success(enabled ? "Aviso de renovação ativado" : "Aviso de renovação desativado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    }
  };

  const handleSave = async () => {
    if (!senderValid) {
      toast.error("Endereço do remetente inválido");
      return;
    }
    try {
      await save({});
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    }
  };

  const handleLogo = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 2MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadLogo(file);
      await save({ logo_url: url });
      toast.success("Logo atualizada");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar a logo");
    } finally {
      setUploading(false);
    }
  };

  const handleTest = async () => {
    if (!senderValid) {
      toast.error("Corrija o endereço do remetente antes de testar");
      return;
    }
    setSendingTest(true);
    try {
      await save({});
      const { data, error } = await supabase.functions.invoke("crm-renewal-test-email", {
        body: { settings },
      });
      if (error) {
        const msg = (data as any)?.error || error.message;
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`E-mail de teste enviado para ${(data as any)?.sent_to || user?.email}`);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar o teste");
    } finally {
      setSendingTest(false);
    }
  };


  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <SEO
        title="Avisos de renovação de contratos | CRM Wiize"
        description="Configure os avisos automáticos de renovação dos contratos recorrentes do seu CRM."
      />
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="flex flex-col h-screen">
          <div className="flex-shrink-0 border-b border-border/50">
            <div className="px-3 pt-2 pb-3 sm:p-4 lg:p-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Avisos de renovação</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    E-mails automáticos de vencimento dos contratos recorrentes
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/crm/vendas")}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-6xl">
                {/* Coluna de configuração */}
                <div className="space-y-4">
                  <Card className="p-4 rounded-2xl border-border/40">
                    <div className="flex items-start justify-between gap-4">
                      <SectionHeader
                        icon={BellRing}
                        title="Ativar aviso de renovação"
                        description="A Wiize monitora os contratos recorrentes, muda o status para Vencendo e envia o aviso por e-mail."
                      />
                      <div className="flex flex-col items-end gap-1.5">
                        <Switch checked={settings.enabled} onCheckedChange={handleToggle} disabled={isSaving} />
                        <Badge
                          variant="outline"
                          className={
                            settings.enabled
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 rounded-lg"
                              : "bg-muted text-muted-foreground border-border rounded-lg"
                          }
                        >
                          {settings.enabled ? "Ativado" : "Desativado"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3 text-[11.5px] text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <Info className="w-3.5 h-3.5 text-primary" /> Regras de aviso
                      </p>
                      <p>• Contratos de até 3 meses: aviso 7 dias antes do vencimento.</p>
                      <p>• Contratos de 4 a 6 meses: aviso 15 dias antes (padrão).</p>
                      <p>• Contratos acima de 6 meses: avisos 30 e 15 dias antes.</p>
                    </div>
                  </Card>

                  <Card className="p-4 rounded-2xl border-border/40 space-y-3">
                    <SectionHeader
                      icon={User}
                      title="Contato para renovação"
                      description="Aparece no e-mail para que o cliente saiba com quem falar."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <FieldLabel icon={User}>Nome do contato</FieldLabel>
                        <Input
                          value={settings.contact_name ?? ""}
                          onChange={(e) => setSettings({ ...settings, contact_name: e.target.value })}
                          className="h-9 rounded-xl"
                          maxLength={80}
                          placeholder="Ex.: Time comercial"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel icon={Phone}>Telefone / WhatsApp</FieldLabel>
                        <Input
                          value={settings.contact_phone ?? ""}
                          onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                          className="h-9 rounded-xl"
                          maxLength={40}
                          placeholder="(11) 99999-0000"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel icon={Mail}>E-mail de contato</FieldLabel>
                      <Input
                        value={settings.contact_email ?? ""}
                        onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                        className="h-9 rounded-xl"
                        maxLength={120}
                        placeholder="comercial@suaempresa.com.br"
                      />
                    </div>
                  </Card>

                  <Card className="p-4 rounded-2xl border-border/40 space-y-3">
                    <SectionHeader
                      icon={Palette}
                      title="Identidade visual e conteúdo"
                      description="O mesmo e-mail é enviado ao cliente e ao responsável interno."
                    />
                    <LogoDropField
                      value={settings.logo_url}
                      uploading={uploading}
                      onFile={(file) => handleLogo(file)}
                      onRemove={() => save({ logo_url: null })}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ColorField
                        label="Cor do cabeçalho"
                        value={settings.header_color}
                        onChange={(v) => setSettings({ ...settings, header_color: v })}
                      />
                      <ColorField
                        label="Cor do botão"
                        value={settings.button_color}
                        onChange={(v) => setSettings({ ...settings, button_color: v })}
                      />
                    </div>



                    <Separator />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <FieldLabel icon={User}>Nome do remetente</FieldLabel>
                        <Input
                          value={settings.sender_name}
                          onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                          className="h-9 rounded-xl"
                          maxLength={60}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel icon={Mail}>Endereço do remetente</FieldLabel>
                        <div className="flex items-center">
                          <Input
                            value={settings.sender_local_part}
                            onChange={(e) =>
                              setSettings({ ...settings, sender_local_part: normalizeSenderLocalPart(e.target.value) })
                            }
                            className="h-9 rounded-l-xl rounded-r-none"
                            placeholder="renovacao"
                          />
                          <span className="h-9 inline-flex items-center rounded-r-xl border border-l-0 border-border bg-muted px-2 text-xs text-muted-foreground">
                            {SENDER_DOMAIN}
                          </span>
                        </div>
                        {!senderValid && (
                          <p className="text-[10.5px] text-destructive">
                            Use de 2 a 40 caracteres: letras minúsculas, números, ponto, hífen ou underline.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel icon={Type}>Título padrão do e-mail</FieldLabel>
                      <Input
                        value={settings.email_title}
                        onChange={(e) => setSettings({ ...settings, email_title: e.target.value })}
                        className="h-9 rounded-xl"
                        maxLength={120}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel icon={MessageSquareText}>Mensagem de abertura</FieldLabel>
                      <Textarea
                        value={settings.email_intro}
                        onChange={(e) => setSettings({ ...settings, email_intro: e.target.value })}
                        rows={3}
                        maxLength={500}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel icon={MousePointerClick}>Texto do botão</FieldLabel>
                      <Input
                        value={settings.cta_label}
                        onChange={(e) => setSettings({ ...settings, cta_label: e.target.value })}
                        className="h-9 rounded-xl"
                        maxLength={40}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSave} disabled={isSaving} className="rounded-xl">
                        {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                        Salvar configurações
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 rounded-2xl border-border/40 space-y-3">
                    <SectionHeader
                      icon={Send}
                      title="Enviar e-mail de teste"
                      description={`O teste é enviado para o e-mail de login da sua conta${user?.email ? ` (${user.email})` : ""}.`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" className="rounded-xl" onClick={handleTest} disabled={sendingTest}>
                        {sendingTest ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Enviar e-mail de teste
                      </Button>
                      <span className="text-[10.5px] text-muted-foreground">
                        Limites: 1 teste a cada 2 minutos · 10 testes por semana
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold">Preview do e-mail</h2>
                  </div>
                  <Card className="rounded-2xl border-border/40 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border/60 text-xs text-muted-foreground">
                      De: <strong className="text-foreground">{settings.sender_name}</strong>{" "}
                      &lt;{settings.sender_local_part || "renovacao"}
                      {SENDER_DOMAIN}&gt;
                    </div>
                    <iframe
                      title="Preview do e-mail de renovação"
                      srcDoc={preview}
                      className="w-full h-[720px] bg-white"
                    />
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
