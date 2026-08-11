import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarClock, Eye, Info, Loader2, Mail, Palette, RotateCcw, Send, Type, MousePointerClick, MessageSquareText } from "lucide-react";
import { ColorField } from "@/components/ui/color-field";
import { LogoDropField } from "@/components/ui/logo-drop-field";
import { toast } from "sonner";
import { useAppointmentEmailSettings } from "@/hooks/useAppointmentEmailSettings";
import {
  APPOINTMENT_VARIABLES,
  DEFAULT_APPOINTMENT_BODY,
  SAMPLE_APPOINTMENT_VARS,
  SENDER_DOMAIN,
  isValidSenderLocalPart,
  renderAppointmentEmail,
} from "@/lib/appointmentEmailTemplate";

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarClock;
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

const normalizeSender = (v: string) =>
  v.split("@")[0].trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);

export function AppointmentEmailSettingsPanel() {
  const { user } = useAuth();
  const { settings, setSettings, isLoading, isSaving, save, uploadLogo } =
    useAppointmentEmailSettings();
  const [uploading, setUploading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const senderValid = isValidSenderLocalPart(settings.sender_local_part || "");
  const preview = useMemo(
    () => renderAppointmentEmail(settings, SAMPLE_APPOINTMENT_VARS).html,
    [settings]
  );

  const handleToggle = async (enabled: boolean) => {
    try {
      await save({ enabled });
      toast.success(enabled ? "Lembretes de compromisso ativados" : "Lembretes de compromisso desativados");
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
      const { data, error } = await supabase.functions.invoke("crm-appointment-test-email", {
        body: { settings },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`E-mail de teste enviado para ${(data as any)?.sent_to || user?.email}`);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar o teste");
    } finally {
      setSendingTest(false);
    }
  };

  /** Insere a variável na posição atual do cursor do corpo do e-mail. */
  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    const el = bodyRef.current;
    const body = settings.email_body || "";
    if (!el) {
      setSettings({ ...settings, email_body: `${body}${token}` });
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setSettings({ ...settings, email_body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
        <Card className="p-5 sm:p-6 rounded-2xl border-border/40">
          <div className="flex items-start justify-between gap-4">
            <SectionHeader
              icon={CalendarClock}
              title="Ativar lembretes de compromisso"
              description="Quando ativado, a Wiize envia o lembrete por e-mail antes de cada compromisso da Agenda, respeitando a antecedência configurada em cada evento."
            />
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

          <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3 text-[11.5px] text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Info className="w-3.5 h-3.5 text-primary" /> Como funciona
            </p>
            <p>• A equipe recebe o lembrete com a antecedência escolhida no compromisso.</p>
            <p>• O cliente convidado recebe no dia, 1 hora antes e 10 minutos antes.</p>
            <p>• Cada lembrete é registrado e nunca é enviado duas vezes para o mesmo destinatário.</p>
          </div>

          <div className="mt-3 flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3">
            <div>
              <p className="text-xs font-medium">Enviar também para o cliente convidado</p>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">
                Vale apenas para compromissos com e-mail do contato preenchido.
              </p>
            </div>
            <Switch
              checked={settings.notify_client}
              onCheckedChange={(v) => setSettings({ ...settings, notify_client: v })}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl border-border/40 space-y-5">
          <SectionHeader
            icon={Palette}
            title="Identidade visual e conteúdo"
            description="Logo, cores, remetente e o texto que o destinatário vai ler."
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
              <Label className="text-xs flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-primary" /> Nome do remetente</Label>
              <Input
                value={settings.sender_name}
                onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                className="h-10 rounded-xl"
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
                  onChange={(e) => setSettings({ ...settings, sender_local_part: normalizeSender(e.target.value) })}
                  className="h-10 rounded-l-xl rounded-r-none"
                  placeholder="agenda"
                />
                <span className="h-10 inline-flex items-center rounded-r-xl border border-l-0 border-border bg-muted px-2 text-xs text-muted-foreground">
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
            <Label className="text-xs flex items-center gap-1.5"><Type className="w-3.5 h-3.5 text-primary" /> Título/assunto do e-mail</Label>
            <Input
              value={settings.email_title}
              onChange={(e) => setSettings({ ...settings, email_title: e.target.value })}
              className="h-10 rounded-xl"
              maxLength={140}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs flex items-center gap-1.5"><MessageSquareText className="w-3.5 h-3.5 text-primary" /> Conteúdo do e-mail</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                onClick={() => setSettings({ ...settings, email_body: DEFAULT_APPOINTMENT_BODY })}
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Restaurar padrão
              </Button>
            </div>
            <Textarea
              ref={bodyRef}
              value={settings.email_body}
              onChange={(e) => setSettings({ ...settings, email_body: e.target.value })}
              rows={12}
              maxLength={4000}
              className="rounded-xl font-mono text-xs leading-relaxed"
            />
            <p className="text-[10.5px] text-muted-foreground">
              Linhas com variáveis sem valor são removidas automaticamente do e-mail final.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {APPOINTMENT_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  title={v.label}
                  className="px-2 py-1 rounded-lg border border-border/60 bg-muted/40 text-[10.5px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-primary" /> Texto do botão</Label>
            <Input
              value={settings.cta_label}
              onChange={(e) => setSettings({ ...settings, cta_label: e.target.value })}
              className="h-10 rounded-xl"
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

        <Card className="p-5 sm:p-6 rounded-2xl border-border/40">
          <SectionHeader
            icon={Send}
            title="Enviar e-mail de teste"
            description={`O teste vai para o e-mail de login da sua conta${user?.email ? ` (${user.email})` : ""} com dados fictícios de compromisso.`}
          />
          <div className="flex flex-wrap items-center gap-3">
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

      <div className="space-y-3 xl:sticky xl:top-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Eye className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Preview do e-mail</h2>
        </div>
        <Card className="rounded-2xl border-border/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/60 text-xs text-muted-foreground">
            De: <strong className="text-foreground">{settings.sender_name}</strong>{" "}
            &lt;{settings.sender_local_part || "agenda"}
            {SENDER_DOMAIN}&gt;
          </div>
          <iframe
            title="Preview do e-mail de compromisso"
            srcDoc={preview}
            className="w-full h-[720px] bg-white"
          />
        </Card>
      </div>
    </div>
  );
}

export default AppointmentEmailSettingsPanel;
