import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  ShieldCheck,
  Bell,
  History,
  Wallet,
  AlertTriangle,
  FileBarChart,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, SectionCard } from "@/components/wiize-api/WiizeApiUI";
import { TwoFactorPanel } from "@/components/security/TwoFactorPanel";
import { useApiKeys } from "@/hooks/useWiizeApi";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type PrefKey = "low_balance" | "request_errors" | "monthly_report";

const NOTIFICATIONS: { key: PrefKey; label: string; desc: string; icon: typeof Bell }[] = [
  { key: "low_balance", label: "Saldo baixo", desc: "Aviso quando o saldo atingir o limite configurado.", icon: Wallet },
  { key: "request_errors", label: "Erros de requisição", desc: "Resumo de falhas recorrentes nas chamadas.", icon: AlertTriangle },
  { key: "monthly_report", label: "Relatório mensal", desc: "Consumo e custos do mês fechado.", icon: FileBarChart },
];

export default function ApiSettings() {
  const { toast } = useToast();
  const { data: keys = [] } = useApiKeys();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    low_balance: true,
    request_errors: true,
    monthly_report: false,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saving, setSaving] = useState<PrefKey | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("wiize_api_notification_prefs")
        .select("low_balance, request_errors, monthly_report")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setPrefs({
          low_balance: data.low_balance,
          request_errors: data.request_errors,
          monthly_report: data.monthly_report,
        });
      }
      setLoadingPrefs(false);
    })();
    return () => { active = false; };
  }, []);

  const updatePref = async (key: PrefKey, value: boolean) => {
    const previous = prefs[key];
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaving(key);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("wiize_api_notification_prefs")
        .upsert({ user_id: userId, ...prefs, [key]: value }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (err: any) {
      setPrefs((p) => ({ ...p, [key]: previous }));
      toast({
        title: "Não foi possível salvar",
        description: err?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const sendTestEmail = async () => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("wiize-api-notify", {
        body: { type: "test" },
      });
      if (error) throw error;
      toast({ title: "E-mail enviado", description: "Confira sua caixa de entrada e o spam." });
    } catch (err: any) {
      toast({
        title: "Falha ao enviar",
        description: err?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const demo = () =>
    toast({ title: "Interface de demonstração", description: "Será habilitado na implementação do backend." });

  return (
    <>
      <Helmet>
        <title>Settings — Wiize API</title>
        <meta name="description" content="Segurança, sessões ativas, aparência e notificações da sua conta Wiize API." />
      </Helmet>

      <PageHeader title="Settings" description="Segurança, sessões, aparência e notificações." />

      <ThemeToggle />

      <SectionCard title="Segurança" description="Proteja o acesso à sua conta de infraestrutura" icon={ShieldCheck}>
        <div className="rounded-lg border border-border/70 p-4">
          <TwoFactorPanel />
        </div>

        <Button variant="outline" size="sm" className="mt-4" onClick={demo}>
          Alterar senha
        </Button>
      </SectionCard>

      <SectionCard
        title="Notificações"
        description="Avisos por e-mail sobre a sua operação"
        icon={Bell}
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={sendTestEmail} disabled={testing}>
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Enviar e-mail de teste
          </Button>
        }
      >
        {NOTIFICATIONS.map((n) => (
          <div key={n.key} className="flex items-center justify-between gap-4 border-b border-border/60 py-3 first:pt-0 last:border-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-hover bg-primary/10">
                <n.icon size={15} className="text-primary" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving === n.key && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
              <Switch
                checked={prefs[n.key]}
                disabled={loadingPrefs || saving === n.key}
                onCheckedChange={(v) => updatePref(n.key, v)}
                aria-label={n.label}
              />
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Atividade de segurança" description="Últimos eventos registrados na conta" icon={History}>
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {keys.slice(0, 8).map((k) => (
              <li key={k.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-hover bg-primary/10">
                  <History size={13} className="text-primary" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {k.status === "active" ? "API Key criada" : "API Key revogada"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {k.name} ({k.environment})
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(k.revoked_at || k.created_at).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
