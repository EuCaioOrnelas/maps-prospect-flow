import { useState, useEffect, useCallback } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { TemplateEditorDialog } from "@/components/admin/TemplateEditorDialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Zap, Mail, Target, BarChart3, Settings, Plus, Edit, Trash2,
  Play, Pause, Eye, TrendingUp, Users, MousePointerClick, DollarSign,
  CheckCircle2, XCircle, Clock, Loader2, RefreshCw, Rocket, Activity,
  ArrowUpRight, ArrowDownRight, Hash, Gauge, Star, AlertTriangle,
  ChevronRight, Send, MailOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Automation { id: string; name: string; description: string | null; trigger_event: string; trigger_conditions: any; status: string; automation_type: string; created_at: string; }
interface AutomationStep { id: string; automation_id: string; step_order: number; delay_hours: number; condition: any; action_type: string; template_id: string | null; stop_condition: any; }
interface MessageTemplate { id: string; name: string; subject: string; body: string; variables: any; channel: string; is_active: boolean; }
interface BehaviourTrigger { id: string; name: string; description: string | null; trigger_type: string; conditions: any; entry_rules: any; cooldown_hours: number; priority: number; target_automation_id: string | null; status: string; success_condition: any; stop_condition: any; }

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, color, subtitle }: { label: string; value: string | number; icon: any; color: string; subtitle?: string }) {
  return (
    <Card className="group hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-bold tracking-tight leading-none">{value}</p>
              {subtitle && <span className="text-xs text-muted-foreground/70 truncate">{subtitle}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-none">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────────────
function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={cn("inline-block h-2 w-2 rounded-full", active ? "bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-muted-foreground/30")} />
  );
}

export default function AdminTrialAutomation() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("automations");
  const [loading, setLoading] = useState(true);

  // Data states
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [triggers, setBehaviourTriggers] = useState<BehaviourTrigger[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  

  // Dialog states
  const [editTemplate, setEditTemplate] = useState<MessageTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [runningProcessor, setRunningProcessor] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [automationsRes, stepsRes, templatesRes, triggersRes] = await Promise.all([
      supabase.from("trial_automations").select("*").order("created_at"),
      supabase.from("trial_automation_steps").select("*").order("step_order"),
      supabase.from("trial_message_templates").select("*").order("created_at"),
      supabase.from("trial_behaviour_triggers").select("*").order("priority"),
    ]);

    if (automationsRes.data) setAutomations(automationsRes.data as any[]);
    if (stepsRes.data) setSteps(stepsRes.data as any[]);
    if (templatesRes.data) setTemplates(templatesRes.data as any[]);
    if (triggersRes.data) setBehaviourTriggers(triggersRes.data as any[]);

    const [emailEventsRes, productEventsRes, automationStatesRes, triggerLogsRes, revenueRes] = await Promise.all([
      supabase.from("trial_email_events").select("*"),
      supabase.from("trial_product_events").select("*"),
      supabase.from("trial_user_automation_state").select("*"),
      supabase.from("trial_behaviour_trigger_logs").select("*"),
      supabase.from("trial_revenue_attribution").select("*"),
    ]);

    setAnalytics({
      emailEvents: emailEventsRes.data || [],
      productEvents: productEventsRes.data || [],
      automationStates: automationStatesRes.data || [],
      triggerLogs: triggerLogsRes.data || [],
      revenue: revenueRes.data || [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const toggleAutomationStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("trial_automations").update({ status: newStatus }).eq("id", id);
    toast({ title: `Automação ${newStatus === "active" ? "ativada" : "pausada"}` });
    fetchAll();
  };

  const saveTemplate = async (template: Partial<MessageTemplate>) => {
    if (editTemplate?.id) {
      await supabase.from("trial_message_templates").update(template as any).eq("id", editTemplate.id);
    } else {
      await supabase.from("trial_message_templates").insert(template as any);
    }
    toast({ title: "Template salvo!" });
    setTemplateDialogOpen(false);
    setEditTemplate(null);
    fetchAll();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("trial_message_templates").delete().eq("id", id);
    toast({ title: "Template removido" });
    fetchAll();
  };

  const toggleTriggerStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("trial_behaviour_triggers").update({ status: newStatus }).eq("id", id);
    toast({ title: `Trigger ${newStatus === "active" ? "ativado" : "pausado"}` });
    fetchAll();
  };

  const toggleAllAutomations = async (activate: boolean) => {
    const newStatus = activate ? "active" : "paused";
    await Promise.all(automations.map((a) => supabase.from("trial_automations").update({ status: newStatus }).eq("id", a.id)));
    toast({ title: activate ? "Todos os fluxos ativados" : "Todos os fluxos pausados" });
    fetchAll();
  };

  const toggleAllTriggers = async (activate: boolean) => {
    const newStatus = activate ? "active" : "paused";
    await Promise.all(triggers.map((t) => supabase.from("trial_behaviour_triggers").update({ status: newStatus }).eq("id", t.id)));
    toast({ title: activate ? "Todos os triggers ativados" : "Todos os triggers pausados" });
    fetchAll();
  };




  const sendTestEmail = async (templateId: string) => {
    if (!profile?.email) {
      toast({ title: "Erro", description: "Email do admin não encontrado", variant: "destructive" });
      return;
    }
    setSendingTestEmail(templateId);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-trial-email", {
        body: { templateId, recipientEmail: profile.email },
      });
      if (error) throw error;
      toast({ title: "✉️ Email de teste enviado!", description: `Verifique ${profile.email}` });
    } catch (err: any) {
      toast({ title: "Erro ao enviar teste", description: err.message, variant: "destructive" });
    } finally {
      setSendingTestEmail(null);
    }
  };

  // ─── Analytics Helpers ──────────────────────────────────────────────────────
  const getEmailStats = () => {
    if (!analytics) return { sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 };
    const events = analytics.emailEvents;
    const sent = events.filter((e: any) => e.event_type === "sent").length;
    const opened = events.filter((e: any) => e.event_type === "opened").length;
    const clicked = events.filter((e: any) => e.event_type === "clicked").length;
    return {
      sent, opened, clicked,
      openRate: sent ? Math.round((opened / sent) * 100) : 0,
      clickRate: sent ? Math.round((clicked / sent) * 100) : 0,
    };
  };

  const getAutomationStats = () => {
    if (!analytics) return { entered: 0, active: 0, completed: 0 };
    const states = analytics.automationStates;
    return {
      entered: states.length,
      active: states.filter((s: any) => s.status === "active").length,
      completed: states.filter((s: any) => s.status === "completed").length,
    };
  };

  const getTotalRevenue = () => {
    if (!analytics?.revenue) return 0;
    return analytics.revenue.reduce((sum: number, r: any) => sum + Number(r.revenue_amount || 0), 0);
  };

  const getConversions = () => {
    if (!analytics) return 0;
    return analytics.productEvents.filter((e: any) => e.event_name === "subscription_started").length;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando automações...</p>
        </div>
      </div>
    );
  }

  const emailStats = getEmailStats();
  const automationStats = getAutomationStats();
  const totalRevenue = getTotalRevenue();
  const conversions = getConversions();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <BackgroundGlow />
      <SEO title="Automação Trial | Admin" description="Sistema de automação de trial e ativação" />

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight">Automação Trial</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Motor de conversão e ativação</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] hidden sm:flex">
              <StatusDot active={automations.some((a) => a.status === "active")} />
              <span className="ml-1.5">{automations.filter((a) => a.status === "active").length} fluxos ativos</span>
            </Badge>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchAll}>
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* ─── KPI Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KPICard label="Emails Enviados" value={emailStats.sent} icon={Send} color="bg-blue-500/10 text-blue-400" />
          <KPICard label="Taxa Abertura" value={`${emailStats.openRate}%`} icon={MailOpen} color="bg-emerald-500/10 text-emerald-400" subtitle={`${emailStats.opened} abertos`} />
          <KPICard label="Taxa Clique" value={`${emailStats.clickRate}%`} icon={MousePointerClick} color="bg-amber-500/10 text-amber-400" subtitle={`${emailStats.clicked} cliques`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KPICard label="Em Fluxos" value={automationStats.active} icon={Users} color="bg-purple-500/10 text-purple-400" subtitle={`${automationStats.entered} total`} />
          <KPICard label="Conversões" value={conversions} icon={CheckCircle2} color="bg-primary/10 text-primary" />
          <KPICard label="Receita Atribuída" value={`R$ ${totalRevenue.toFixed(0)}`} icon={DollarSign} color="bg-yellow-500/10 text-yellow-400" />
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9 bg-muted/50 p-0.5">
            <TabsTrigger value="automations" className="text-xs gap-1.5 data-[state=active]:bg-background"><Zap className="h-3 w-3" />Automações</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1.5 data-[state=active]:bg-background"><Mail className="h-3 w-3" />Templates</TabsTrigger>
            <TabsTrigger value="triggers" className="text-xs gap-1.5 data-[state=active]:bg-background"><Target className="h-3 w-3" />Triggers</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs gap-1.5 data-[state=active]:bg-background"><BarChart3 className="h-3 w-3" />Analytics</TabsTrigger>
            <TabsTrigger value="score" className="text-xs gap-1.5 data-[state=active]:bg-background" onClick={(e) => { e.preventDefault(); navigate("/admin/user-scoring"); }}><Gauge className="h-3 w-3" />Score ↗</TabsTrigger>
          </TabsList>

          {/* ═══════════════════════ AUTOMATIONS TAB ═══════════════════════════ */}
          <TabsContent value="automations" className="space-y-5 mt-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Fluxos de Automação</h2>
                <p className="text-sm text-muted-foreground">Gerencie os fluxos de email automatizados para trial</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAllAutomations(true)}>
                  <Play className="h-3 w-3 mr-1" /> Ativar Todos
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAllAutomations(false)}>
                  <Pause className="h-3 w-3 mr-1" /> Pausar Todos
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {automations.map((automation) => {
                const autoSteps = steps.filter((s) => s.automation_id === automation.id);
                const stateCount = analytics?.automationStates?.filter((s: any) => s.automation_id === automation.id).length || 0;
                const activeCount = analytics?.automationStates?.filter((s: any) => s.automation_id === automation.id && s.status === "active").length || 0;

                return (
                  <Card key={automation.id} className={cn("transition-all", automation.status === "active" ? "border-primary/20" : "opacity-70")}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", automation.status === "active" ? "bg-primary/10" : "bg-muted")}>
                            <Zap className={cn("h-5 w-5", automation.status === "active" ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-base">{automation.name}</h3>
                              <StatusDot active={automation.status === "active"} />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{automation.description}</p>
                            <div className="flex items-center gap-3 mt-2.5">
                              <Badge variant="outline" className="text-xs">
                                {automation.trigger_event === "user_inactive" ? "⏰ Inatividade" :
                                 automation.trigger_event === "trial_expiring" ? "⚠️ Trial expirando" :
                                 automation.trigger_event === "trial_ended" ? "🔴 Trial encerrado" : automation.trigger_event}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{autoSteps.length} etapas</span>
                              <span className="text-xs text-muted-foreground">{stateCount} entraram • {activeCount} ativos</span>
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={automation.status === "active"}
                          onCheckedChange={() => toggleAutomationStatus(automation.id, automation.status)}
                        />
                      </div>

                      {/* Steps Timeline */}
                      {autoSteps.length > 0 && (
                        <div className="pl-4 border-l-2 border-border/50 ml-4 space-y-2">
                          {autoSteps.map((step, i) => {
                            const template = templates.find((t) => t.id === step.template_id);
                            return (
                              <div key={step.id} className="flex items-center gap-3 relative">
                                <div className="absolute -left-[21px] h-3 w-3 rounded-full bg-muted border-2 border-border" />
                                <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-md px-3 py-1.5 flex-1">
                                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">
                                    {step.delay_hours >= 24 ? `${Math.round(step.delay_hours / 24)}d` : `${step.delay_hours}h`}
                                  </span>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                                  <Mail className="h-3 w-3 text-blue-400 shrink-0" />
                                  <span className="font-medium truncate">{template?.name || "Sem template"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ═══════════════════════ TEMPLATES TAB ═════════════════════════════ */}
          <TabsContent value="templates" className="space-y-5 mt-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Templates de Email</h2>
                <p className="text-sm text-muted-foreground">Crie e edite templates com preview em tempo real</p>
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={() => { setEditTemplate(null); setTemplateDialogOpen(true); }}>
                <Plus className="h-3 w-3 mr-1.5" />Novo Template
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((template) => {
                const tEvents = analytics?.emailEvents?.filter((e: any) => e.email_template_id === template.id) || [];
                const sent = tEvents.filter((e: any) => e.event_type === "sent").length;
                const opened = tEvents.filter((e: any) => e.event_type === "opened").length;
                const clicked = tEvents.filter((e: any) => e.event_type === "clicked").length;

                return (
                  <Card key={template.id} className={cn("group hover:border-primary/20 transition-all", !template.is_active && "opacity-60")}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm leading-tight">{template.name}</h3>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{template.subject}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <StatusDot active={template.is_active} />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400"
                                  onClick={() => sendTestEmail(template.id)}
                                  disabled={sendingTestEmail === template.id}
                                >
                                  {sendingTestEmail === template.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">Enviar email de teste</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditTemplate(template); setTemplateDialogOpen(true); }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => deleteTemplate(template.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Mini stats */}
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-muted/30 rounded-md p-2 text-center">
                          <p className="text-lg font-bold">{sent}</p>
                          <p className="text-[10px] text-muted-foreground">Enviados</p>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2 text-center">
                          <p className="text-lg font-bold">{sent ? `${Math.round((opened / sent) * 100)}%` : "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Open Rate</p>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2 text-center">
                          <p className="text-lg font-bold">{sent ? `${Math.round((clicked / sent) * 100)}%` : "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Click Rate</p>
                        </div>
                      </div>

                      {/* Preview snippet */}
                      <div className="mt-3 text-[10px] text-muted-foreground/60 bg-muted/20 rounded p-2 max-h-12 overflow-hidden leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(template.body.substring(0, 120) + "...") }} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <TemplateEditorDialog
              open={templateDialogOpen}
              onOpenChange={(open) => { setTemplateDialogOpen(open); if (!open) setEditTemplate(null); }}
              template={editTemplate}
              onSave={saveTemplate}
            />
          </TabsContent>

          {/* ═══════════════════════ TRIGGERS TAB ══════════════════════════════ */}
          <TabsContent value="triggers" className="space-y-5 mt-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Triggers Comportamentais</h2>
                <p className="text-sm text-muted-foreground">Regras automáticas baseadas no comportamento do usuário</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{triggers.filter((t) => t.status === "active").length} ativos</Badge>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAllTriggers(true)}>
                  <Play className="h-3 w-3 mr-1" /> Ativar
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAllTriggers(false)}>
                  <Pause className="h-3 w-3 mr-1" /> Pausar
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {triggers.map((trigger) => {
                const logs = analytics?.triggerLogs?.filter((l: any) => l.trigger_id === trigger.id) || [];
                const matched = logs.filter((l: any) => l.action === "behavior_trigger_matched").length;
                const entered = logs.filter((l: any) => l.action === "behavior_automation_entered").length;
                const targetAutomation = automations.find((a) => a.id === trigger.target_automation_id);

                return (
                  <Card key={trigger.id} className={cn("transition-all", trigger.status === "active" ? "border-primary/10" : "opacity-60")}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", trigger.status === "active" ? "bg-amber-500/10" : "bg-muted")}>
                            <Target className={cn("h-5 w-5", trigger.status === "active" ? "text-amber-400" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-base">{trigger.name}</h3>
                              <Badge variant="outline" className="text-xs font-mono">P{trigger.priority}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{trigger.description}</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                <strong>{matched}</strong> qualificados
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <ArrowUpRight className="h-3 w-3 text-blue-400" />
                                <strong>{entered}</strong> entraram
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Cooldown: {trigger.cooldown_hours}h
                              </span>
                              {targetAutomation && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Zap className="h-3 w-3 text-primary" />
                                  → {targetAutomation.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={trigger.status === "active"}
                          onCheckedChange={() => toggleTriggerStatus(trigger.id, trigger.status)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ═══════════════════════ ANALYTICS TAB ═════════════════════════════ */}
          <TabsContent value="analytics" className="space-y-6 mt-5">
            {/* Funnel at top */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Funil de Conversão Trial</CardTitle>
                </div>
                <CardDescription className="text-sm">Dados reais do sistema de automação</CardDescription>
              </CardHeader>
              <CardContent>
                <TrialFunnel analytics={analytics} />
              </CardContent>
            </Card>

            {/* Email Performance per Template */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-xl">Performance Individual de Emails</CardTitle>
                </div>
                <CardDescription className="text-sm">Métricas reais por template de email</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-sm">Template</TableHead>
                        <TableHead className="text-sm text-center">Enviados</TableHead>
                        <TableHead className="text-sm text-center">Abertos</TableHead>
                        <TableHead className="text-sm text-center">Open Rate</TableHead>
                        <TableHead className="text-sm text-center">Cliques</TableHead>
                        <TableHead className="text-sm text-center">Click Rate</TableHead>
                        <TableHead className="text-sm text-right">Receita</TableHead>
                        <TableHead className="text-sm text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => {
                        const tEvents = analytics?.emailEvents?.filter((e: any) => e.email_template_id === template.id) || [];
                        const sent = tEvents.filter((e: any) => e.event_type === "sent").length;
                        const opened = tEvents.filter((e: any) => e.event_type === "opened").length;
                        const clicked = tEvents.filter((e: any) => e.event_type === "clicked").length;
                        const rev = (analytics?.revenue || []).filter((r: any) => r.email_template_id === template.id).reduce((s: number, r: any) => {
                          const amount = Number(r.revenue_amount || 0);
                          const discount = Number(r.coupon_discount || 0);
                          return s + (amount - discount);
                        }, 0);
                        const openRate = sent ? Math.round((opened / sent) * 100) : 0;
                        const clickRate = sent ? Math.round((clicked / sent) * 100) : 0;

                        return (
                          <TableRow key={template.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusDot active={template.is_active} />
                                <span className="text-sm font-medium">{template.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm font-mono">{sent}</TableCell>
                            <TableCell className="text-center text-sm font-mono">{opened}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={openRate >= 30 ? "default" : openRate >= 15 ? "secondary" : "outline"} className="text-xs font-mono">
                                {sent ? `${openRate}%` : "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm font-mono">{clicked}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={clickRate >= 5 ? "default" : "outline"} className="text-xs font-mono">
                                {sent ? `${clickRate}%` : "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-mono font-medium">
                              {rev > 0 ? `R$ ${rev.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                                {template.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Automation Revenue & Conversions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-yellow-400" />
                    <CardTitle className="text-sm">Receita por Automação</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Automação</TableHead>
                        <TableHead className="text-xs text-center">Conversões</TableHead>
                        <TableHead className="text-xs text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {automations.map((automation) => {
                        const autoRevenue = (analytics?.revenue || []).filter((r: any) => r.automation_id === automation.id);
                        const total = autoRevenue.reduce((s: number, r: any) => {
                          const amount = Number(r.revenue_amount || 0);
                          const discount = Number(r.coupon_discount || 0);
                          return s + (amount - discount);
                        }, 0);
                        return (
                          <TableRow key={automation.id}>
                            <TableCell className="text-xs font-medium flex items-center gap-1.5">
                              <StatusDot active={automation.status === "active"} />
                              {automation.name}
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono">{autoRevenue.length}</TableCell>
                            <TableCell className="text-right text-xs font-mono font-medium">
                              {total > 0 ? `R$ ${total.toFixed(2)}` : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Trigger Performance */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-400" />
                    <CardTitle className="text-sm">Performance de Triggers</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Trigger</TableHead>
                        <TableHead className="text-xs text-center">Qualificados</TableHead>
                        <TableHead className="text-xs text-center">Entraram</TableHead>
                        <TableHead className="text-xs text-center">P</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {triggers.map((trigger) => {
                        const logs = (analytics?.triggerLogs || []).filter((l: any) => l.trigger_id === trigger.id);
                        const matched = logs.filter((l: any) => l.action === "behavior_trigger_matched").length;
                        const entered = logs.filter((l: any) => l.action === "behavior_automation_entered").length;
                        return (
                          <TableRow key={trigger.id}>
                            <TableCell className="text-xs font-medium">{trigger.name}</TableCell>
                            <TableCell className="text-center text-xs font-mono">{matched}</TableCell>
                            <TableCell className="text-center text-xs font-mono">{entered}</TableCell>
                            <TableCell className="text-center text-xs font-mono">{trigger.priority}</TableCell>
                            <TableCell className="text-center">
                              <StatusDot active={trigger.status === "active"} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          {/* Score tab redirects to /admin/user-scoring */}
        </Tabs>
      </main>
    </div>
  );
}

// ─── Trial Funnel (real funnel shape, centered) ──────────────────────────────
function TrialFunnel({ analytics }: { analytics: any }) {
  if (!analytics) return <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  const events = analytics.productEvents || [];
  const states = analytics.automationStates || [];
  const emailEvents = analytics.emailEvents || [];

  const funnelSteps = [
    { label: "Cadastrados", value: new Set(events.filter((e: any) => e.event_name === "user_signed_up").map((e: any) => e.user_id)).size || states.length || 0, color: "from-blue-500/40 to-blue-600/40", border: "border-blue-500/50" },
    { label: "Entraram em Automação", value: states.length, color: "from-indigo-500/40 to-indigo-600/40", border: "border-indigo-500/50" },
    { label: "Emails Enviados", value: emailEvents.filter((e: any) => e.event_type === "sent").length, color: "from-violet-500/40 to-violet-600/40", border: "border-violet-500/50" },
    { label: "Emails Abertos", value: emailEvents.filter((e: any) => e.event_type === "opened").length, color: "from-purple-500/40 to-purple-600/40", border: "border-purple-500/50" },
    { label: "Emails Clicados", value: emailEvents.filter((e: any) => e.event_type === "clicked").length, color: "from-pink-500/40 to-pink-600/40", border: "border-pink-500/50" },
    { label: "Ativaram Produto", value: events.filter((e: any) => e.event_name === "activation_completed").length, color: "from-amber-500/40 to-amber-600/40", border: "border-amber-500/50" },
    { label: "Converteram (Pagos)", value: events.filter((e: any) => e.event_name === "subscription_started").length, color: "from-emerald-500/40 to-emerald-600/40", border: "border-emerald-500/50" },
  ];

  const totalSteps = funnelSteps.length;

  return (
    <div className="flex flex-col items-center gap-1.5 py-4">
      {funnelSteps.map((step, i) => {
        const maxValue = funnelSteps[0].value;
        // Width based on actual data proportion - minimum 30% so it's still visible when zero
        const widthPct = maxValue > 0 ? Math.max(30, (step.value / maxValue) * 100) : (100 - ((i / (totalSteps - 1)) * 65));
        const prevValue = i > 0 ? funnelSteps[i - 1].value : step.value;
        const dropoff = prevValue > 0 && i > 0 ? Math.round(((prevValue - step.value) / prevValue) * 100) : 0;

        return (
          <div
            key={step.label}
            className={cn(
              "relative flex items-center justify-between px-5 py-3.5 rounded-lg border bg-gradient-to-r transition-all",
              step.color, step.border
            )}
            style={{ width: `${widthPct}%`, minHeight: "50px" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">{step.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">{step.value}</span>
              {dropoff > 0 && i > 0 && (
                <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                  -{dropoff}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
