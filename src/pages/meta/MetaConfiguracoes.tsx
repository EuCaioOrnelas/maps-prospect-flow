import { useEffect, useState } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, ShieldCheck, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Settings = {
  notify_number_disconnected: boolean;
  notify_quality_drop: boolean;
  notify_daily_summary: boolean;
  notify_campaign_issues: boolean;
  security_hmac_required: boolean;
  security_ip_allowlist: boolean;
  security_audit_log: boolean;
};

const DEFAULTS: Settings = {
  notify_number_disconnected: true,
  notify_quality_drop: true,
  notify_daily_summary: false,
  notify_campaign_issues: true,
  security_hmac_required: true,
  security_ip_allowlist: true,
  security_audit_log: true,
};

export default function MetaConfiguracoes() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("meta_user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          notify_number_disconnected: data.notify_number_disconnected,
          notify_quality_drop: data.notify_quality_drop,
          notify_daily_summary: data.notify_daily_summary,
          notify_campaign_issues: data.notify_campaign_issues,
          security_hmac_required: data.security_hmac_required,
          security_ip_allowlist: data.security_ip_allowlist,
          security_audit_log: data.security_audit_log,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    if (!user) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSaving(true);
    const { error } = await supabase
      .from("meta_user_settings")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar preferência");
      setSettings(settings);
    } else {
      toast.success("Preferência salva");
    }
  };

  const sendTestEmail = async () => {
    if (!user) return;
    setSendingTest(true);
    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        user_id: user.id,
        email_type: "META_NUMBER_DISCONNECTED",
        payload: {
          phone_number: "+55 11 90000-0000",
          business_name: "E-mail de teste",
        },
        idempotency_key: `meta-test-${user.id}-${Date.now()}`,
      },
    });
    setSendingTest(false);
    if (error) toast.error("Falha ao enviar e-mail de teste");
    else toast.success("E-mail de teste enviado! Verifique sua caixa de entrada.");
  };

  if (loading) {
    return (
      <MetaLayout title="Configurações" description="Preferências da operação Meta.">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MetaLayout>
    );
  }

  return (
    <MetaLayout title="Configurações" description="Preferências da operação Meta.">
      <MetaPageHeader
        title="Configurações"
        description="Escolha quais alertas receber por e-mail e as regras de segurança da sua operação Meta."
      />

      <Tabs defaultValue="notifications">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="notifications">
            <Bell size={13} className="mr-1.5" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck size={13} className="mr-1.5" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-5 space-y-4">
          <Card className="p-5 border-border/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <p className="text-sm font-semibold">Alertas por e-mail</p>
                <p className="text-xs text-muted-foreground">
                  Os alertas são enviados para <strong>{user?.email}</strong>.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={sendTestEmail}
                disabled={sendingTest}
                className="gap-2"
              >
                {sendingTest ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                Enviar teste
              </Button>
            </div>
            <ToggleRow
              title="Número desconectado"
              desc="Avisar quando um número WhatsApp Meta perder a conexão (token expirado, etc.)"
              checked={settings.notify_number_disconnected}
              onChange={(v) => updateSetting("notify_number_disconnected", v)}
            />
            <ToggleRow
              title="Queda de qualidade do número"
              desc="Avisar quando o quality rating de um número cair (amarelo ou vermelho)"
              checked={settings.notify_quality_drop}
              onChange={(v) => updateSetting("notify_quality_drop", v)}
            />
            <ToggleRow
              title="Problemas em campanhas"
              desc="Falhas no início, pausas inesperadas ou alta taxa de erro nos disparos"
              checked={settings.notify_campaign_issues}
              onChange={(v) => updateSetting("notify_campaign_issues", v)}
            />
            <ToggleRow
              title="Resumo diário"
              desc="Receba todo dia às 18h um resumo das mensagens enviadas, lidas e respondidas"
              checked={settings.notify_daily_summary}
              onChange={(v) => updateSetting("notify_daily_summary", v)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-5 space-y-4">
          <Card className="p-5 border-border/60 space-y-3">
            <div className="pb-2 border-b border-border/60">
              <p className="text-sm font-semibold">Proteções da integração Meta</p>
              <p className="text-xs text-muted-foreground">
                Recomendamos manter todas ativas. Elas protegem sua operação contra acessos indevidos.
              </p>
            </div>
            <ToggleRow
              title="Validação de assinatura (HMAC)"
              desc="Rejeitar webhooks que não vierem assinados pela Meta. Bloqueia payloads falsificados."
              checked={settings.security_hmac_required}
              onChange={(v) => updateSetting("security_hmac_required", v)}
            />
            <ToggleRow
              title="Allowlist de IPs da Meta"
              desc="Aceitar callbacks apenas de IPs oficiais da Meta. Bloqueia origens desconhecidas."
              checked={settings.security_ip_allowlist}
              onChange={(v) => updateSetting("security_ip_allowlist", v)}
            />
            <ToggleRow
              title="Registro de auditoria"
              desc="Registrar toda alteração crítica (conexões, tokens, campanhas) para consulta posterior."
              checked={settings.security_audit_log}
              onChange={(v) => updateSetting("security_audit_log", v)}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {saving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 text-xs text-muted-foreground bg-background/95 border border-border/60 rounded-md px-3 py-1.5 shadow">
          <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
        </div>
      )}
    </MetaLayout>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
