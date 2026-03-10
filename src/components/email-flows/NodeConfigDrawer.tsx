import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node | null;
  flowId: string;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
}

const triggers = [
  { value: "free_trial", label: "Entrou no Free Trial" },
  { value: "signup", label: "Criou Conta" },
  { value: "checkout_started", label: "Iniciou Checkout" },
  { value: "checkout_abandoned", label: "Carrinho Abandonado (não comprou)" },
  { value: "trial_expired_10d", label: "Trial Expirado há +10 dias" },
  { value: "downgrade", label: "Downgrade Realizado" },
  { value: "inactive", label: "Usuário Inativo" },
  { value: "score_reached", label: "Score Atingido" },
  { value: "tag_added", label: "Tag Adicionada" },
  { value: "manual", label: "Manual" },
];

const audiences = [
  { value: "all", label: "Todos" },
  { value: "all_free", label: "Todos Free" },
  { value: "all_paid", label: "Todos Pagos" },
  { value: "trial_active", label: "Trial Ativo" },
  { value: "trial_expired", label: "Trial Expirado" },
  { value: "inactive_7d", label: "Inativos 7 dias" },
  { value: "inactive_30d", label: "Inativos 30 dias" },
];

const conditions = [
  { value: "email_opened", label: "Abriu email anterior" },
  { value: "email_clicked", label: "Clicou no email" },
  { value: "score_above", label: "Score acima de" },
  { value: "has_tag", label: "Possui tag" },
  { value: "is_customer", label: "Virou cliente" },
  { value: "checkout_started", label: "Iniciou checkout" },
  { value: "inactive_days", label: "Inativo há X dias" },
];

const variables = [
  "{{user_name}}", "{{user_email}}", "{{product_name}}", "{{trial_days_left}}",
  "{{plan}}", "{{score}}", "{{company_name}}", "{{cta_link}}"
];

export function NodeConfigDrawer({ open, onOpenChange, node, flowId, onUpdate, onDelete }: Props) {
  const [name, setName] = useState("");
  const [config, setConfig] = useState<any>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (node) {
      setName(String(node.data.label || ""));
      setConfig({ ...(node.data.config as any || {}) });
    }
  }, [node]);

  useEffect(() => {
    if (open && node?.type === "email") {
      supabase.from("email_flow_templates").select("*").order("name").then(({ data }) => setTemplates(data || []));
    }
  }, [open, node?.type]);

  const save = async () => {
    if (!node) return;
    setSaving(true);
    const { error } = await supabase.from("email_flow_nodes").update({ name, config }).eq("id", node.id);
    if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
    onUpdate(node.id, { label: name, config });

    // Also update flow-level trigger/audience if entry node
    if (node.type === "entry") {
      await supabase.from("email_flows").update({
        trigger_type: config.trigger_type,
        audience_type: config.audience_type,
        audience_config: config.audience_config || {},
        trigger_config: config.trigger_config || {},
        entry_rules: {
          allow_reentry: config.allow_reentry || false,
          max_entries_per_user: config.max_entries || 1,
          reentry_after_days: config.reentry_after_days || null,
        },
      }).eq("id", flowId);
    }

    toast.success("Bloco salvo!");
    setSaving(false);
    onOpenChange(false);
  };

  const loadTemplate = (templateId: string) => {
    const t = templates.find(t => t.id === templateId);
    if (t) {
      setConfig({ ...config, subject: t.subject, body: t.body, preview_text: t.preview_text || "", template_id: t.id });
    }
  };

  const saveAsTemplate = async () => {
    if (!config.subject || !config.body) { toast.error("Preencha assunto e conteúdo"); return; }
    const { error } = await supabase.from("email_flow_templates").insert({
      name: config.subject,
      subject: config.subject,
      preview_text: config.preview_text || "",
      body: config.body,
    });
    if (error) { toast.error("Erro ao salvar template"); return; }
    toast.success("Template salvo!");
  };

  const sendTestEmail = async () => {
    if (!config.subject || !config.body) { toast.error("Preencha assunto e conteúdo"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        to: user.email,
        subject: `[TESTE] ${config.subject}`,
        html: config.body,
      },
    });
    if (error) { toast.error("Erro ao enviar teste"); return; }
    toast.success(`Email teste enviado para ${user.email}`);
  };

  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Configurar Bloco
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(node.id)}>
              <Trash2 size={16} />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Nome do bloco</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* ENTRY CONFIG */}
          {node.type === "entry" && (
            <>
              <div>
                <Label>Gatilho de Entrada</Label>
                <Select value={config.trigger_type || ""} onValueChange={v => setConfig({ ...config, trigger_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {triggers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Público</Label>
                <Select value={config.audience_type || ""} onValueChange={v => setConfig({ ...config, audience_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {audiences.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {config.trigger_type === "inactive" && (
                <div>
                  <Label>Dias de inatividade</Label>
                  <Input type="number" value={config.inactive_days || 7} onChange={e => setConfig({ ...config, inactive_days: parseInt(e.target.value) })} />
                </div>
              )}
              {config.trigger_type === "score_reached" && (
                <div>
                  <Label>Score mínimo</Label>
                  <Input type="number" value={config.min_score || 50} onChange={e => setConfig({ ...config, min_score: parseInt(e.target.value) })} />
                </div>
              )}
              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-sm font-medium">Regras de Entrada</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Permitir reentrada</Label>
                  <Switch checked={config.allow_reentry || false} onCheckedChange={v => setConfig({ ...config, allow_reentry: v })} />
                </div>
                <div>
                  <Label className="text-xs">Máx. entradas por usuário</Label>
                  <Input type="number" value={config.max_entries || 1} onChange={e => setConfig({ ...config, max_entries: parseInt(e.target.value) })} className="h-8" />
                </div>
                {config.allow_reentry && (
                  <div>
                    <Label className="text-xs">Reentrada após (dias)</Label>
                    <Input type="number" value={config.reentry_after_days || 30} onChange={e => setConfig({ ...config, reentry_after_days: parseInt(e.target.value) })} className="h-8" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* EMAIL CONFIG */}
          {node.type === "email" && (
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="content" className="flex-1">Conteúdo</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">Config</TabsTrigger>
                <TabsTrigger value="template" className="flex-1">Template</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="space-y-3 mt-3">
                <div>
                  <Label>Assunto</Label>
                  <Input value={config.subject || ""} onChange={e => setConfig({ ...config, subject: e.target.value })} placeholder="Assunto do email..." />
                </div>
                <div>
                  <Label>Preview Text</Label>
                  <Input value={config.preview_text || ""} onChange={e => setConfig({ ...config, preview_text: e.target.value })} placeholder="Texto de preview..." />
                </div>
                <div>
                  <Label>Conteúdo (HTML)</Label>
                  <Textarea
                    value={config.body || ""}
                    onChange={e => setConfig({ ...config, body: e.target.value })}
                    placeholder="<p>Olá {{user_name}}...</p>"
                    className="min-h-[200px] font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Variáveis disponíveis</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {variables.map(v => (
                      <button key={v} type="button" onClick={() => setConfig({ ...config, body: (config.body || "") + v })}
                        className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={sendTestEmail} className="flex-1">Enviar Teste</Button>
                </div>
              </TabsContent>
              <TabsContent value="settings" className="space-y-3 mt-3">
                <div>
                  <Label>Nome do remetente</Label>
                  <Input value={config.from_name || "Wiize"} onChange={e => setConfig({ ...config, from_name: e.target.value })} />
                </div>
                <div>
                  <Label>Reply-to</Label>
                  <Input value={config.reply_to || ""} onChange={e => setConfig({ ...config, reply_to: e.target.value })} placeholder="suporte@empresa.com" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Track abertura</Label>
                  <Switch checked={config.track_opens !== false} onCheckedChange={v => setConfig({ ...config, track_opens: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Track cliques</Label>
                  <Switch checked={config.track_clicks !== false} onCheckedChange={v => setConfig({ ...config, track_clicks: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Track compras (conversão)</Label>
                  <Switch checked={config.track_purchases || false} onCheckedChange={v => setConfig({ ...config, track_purchases: v })} />
                </div>
              </TabsContent>
              <TabsContent value="template" className="space-y-3 mt-3">
                {templates.length > 0 ? (
                  <div>
                    <Label>Carregar template</Label>
                    <Select onValueChange={loadTemplate}>
                      <SelectTrigger><SelectValue placeholder="Selecionar template..." /></SelectTrigger>
                      <SelectContent>
                        {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum template salvo</p>
                )}
                <Button variant="outline" size="sm" onClick={saveAsTemplate} className="w-full">
                  Salvar conteúdo atual como template
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {/* WAIT CONFIG */}
          {node.type === "wait" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tempo</Label>
                  <Input type="number" min={1} value={config.delay_value || 1} onChange={e => setConfig({ ...config, delay_value: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={config.delay_unit || "days"} onValueChange={v => setConfig({ ...config, delay_unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Apenas horário comercial</Label>
                <Switch checked={config.business_hours_only || false} onCheckedChange={v => setConfig({ ...config, business_hours_only: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Apenas dias úteis</Label>
                <Switch checked={config.weekdays_only || false} onCheckedChange={v => setConfig({ ...config, weekdays_only: v })} />
              </div>
            </>
          )}

          {/* CONDITION CONFIG */}
          {node.type === "condition" && (
            <>
              <div>
                <Label>Tipo de condição</Label>
                <Select value={config.condition_type || ""} onValueChange={v => setConfig({ ...config, condition_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {conditions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(config.condition_type === "score_above" || config.condition_type === "inactive_days") && (
                <div>
                  <Label>Valor</Label>
                  <Input type="number" value={config.value || ""} onChange={e => setConfig({ ...config, value: e.target.value })} />
                </div>
              )}
              {config.condition_type === "has_tag" && (
                <div>
                  <Label>Tag</Label>
                  <Input value={config.value || ""} onChange={e => setConfig({ ...config, value: e.target.value })} placeholder="Nome da tag" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">Saída "Sim" (verde) e "Não" (vermelho) permitem bifurcar o fluxo.</p>
            </>
          )}

          {/* END CONFIG */}
          {node.type === "end" && (
            <div>
              <Label>Observação</Label>
              <Textarea value={config.note || ""} onChange={e => setConfig({ ...config, note: e.target.value })} placeholder="Nota opcional..." />
            </div>
          )}

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
