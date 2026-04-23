import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Loader2,
  Save,
  Settings as SettingsIcon,
  Power,
  Percent,
  TrendingUp,
  Wallet,
  Bell,
  HelpCircle,
  Award,
  Crown,
  Medal,
  Gem,
  Mail,
  Globe,
  Clock,
  DollarSign,
  Layers,
} from "lucide-react";
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

const levelMeta = {
  bronze: { icon: Medal, color: "text-amber-600", bg: "from-amber-500/20 to-amber-600/5", ring: "ring-amber-500/30" },
  silver: { icon: Award, color: "text-slate-400", bg: "from-slate-400/20 to-slate-500/5", ring: "ring-slate-400/30" },
  gold: { icon: Crown, color: "text-yellow-500", bg: "from-yellow-500/20 to-yellow-600/5", ring: "ring-yellow-500/30" },
  platinum: { icon: Gem, color: "text-sky-400", bg: "from-sky-400/20 to-sky-500/5", ring: "ring-sky-400/30" },
} as const;

function HelpHint({ text }: { text: string }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center text-muted-foreground/60 hover:text-primary transition-colors"
          aria-label="Saiba mais"
        >
          <HelpCircle size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  accent = "primary",
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
  accent?: "primary" | "amber" | "emerald" | "violet" | "sky";
}) {
  const accents = {
    primary: "before:bg-primary/30",
    amber: "before:bg-primary/30",
    emerald: "before:bg-primary/30",
    violet: "before:bg-primary/30",
    sky: "before:bg-primary/30",
  };
  const iconBg = {
    primary: "bg-primary/10 text-primary ring-primary/20",
    amber: "bg-primary/10 text-primary ring-primary/20",
    emerald: "bg-primary/10 text-primary ring-primary/20",
    violet: "bg-primary/10 text-primary ring-primary/20",
    sky: "bg-primary/10 text-primary ring-primary/20",
  };

  return (
    <Card
      className={`relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm before:absolute before:inset-x-0 before:-top-24 before:h-40 before:blur-3xl before:opacity-60 ${accents[accent]}`}
    >
      <CardHeader className="relative pb-4">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 rounded-xl p-2.5 ring-1 ${iconBg[accent]}`}>
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">{children}</CardContent>
    </Card>
  );
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
    const { error } = await supabase
      .from("partner_settings")
      .update({
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
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Configurações salvas", description: "As alterações entram em vigor imediatamente." });
  };

  if (loading || !s) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-border/60">
          <CardContent className="py-20 text-center text-muted-foreground">
            <Loader2 className="animate-spin mx-auto mb-3" />
            Carregando configurações...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/20 p-6 lg:p-8 backdrop-blur-sm">
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/15 p-3 ring-1 ring-primary/30 shadow-lg shadow-primary/10">
                <SettingsIcon size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Configurações do Programa</h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Defina comissões, prazos de liberação, regras de promoção automática e canais de notificação do
                  Programa de Parceiros.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 backdrop-blur-sm">
              <span className={`h-2 w-2 rounded-full ${s.program_enabled ? "bg-emerald-500 shadow-emerald-500/50 shadow-md animate-pulse" : "bg-muted-foreground/40"}`} />
              <span className="text-xs font-medium">{s.program_enabled ? "Programa ativo" : "Programa pausado"}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <SectionCard
          icon={Power}
          title="Status do Programa"
          description="Liga/desliga a geração de novas comissões para todo o programa."
          accent="emerald"
        >
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-start gap-3">
              <div>
                <Label className="text-sm font-medium">Programa ativo</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quando desativado, novas vendas <strong>não geram comissões</strong>. Saques pendentes continuam
                  funcionando normalmente.
                </p>
              </div>
            </div>
            <Switch checked={s.program_enabled} onCheckedChange={(v) => setS({ ...s, program_enabled: v })} />
          </div>
        </SectionCard>

        {/* Commissions */}
        <SectionCard
          icon={Percent}
          title="Comissões por Nível (%)"
          description="Percentual pago ao parceiro sobre cada venda recorrente, conforme o nível atual."
          accent="primary"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(["bronze", "silver", "gold", "platinum"] as const).map((lvl) => {
              const meta = levelMeta[lvl];
              const Icon = meta.icon;
              return (
                <div
                  key={lvl}
                  className={`group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br ${meta.bg} p-4 transition-all hover:ring-2 ${meta.ring} hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`rounded-lg bg-background/60 p-1.5 ring-1 ring-border/60 ${meta.color}`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{lvl}</span>
                  </div>
                  <Label className="text-xs text-muted-foreground">Comissão</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={s[`${lvl}_commission_percent`]}
                      onChange={(e) => setS({ ...s, [`${lvl}_commission_percent`]: Number(e.target.value) })}
                      className="pr-7 text-lg font-semibold bg-background/80"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/40 p-3">
            <HelpCircle size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Exemplo: parceiro <strong>Gold</strong> com 30% indicando uma assinatura Growth de R$ 696/mês recebe{" "}
              <strong>R$ 208,80 todo mês</strong> enquanto o cliente permanecer ativo.
            </p>
          </div>
        </SectionCard>

        {/* Auto-promotion */}
        <SectionCard
          icon={TrendingUp}
          title="Promoção Automática de Nível"
          description="O parceiro sobe de nível automaticamente quando atinge X clientes pagantes ativos."
          accent="violet"
        >
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
            <Layers size={16} className="mt-0.5 shrink-0 text-primary" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Como funciona:</strong> todo parceiro começa em <em>Bronze</em>. Ao
              atingir o <em>Threshold Silver</em> de clientes pagantes, é promovido para Silver (e passa a ganhar a
              comissão Silver). Atingindo o <em>Threshold Gold</em>, vai para Gold. Platinum é promoção manual feita por
              vocês.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award size={14} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Threshold Silver</Label>
                </div>
                <HelpHint text="Quantidade de clientes pagantes ativos que o parceiro precisa ter para ser promovido automaticamente de Bronze para Silver." />
              </div>
              <Input
                type="number"
                min="0"
                value={s.silver_threshold_clients}
                onChange={(e) => setS({ ...s, silver_threshold_clients: Number(e.target.value) })}
                className="bg-background/80"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Atingiu <strong>{s.silver_threshold_clients}</strong> clientes pagos → vira Silver
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Threshold Gold</Label>
                </div>
                <HelpHint text="Quantidade de clientes pagantes ativos para o parceiro ser promovido de Silver para Gold automaticamente." />
              </div>
              <Input
                type="number"
                min="0"
                value={s.gold_threshold_clients}
                onChange={(e) => setS({ ...s, gold_threshold_clients: Number(e.target.value) })}
                className="bg-background/80"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Atingiu <strong>{s.gold_threshold_clients}</strong> clientes pagos → vira Gold
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Withdrawals */}
        <SectionCard
          icon={Wallet}
          title="Regras de Saque"
          description="Prazos de liberação de comissões e limites mínimos para retirada."
          accent="amber"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Prazo de liberação</Label>
                </div>
                <HelpHint text="Janela anti-fraude e anti-chargeback. A comissão fica como 'pendente' por X dias antes de ficar 'disponível para saque'." />
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={s.release_days}
                  onChange={(e) => setS({ ...s, release_days: Number(e.target.value) })}
                  className="pr-14 bg-background/80"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">dias</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Após a venda, comissão libera em <strong>{s.release_days} dias</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Saque mínimo</Label>
                </div>
                <HelpHint text="Valor mínimo acumulado em comissões disponíveis para que o parceiro consiga solicitar um saque." />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={s.minimum_withdrawal_cents / 100}
                  onChange={(e) => setS({ ...s, minimum_withdrawal_cents: Math.round(Number(e.target.value) * 100) })}
                  className="pl-9 bg-background/80"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Solicita saque a partir de{" "}
                <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.minimum_withdrawal_cents / 100)}</strong>.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-start gap-2">
              <div>
                <Label className="text-sm font-medium">Permitir múltiplos saques pendentes</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se desativado, parceiro só pode abrir um novo saque após o anterior ser pago/recusado.
                </p>
              </div>
            </div>
            <Switch
              checked={s.allow_multiple_pending_withdrawals}
              onCheckedChange={(v) => setS({ ...s, allow_multiple_pending_withdrawals: v })}
            />
          </div>
        </SectionCard>

        {/* Notifications & Domain */}
        <SectionCard
          icon={Bell}
          title="Notificações & Domínio"
          description="Configure o portal do parceiro e quem recebe alertas administrativos."
          accent="sky"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Domínio do portal de parceiros</Label>
                </div>
                <HelpHint text="Domínio personalizado opcional. Mesmo sem isso, o portal funciona em /partners/login no domínio principal da Wiize." />
              </div>
              <Input
                value={s.partner_portal_domain || ""}
                onChange={(e) => setS({ ...s, partner_portal_domain: e.target.value })}
                placeholder="partners.wiize.com.br"
                className="bg-background/80 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Opcional. Sem configuração, parceiros acessam em{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">/partners/login</code>.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Emails para notificações admin</Label>
                </div>
                <HelpHint text="Estes emails recebem aviso quando um parceiro solicita um novo saque ou quando há eventos críticos no programa." />
              </div>
              <Input
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="admin@wiize.com.br, financeiro@wiize.com.br"
                className="bg-background/80"
              />
              <p className="text-xs text-muted-foreground mt-2">Separados por vírgula. Recebem aviso de novos saques.</p>
            </div>
          </div>
        </SectionCard>

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex justify-end">
          <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md shadow-lg shadow-primary/10 px-3 py-2 flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">Alterações entram em vigor ao salvar.</span>
            <Button onClick={save} disabled={saving} size="sm" className="gap-2 shadow-md shadow-primary/20">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
