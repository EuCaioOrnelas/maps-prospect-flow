import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Webhook, Key, Clock, Bot, Bell, ShieldCheck } from "lucide-react";

export default function MetaConfiguracoes() {
  return (
    <MetaLayout title="Configurações" description="Gestão geral da operação Meta.">
      <MetaPageHeader title="Configurações Gerais" description="Webhooks, tokens, automações e regras IA da operação." />

      <Tabs defaultValue="webhooks">
        <TabsList className="flex-wrap h-auto bg-muted/40">
          <TabsTrigger value="webhooks"><Webhook size={13} className="mr-1.5" />Webhooks</TabsTrigger>
          <TabsTrigger value="tokens"><Key size={13} className="mr-1.5" />API Tokens</TabsTrigger>
          <TabsTrigger value="limits"><Clock size={13} className="mr-1.5" />Limites & Delays</TabsTrigger>
          <TabsTrigger value="ai"><Bot size={13} className="mr-1.5" />Regras IA</TabsTrigger>
          <TabsTrigger value="notifications"><Bell size={13} className="mr-1.5" />Notificações</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck size={13} className="mr-1.5" />Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="mt-5">
          <Card className="p-5 border-border/60 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Endpoint de Webhook</h3>
              <p className="text-xs text-muted-foreground mb-3">URL configurada na Meta App Dashboard para receber eventos.</p>
              <Input value="https://api.wiize.app/meta/webhook" readOnly className="font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/60">
              <Field label="Verify Token"><Input type="password" placeholder="••••••••••" /></Field>
              <Field label="Versão da API"><Input defaultValue="v21.0" /></Field>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
              <div>
                <p className="text-sm font-medium">Validar assinatura HMAC</p>
                <p className="text-xs text-muted-foreground">Recomendado em produção</p>
              </div>
              <Switch defaultChecked />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="mt-5">
          <Card className="p-5 border-border/60 space-y-4">
            <Field label="Access Token Permanente"><Input type="password" placeholder="EAAG..." /></Field>
            <Field label="App Secret"><Input type="password" placeholder="••••••••••" /></Field>
            <Field label="Business Account ID"><Input placeholder="1234567890" /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm">Testar conexão</Button>
              <Button size="sm">Salvar</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="mt-5">
          <Card className="p-5 border-border/60 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Limite global diário"><Input type="number" defaultValue={5000} /></Field>
              <Field label="Timezone">
                <Select defaultValue="brt"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brt">America/Sao_Paulo (BRT)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                  </SelectContent></Select>
              </Field>
              <Field label="Delay mínimo entre envios (s)"><Input type="number" defaultValue={30} /></Field>
              <Field label="Delay máximo entre envios (s)"><Input type="number" defaultValue={120} /></Field>
              <Field label="Janela 24h fallback">
                <Select defaultValue="template"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Usar template aprovado</SelectItem>
                    <SelectItem value="silent">Apenas registrar e aguardar</SelectItem>
                  </SelectContent></Select>
              </Field>
              <Field label="Tentativas em caso de falha"><Input type="number" defaultValue={3} /></Field>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-5">
          <Card className="p-5 border-border/60 space-y-4">
            <Field label="Prompt global da IA">
              <Textarea
                rows={5}
                defaultValue="Você é um SDR consultivo da Wiize. Mantenha tom profissional e objetivo. Personalize com diagnóstico do lead. Nunca prometa resultados."
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modelo">
                <Select defaultValue="gpt-4o-mini"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o-mini</SelectItem>
                  </SelectContent></Select>
              </Field>
              <Field label="Temperatura"><Input type="number" step="0.1" defaultValue={0.7} /></Field>
            </div>
            <div className="space-y-3">
              <ToggleRow title="Handoff humano automático" desc="Transferir lead para inbox após resposta positiva" defaultChecked />
              <ToggleRow title="Diagnóstico automático" desc="IA pesquisa o lead antes de personalizar" defaultChecked />
              <ToggleRow title="Bloqueio em fim de semana" desc="Não enviar mensagens sábado/domingo" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <Card className="p-5 border-border/60 space-y-3">
            <ToggleRow title="Alerta de queda de qualidade" desc="Notificar quando quality rating cair" defaultChecked />
            <ToggleRow title="Alerta de bloqueio de número" desc="E-mail e push quando número for bloqueado" defaultChecked />
            <ToggleRow title="Resumo diário operacional" desc="Receba às 18h o resumo do dia" defaultChecked />
            <ToggleRow title="Alerta de campanha problemática" desc="ROI abaixo de 1.5x ou CPR acima do esperado" />
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-5">
          <Card className="p-5 border-border/60 space-y-3">
            <ToggleRow title="Validação HMAC obrigatória" desc="Webhooks rejeitam payloads sem assinatura válida" defaultChecked />
            <ToggleRow title="IP allowlist Meta" desc="Aceitar callbacks somente de IPs oficiais Meta" defaultChecked />
            <ToggleRow title="Audit log de configurações" desc="Registrar toda alteração crítica" defaultChecked />
          </Card>
        </TabsContent>
      </Tabs>
    </MetaLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ title, desc, defaultChecked }: { title: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
