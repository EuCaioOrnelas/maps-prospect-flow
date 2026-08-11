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
  Image as ImageIcon,
  Loader2,
  Mail,
  Palette,
  Send,
  Eye,
  Upload,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useRenewalSettings } from "@/hooks/useRenewalSettings";
import {
  SENDER_DOMAIN,
  SAMPLE_RENEWAL_DATA,
  isValidSenderLocalPart,
  normalizeSenderLocalPart,
  renderRenewalEmail,
} from "@/lib/renewalEmailTemplate";

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
  const preview = useMemo(
    () => renderRenewalEmail(settings, SAMPLE_RENEWAL_DATA).html,
    [settings]
  );

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

  const colorField = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#3daa57"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-md border border-border bg-card p-1 cursor-pointer"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-xs" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <SEO
        title="Aviso de renovação — CRM Wiize"
        description="Configure os avisos automáticos de renovação de contratos recorrentes do seu CRM."
      />
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="flex flex-col h-screen">
          <div className="flex-shrink-0 border-b border-border/50">
            <div className="px-3 pt-2 pb-3 sm:p-4 lg:p-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                  <BellRing className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Aviso de renovação</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    Avisos automáticos de contratos recorrentes próximos do vencimento
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/crm/vendas")}>
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
                      <div>
                        <h2 className="text-sm font-semibold flex items-center gap-2">
                          <BellRing className="w-4 h-4 text-primary" /> Ativar aviso de renovação
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md">
                          Quando ativado, a Wiize monitora os contratos recorrentes, muda o status para
                          <strong> Vencendo</strong> e envia o aviso para o cliente e o responsável comercial.
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Switch checked={settings.enabled} onCheckedChange={handleToggle} disabled={isSaving} />
                        <Badge
                          variant="outline"
                          className={
                            settings.enabled
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {settings.enabled ? "Ativado" : "Desativado"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3 text-[11.5px] text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <Info className="w-3.5 h-3.5 text-primary" /> Regras de aviso
                      </p>
                      <p>• Contratos de até 3 meses: aviso 7 dias antes do vencimento.</p>
                      <p>• Contratos acima de 6 meses: avisos 30 e 15 dias antes.</p>
                      <p>
                        • Contratos de 4 a 6 meses: regra ainda não definida — configure abaixo os dias de
                        antecedência para ativá-la.
                      </p>
                    </div>

                    <div className="mt-3 space-y-1.5 max-w-xs">
                      <Label className="text-xs">Contratos de 4 a 6 meses — avisar com (dias)</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Desativado"
                        value={settings.notice_days_4_6_months ?? ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notice_days_4_6_months: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="h-9"
                      />
                      <p className="text-[10.5px] text-muted-foreground">
                        Deixe vazio para não enviar avisos nessa faixa.
                      </p>
                    </div>
                  </Card>

                  <Card className="p-4 rounded-2xl border-border/40 space-y-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" /> Personalização
                    </h2>

                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" /> Logo da empresa
                      </Label>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                          {settings.logo_url ? (
                            <img src={settings.logo_url} alt="Logo do e-mail" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={(e) => handleLogo(e.target.files?.[0])}
                          />
                          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                            {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                            Enviar logo
                          </Button>
                          {settings.logo_url && (
                            <Button size="sm" variant="ghost" onClick={() => save({ logo_url: null })}>
                              Remover
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {colorField("Cor do cabeçalho", settings.header_color, (v) =>
                        setSettings({ ...settings, header_color: v })
                      )}
                      {colorField("Cor do botão", settings.button_color, (v) =>
                        setSettings({ ...settings, button_color: v })
                      )}
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome do remetente</Label>
                        <Input
                          value={settings.sender_name}
                          onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                          className="h-9"
                          maxLength={60}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-primary" /> Endereço do remetente
                        </Label>
                        <div className="flex items-center">
                          <Input
                            value={settings.sender_local_part}
                            onChange={(e) =>
                              setSettings({ ...settings, sender_local_part: normalizeSenderLocalPart(e.target.value) })
                            }
                            className="h-9 rounded-r-none"
                            placeholder="renovacao"
                          />
                          <span className="h-9 inline-flex items-center rounded-r-md border border-l-0 border-border bg-muted px-2 text-xs text-muted-foreground">
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
                      <Label className="text-xs">Título padrão do e-mail</Label>
                      <Input
                        value={settings.email_title}
                        onChange={(e) => setSettings({ ...settings, email_title: e.target.value })}
                        className="h-9"
                        maxLength={120}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Mensagem de abertura</Label>
                      <Textarea
                        value={settings.email_intro}
                        onChange={(e) => setSettings({ ...settings, email_intro: e.target.value })}
                        rows={3}
                        maxLength={500}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Texto do botão</Label>
                      <Input
                        value={settings.cta_label}
                        onChange={(e) => setSettings({ ...settings, cta_label: e.target.value })}
                        className="h-9"
                        maxLength={40}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                        Salvar configurações
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 rounded-2xl border-border/40">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" /> Teste
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      O teste é enviado para o e-mail de login da sua conta
                      {user?.email ? <strong> ({user.email})</strong> : null} usando a configuração atual.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Button size="sm" onClick={handleTest} disabled={sendingTest}>
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
                    <Eye className="w-4 h-4 text-primary" />
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
