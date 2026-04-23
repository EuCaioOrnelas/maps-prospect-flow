import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  id: number;
  program_enabled: boolean;
  bronze_commission_percent: number;
  silver_commission_percent: number;
  gold_commission_percent: number;
  platinum_commission_percent: number;
  silver_threshold_clients: number;
  gold_threshold_clients: number;
  release_days: number;
  minimum_withdrawal_cents: number;
  allow_multiple_pending_withdrawals: boolean;
  partner_portal_domain: string | null;
  admin_notification_emails: string[] | null;
}

export default function AdminPartnersSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailsInput, setEmailsInput] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("partner_settings").select("*").eq("id", 1).maybeSingle();
      setS(data as any);
      setEmailsInput((data?.admin_notification_emails || []).join(", "));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const emails = emailsInput.split(",").map((e) => e.trim()).filter(Boolean);
    const { error } = await supabase.from("partner_settings").update({
      program_enabled: s.program_enabled,
      bronze_commission_percent: s.bronze_commission_percent,
      silver_commission_percent: s.silver_commission_percent,
      gold_commission_percent: s.gold_commission_percent,
      platinum_commission_percent: s.platinum_commission_percent,
      silver_threshold_clients: s.silver_threshold_clients,
      gold_threshold_clients: s.gold_threshold_clients,
      release_days: s.release_days,
      minimum_withdrawal_cents: s.minimum_withdrawal_cents,
      allow_multiple_pending_withdrawals: s.allow_multiple_pending_withdrawals,
      partner_portal_domain: s.partner_portal_domain,
      admin_notification_emails: emails,
    }).eq("id", 1);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Configurações salvas" });
  };

  if (loading || !s) {
    return <div className="p-6"><Card><CardContent className="py-16 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" />Carregando...</CardContent></Card></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Configurações do Programa</h1>
        <p className="text-sm text-muted-foreground">Ajuste comissões, prazos e regras do programa de parceiros</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Status do programa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Programa ativo</Label>
              <p className="text-xs text-muted-foreground">Quando desativado, novas comissões não serão geradas.</p>
            </div>
            <Switch checked={s.program_enabled} onCheckedChange={(v) => setS({ ...s, program_enabled: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comissões por nível (%)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["bronze", "silver", "gold", "platinum"] as const).map((lvl) => (
            <div key={lvl} className="space-y-2">
              <Label className="capitalize">{lvl}</Label>
              <Input type="number" step="0.01" min="0" max="100" value={s[`${lvl}_commission_percent`]} onChange={(e) => setS({ ...s, [`${lvl}_commission_percent`]: Number(e.target.value) })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Promoção automática (clientes pagos)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Threshold Silver</Label>
            <Input type="number" min="0" value={s.silver_threshold_clients} onChange={(e) => setS({ ...s, silver_threshold_clients: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Threshold Gold</Label>
            <Input type="number" min="0" value={s.gold_threshold_clients} onChange={(e) => setS({ ...s, gold_threshold_clients: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Saques</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo de liberação (dias)</Label>
              <Input type="number" min="0" value={s.release_days} onChange={(e) => setS({ ...s, release_days: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Dias após a venda para liberar comissão.</p>
            </div>
            <div className="space-y-2">
              <Label>Saque mínimo (R$)</Label>
              <Input type="number" min="0" step="10" value={s.minimum_withdrawal_cents / 100} onChange={(e) => setS({ ...s, minimum_withdrawal_cents: Math.round(Number(e.target.value) * 100) })} />
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <Label>Permitir múltiplos saques pendentes</Label>
            <Switch checked={s.allow_multiple_pending_withdrawals} onCheckedChange={(v) => setS({ ...s, allow_multiple_pending_withdrawals: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notificações & Domínio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Domínio do portal de parceiros</Label>
            <Input value={s.partner_portal_domain || ""} onChange={(e) => setS({ ...s, partner_portal_domain: e.target.value })} placeholder="partners.wiize.com.br" />
            <p className="text-xs text-muted-foreground">Opcional. O portal funciona em /partners/login no domínio principal.</p>
          </div>
          <div className="space-y-2">
            <Label>Emails para notificações admin</Label>
            <Input value={emailsInput} onChange={(e) => setEmailsInput(e.target.value)} placeholder="admin@wiize.com.br, financeiro@wiize.com.br" />
            <p className="text-xs text-muted-foreground">Separados por vírgula. Recebem aviso de novos saques.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar configurações
        </Button>
      </div>
    </div>
  );
}
