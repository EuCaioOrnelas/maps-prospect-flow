import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import {
  ArrowLeft, Zap, Mail, Target, BarChart3, Settings, Plus, Edit, Trash2,
  Play, Pause, Eye, TrendingUp, Users, MousePointerClick, DollarSign,
  CheckCircle2, XCircle, Clock, Loader2, RefreshCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Automation { id: string; name: string; description: string | null; trigger_event: string; trigger_conditions: any; status: string; automation_type: string; created_at: string; }
interface AutomationStep { id: string; automation_id: string; step_order: number; delay_hours: number; condition: any; action_type: string; template_id: string | null; stop_condition: any; }
interface MessageTemplate { id: string; name: string; subject: string; body: string; variables: any; channel: string; is_active: boolean; }
interface BehaviourTrigger { id: string; name: string; description: string | null; trigger_type: string; conditions: any; entry_rules: any; cooldown_hours: number; priority: number; target_automation_id: string | null; status: string; success_condition: any; stop_condition: any; }

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
  const [editTrigger, setEditTrigger] = useState<BehaviourTrigger | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);

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

    // Fetch analytics
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

  // ─── Automation Actions ─────────────────────────────────────────────────────
  const toggleAutomationStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("trial_automations").update({ status: newStatus }).eq("id", id);
    toast({ title: `Automação ${newStatus === "active" ? "ativada" : "pausada"}` });
    fetchAll();
  };

  // ─── Template Actions ─────────────────────────────────────────────────────
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

  // ─── Trigger Actions ─────────────────────────────────────────────────────
  const toggleTriggerStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("trial_behaviour_triggers").update({ status: newStatus }).eq("id", id);
    toast({ title: `Trigger ${newStatus === "active" ? "ativado" : "pausado"}` });
    fetchAll();
  };

  // ─── Analytics helpers ─────────────────────────────────────────────────────
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

  const getTriggerStats = () => {
    if (!analytics) return { matched: 0, entered: 0 };
    const logs = analytics.triggerLogs;
    return {
      matched: logs.filter((l: any) => l.action === "behavior_trigger_matched").length,
      entered: logs.filter((l: any) => l.action === "behavior_automation_entered").length,
    };
  };

  const getTotalRevenue = () => {
    if (!analytics?.revenue) return 0;
    return analytics.revenue.reduce((sum: number, r: any) => sum + Number(r.revenue_amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const emailStats = getEmailStats();
  const automationStats = getAutomationStats();
  const triggerStats = getTriggerStats();
  const totalRevenue = getTotalRevenue();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <BackgroundGlow />
      <SEO title="Automação Trial | Admin" description="Sistema de automação de trial e ativação" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">Automação Trial</h1>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Emails Enviados", value: emailStats.sent, icon: Mail, color: "text-blue-500" },
            { label: "Taxa Abertura", value: `${emailStats.openRate}%`, icon: Eye, color: "text-emerald-500" },
            { label: "Taxa Clique", value: `${emailStats.clickRate}%`, icon: MousePointerClick, color: "text-amber-500" },
            { label: "Usuários em Fluxos", value: automationStats.active, icon: Users, color: "text-purple-500" },
            { label: "Receita Atribuída", value: `R$ ${totalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-primary" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="automations" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Automações</TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Templates</TabsTrigger>
            <TabsTrigger value="triggers" className="gap-1.5"><Target className="h-3.5 w-3.5" />Triggers</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Analytics</TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5"><Settings className="h-3.5 w-3.5" />Config</TabsTrigger>
          </TabsList>

          {/* ═══ AUTOMATIONS TAB ═══ */}
          <TabsContent value="automations" className="space-y-4">
            {automations.map((automation) => {
              const autoSteps = steps.filter((s) => s.automation_id === automation.id);
              return (
                <Card key={automation.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{automation.name}</CardTitle>
                        <CardDescription className="text-xs">{automation.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={automation.status === "active" ? "default" : "secondary"}>
                          {automation.status === "active" ? "Ativo" : "Pausado"}
                        </Badge>
                        <Switch
                          checked={automation.status === "active"}
                          onCheckedChange={() => toggleAutomationStatus(automation.id, automation.status)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Trigger: <code className="bg-muted px-1 rounded">{automation.trigger_event}</code> |
                        Tipo: <code className="bg-muted px-1 rounded">{automation.automation_type}</code>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Delay</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Template</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {autoSteps.map((step) => {
                            const template = templates.find((t) => t.id === step.template_id);
                            return (
                              <TableRow key={step.id}>
                                <TableCell className="font-mono text-xs">{step.step_order}</TableCell>
                                <TableCell className="text-xs">
                                  {step.delay_hours >= 24 ? `${Math.round(step.delay_hours / 24)}d` : `${step.delay_hours}h`}
                                </TableCell>
                                <TableCell className="text-xs">{step.action_type}</TableCell>
                                <TableCell className="text-xs">{template?.name || "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ═══ TEMPLATES TAB ═══ */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Templates de Email</h2>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditTemplate(null)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Novo Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
                  </DialogHeader>
                  <TemplateForm
                    template={editTemplate}
                    onSave={saveTemplate}
                    onCancel={() => { setTemplateDialogOpen(false); setEditTemplate(null); }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm">{template.name}</h3>
                          <Badge variant={template.is_active ? "default" : "secondary"} className="text-[10px]">
                            {template.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">Assunto: {template.subject}</p>
                        <div className="text-xs text-muted-foreground/80 bg-muted/30 rounded p-2 max-h-20 overflow-hidden" dangerouslySetInnerHTML={{ __html: template.body.substring(0, 200) + "..." }} />
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditTemplate(template);
                          setTemplateDialogOpen(true);
                        }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate(template.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ TRIGGERS TAB ═══ */}
          <TabsContent value="triggers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Triggers Comportamentais</h2>
              <Badge variant="outline">{triggers.filter((t) => t.status === "active").length} ativos</Badge>
            </div>

            <div className="grid gap-3">
              {triggers.map((trigger) => {
                const logs = analytics?.triggerLogs?.filter((l: any) => l.trigger_id === trigger.id) || [];
                const matched = logs.filter((l: any) => l.action === "behavior_trigger_matched").length;
                const entered = logs.filter((l: any) => l.action === "behavior_automation_entered").length;

                return (
                  <Card key={trigger.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{trigger.name}</h3>
                            <Badge variant={trigger.status === "active" ? "default" : "secondary"} className="text-[10px]">
                              {trigger.status}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">P{trigger.priority}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{trigger.description}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Matched: <strong>{matched}</strong></span>
                            <span>Entrou: <strong>{entered}</strong></span>
                            <span>Cooldown: <strong>{trigger.cooldown_hours}h</strong></span>
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

          {/* ═══ ANALYTICS TAB ═══ */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Trial Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funil do Trial</CardTitle>
              </CardHeader>
              <CardContent>
                <TrialFunnel analytics={analytics} />
              </CardContent>
            </Card>

            {/* Email Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance de Emails</CardTitle>
              </CardHeader>
              <CardContent>
                <EmailPerformanceTable templates={templates} emailEvents={analytics?.emailEvents || []} revenue={analytics?.revenue || []} />
              </CardContent>
            </Card>

            {/* Revenue Attribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atribuição de Receita</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueAttribution automations={automations} revenue={analytics?.revenue || []} />
              </CardContent>
            </Card>

            {/* Trigger Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance por Trigger</CardTitle>
              </CardHeader>
              <CardContent>
                <TriggerPerformanceTable triggers={triggers} triggerLogs={analytics?.triggerLogs || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ CONFIG TAB ═══ */}
          <TabsContent value="config" className="space-y-4">
            <ActivationConfigPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Template Form ─────────────────────────────────────────────────────────────
function TemplateForm({ template, onSave, onCancel }: { template: MessageTemplate | null; onSave: (t: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);

  return (
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do template" />
      </div>
      <div>
        <Label>Assunto</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" />
      </div>
      <div>
        <Label>Corpo (HTML)</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="HTML do email..." className="font-mono text-xs" />
        <p className="text-xs text-muted-foreground mt-1">
          Variáveis: {"{{user_name}}"}, {"{{cta_link}}"}, {"{{trial_days_left}}"}, {"{{projects_created}}"}, {"{{feature_usage}}"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Ativo</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave({ name, subject, body, is_active: isActive, channel: "email", variables: [] })}>
          Salvar
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Trial Funnel ──────────────────────────────────────────────────────────────
function TrialFunnel({ analytics }: { analytics: any }) {
  if (!analytics) return <p className="text-sm text-muted-foreground">Sem dados</p>;

  const events = analytics.productEvents || [];
  const states = analytics.automationStates || [];
  const emailEvents = analytics.emailEvents || [];

  const funnelSteps = [
    { label: "Cadastrados", value: new Set(events.filter((e: any) => e.event_name === "user_signed_up").map((e: any) => e.user_id)).size || states.length || 0 },
    { label: "Entraram em Automação", value: states.length },
    { label: "Emails Enviados", value: emailEvents.filter((e: any) => e.event_type === "sent").length },
    { label: "Emails Abertos", value: emailEvents.filter((e: any) => e.event_type === "opened").length },
    { label: "Emails Clicados", value: emailEvents.filter((e: any) => e.event_type === "clicked").length },
    { label: "Ativaram Produto", value: events.filter((e: any) => e.event_name === "activation_completed").length },
    { label: "Converteram (Pagos)", value: events.filter((e: any) => e.event_name === "subscription_started").length },
  ];

  const maxValue = Math.max(...funnelSteps.map((s) => s.value), 1);

  return (
    <div className="space-y-2">
      {funnelSteps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-40 text-right">{step.label}</span>
          <div className="flex-1">
            <div className="h-6 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full transition-all flex items-center justify-end pr-2"
                style={{ width: `${Math.max((step.value / maxValue) * 100, 5)}%` }}
              >
                <span className="text-[10px] font-bold text-primary-foreground">{step.value}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Email Performance Table ─────────────────────────────────────────────────
function EmailPerformanceTable({ templates, emailEvents, revenue }: { templates: MessageTemplate[]; emailEvents: any[]; revenue: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Template</TableHead>
          <TableHead className="text-right">Enviados</TableHead>
          <TableHead className="text-right">Abertos</TableHead>
          <TableHead className="text-right">Open Rate</TableHead>
          <TableHead className="text-right">Cliques</TableHead>
          <TableHead className="text-right">Click Rate</TableHead>
          <TableHead className="text-right">Receita</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((template) => {
          const tEvents = emailEvents.filter((e: any) => e.email_template_id === template.id);
          const sent = tEvents.filter((e: any) => e.event_type === "sent").length;
          const opened = tEvents.filter((e: any) => e.event_type === "opened").length;
          const clicked = tEvents.filter((e: any) => e.event_type === "clicked").length;
          const rev = revenue.filter((r: any) => r.email_template_id === template.id).reduce((s: number, r: any) => s + Number(r.revenue_amount || 0), 0);

          return (
            <TableRow key={template.id}>
              <TableCell className="text-xs font-medium">{template.name}</TableCell>
              <TableCell className="text-right text-xs">{sent}</TableCell>
              <TableCell className="text-right text-xs">{opened}</TableCell>
              <TableCell className="text-right text-xs">{sent ? `${Math.round((opened / sent) * 100)}%` : "—"}</TableCell>
              <TableCell className="text-right text-xs">{clicked}</TableCell>
              <TableCell className="text-right text-xs">{sent ? `${Math.round((clicked / sent) * 100)}%` : "—"}</TableCell>
              <TableCell className="text-right text-xs font-medium">R$ {rev.toFixed(0)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─── Revenue Attribution ─────────────────────────────────────────────────────
function RevenueAttribution({ automations, revenue }: { automations: Automation[]; revenue: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Automação</TableHead>
          <TableHead className="text-right">Conversões</TableHead>
          <TableHead className="text-right">Receita Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {automations.map((automation) => {
          const autoRevenue = revenue.filter((r: any) => r.automation_id === automation.id);
          const total = autoRevenue.reduce((s: number, r: any) => s + Number(r.revenue_amount || 0), 0);
          return (
            <TableRow key={automation.id}>
              <TableCell className="text-xs font-medium">{automation.name}</TableCell>
              <TableCell className="text-right text-xs">{autoRevenue.length}</TableCell>
              <TableCell className="text-right text-xs font-medium">R$ {total.toFixed(0)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─── Trigger Performance ─────────────────────────────────────────────────────
function TriggerPerformanceTable({ triggers, triggerLogs }: { triggers: BehaviourTrigger[]; triggerLogs: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Trigger</TableHead>
          <TableHead className="text-right">Qualificados</TableHead>
          <TableHead className="text-right">Entraram</TableHead>
          <TableHead className="text-right">Prioridade</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {triggers.map((trigger) => {
          const logs = triggerLogs.filter((l: any) => l.trigger_id === trigger.id);
          const matched = logs.filter((l: any) => l.action === "behavior_trigger_matched").length;
          const entered = logs.filter((l: any) => l.action === "behavior_automation_entered").length;

          return (
            <TableRow key={trigger.id}>
              <TableCell className="text-xs font-medium">{trigger.name}</TableCell>
              <TableCell className="text-right text-xs">{matched}</TableCell>
              <TableCell className="text-right text-xs">{entered}</TableCell>
              <TableCell className="text-right text-xs">{trigger.priority}</TableCell>
              <TableCell className="text-right">
                <Badge variant={trigger.status === "active" ? "default" : "secondary"} className="text-[10px]">
                  {trigger.status}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─── Activation Config Panel ─────────────────────────────────────────────────
function ActivationConfigPanel() {
  const [configs, setConfigs] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("trial_activation_config").select("*").order("config_type").then(({ data }) => {
      if (data) setConfigs(data);
    });
  }, []);

  const toggleConfig = async (id: string, isActive: boolean) => {
    await supabase.from("trial_activation_config").update({ is_active: !isActive }).eq("id", id);
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !isActive } : c)));
    toast({ title: "Configuração atualizada" });
  };

  const grouped = {
    activation_event: configs.filter((c) => c.config_type === "activation_event"),
    high_value_feature: configs.filter((c) => c.config_type === "high_value_feature"),
    intent_signal: configs.filter((c) => c.config_type === "intent_signal"),
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, items]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="text-base capitalize">
              {type === "activation_event" ? "🎯 Eventos de Ativação" : type === "high_value_feature" ? "⭐ Features de Alto Valor" : "💡 Sinais de Intenção"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((config: any) => (
                <div key={config.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{config.config_value?.label || config.config_key}</p>
                    <p className="text-xs text-muted-foreground">
                      Chave: <code className="bg-muted px-1 rounded">{config.config_key}</code>
                      {config.config_value?.points && ` | Score: +${config.config_value.points}`}
                    </p>
                  </div>
                  <Switch checked={config.is_active} onCheckedChange={() => toggleConfig(config.id, config.is_active)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
