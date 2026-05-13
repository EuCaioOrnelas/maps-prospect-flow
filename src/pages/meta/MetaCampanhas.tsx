import { useState } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Plus, Pause, Copy, Archive, Play, MoreHorizontal, ArrowRight,
  MessageSquare, Reply, Bot, UserCheck, Sparkles,
} from "lucide-react";
import { campaignsPerformance } from "@/components/meta/mockData";

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtN = (n: number) => n.toLocaleString("pt-BR");

export default function MetaCampanhas() {
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <MetaLayout title="Campanhas" description="Gerencie campanhas outbound oficiais via Meta API.">
      <MetaPageHeader
        title="Campanhas"
        description="Crie, agende e monitore campanhas outbound integradas ao seu CRM."
        actions={
          <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
            <SheetTrigger asChild>
              <Button size="sm"><Plus size={14} className="mr-1.5" /> Nova campanha</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Nova campanha</SheetTitle>
              </SheetHeader>
              <CampaignEditor />
            </SheetContent>
          </Sheet>
        }
      />

      {/* Cards de campanhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaignsPerformance.map((c) => (
          <Card key={c.id} className="p-5 border-border/60 hover:border-border transition-colors">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">+55 11 99999-1111 · Pipeline Vendas</p>
              </div>
              <Badge variant={c.status === "active" ? "default" : c.status === "paused" ? "secondary" : "outline"}>
                {c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : "Arquivada"}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Enviados</p>
                <p className="text-sm font-semibold tabular-nums">{fmtN(c.sent)}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Respostas</p>
                <p className="text-sm font-semibold tabular-nums">{fmtN(c.replies)}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">ROI</p>
                <p className="text-sm font-semibold tabular-nums text-emerald-500">{c.roi}x</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
              <span>Custo {fmtBRL(c.cost)}</span>
              <span>{c.opps} oportunidades</span>
            </div>

            <div className="flex items-center gap-1 border-t border-border/60 pt-3">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                {c.status === "active" ? <><Pause size={12} className="mr-1" /> Pausar</> : <><Play size={12} className="mr-1" /> Ativar</>}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"><Copy size={12} className="mr-1" /> Duplicar</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"><Archive size={12} className="mr-1" /> Arquivar</Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto"><MoreHorizontal size={14} /></Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Fluxo da campanha */}
      <Card className="p-6 border-border/60">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground">Lógica de abertura de conversa</h3>
          <p className="text-xs text-muted-foreground">Como cada lead percorre a campanha</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { icon: MessageSquare, title: "Template inicial", desc: "Mensagem aprovada Meta enviada ao lead", tone: "primary" },
            { icon: Reply, title: "Aguarda resposta", desc: "Janela de 24h é aberta ao responder", tone: "violet" },
            { icon: Bot, title: "IA personaliza", desc: "Mensagem gerada por IA é enviada automaticamente", tone: "amber" },
            { icon: UserCheck, title: "Handoff humano", desc: "Lead transferido para inbox do operador", tone: "emerald" },
          ].map((s, i) => (
            <div key={s.title} className="relative">
              <div className="rounded-xl border border-border/60 p-4 bg-card">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <s.icon size={16} />
                </div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
              {i < 3 && (
                <ArrowRight className="hidden md:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-muted-foreground" size={14} />
              )}
            </div>
          ))}
        </div>
      </Card>
    </MetaLayout>
  );
}

function CampaignEditor() {
  return (
    <Tabs defaultValue="config" className="mt-4">
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="config">Configuração</TabsTrigger>
        <TabsTrigger value="ai">IA</TabsTrigger>
        <TabsTrigger value="metrics">Métricas</TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="space-y-4 mt-4">
        <Field label="Nome da campanha"><Input placeholder="Ex.: Frio Odonto Q2" /></Field>
        <Field label="Descrição"><Textarea placeholder="Objetivo, segmento, observações..." rows={2} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Número / WABA">
            <Select><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="n1">+55 11 99999-1111</SelectItem>
                <SelectItem value="n2">+55 11 99999-2222</SelectItem>
              </SelectContent></Select>
          </Field>
          <Field label="Template inicial">
            <Select><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="t1">abertura_frio_v3</SelectItem>
                <SelectItem value="t2">followup_2_dias</SelectItem>
              </SelectContent></Select>
          </Field>
          <Field label="Pipeline CRM">
            <Select><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="p1">Vendas Principal</SelectItem>
                <SelectItem value="p2">Reativação</SelectItem>
              </SelectContent></Select>
          </Field>
          <Field label="Etapa destino">
            <Select><SelectTrigger><SelectValue placeholder="Prospectado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="e1">Prospectado</SelectItem>
                <SelectItem value="e2">Qualificado</SelectItem>
              </SelectContent></Select>
          </Field>
          <Field label="Horário de envio"><Input placeholder="09:00 — 18:00" /></Field>
          <Field label="Limite diário"><Input type="number" placeholder="500" /></Field>
          <Field label="Delay aleatório (s)"><Input placeholder="30 — 90" /></Field>
          <Field label="Prioridade">
            <Select defaultValue="normal"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent></Select>
          </Field>
        </div>
        <Field label="Estratégia de distribuição">
          <Select defaultValue="round"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="round">Round-robin entre números</SelectItem>
              <SelectItem value="weighted">Ponderada por qualidade</SelectItem>
              <SelectItem value="single">Número único</SelectItem>
            </SelectContent></Select>
        </Field>
      </TabsContent>

      <TabsContent value="ai" className="space-y-4 mt-4">
        <Field label="Prompt IA">
          <Textarea
            rows={5}
            placeholder="Você é um SDR consultivo do nicho odontológico..."
            defaultValue="Responda como SDR consultivo. Personalize com base no diagnóstico do lead. Foco: agendar diagnóstico gratuito."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tom da mensagem">
            <Select defaultValue="prof"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prof">Profissional</SelectItem>
                <SelectItem value="cas">Casual</SelectItem>
                <SelectItem value="urg">Urgente consultivo</SelectItem>
              </SelectContent></Select>
          </Field>
          <Field label="CTA principal"><Input defaultValue="Agendar diagnóstico" /></Field>
          <Field label="Limite de caracteres"><Input type="number" defaultValue={280} /></Field>
          <Field label="Personalização por nicho"><Input defaultValue="Odontologia" /></Field>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
          <div>
            <p className="text-sm font-medium">Diagnóstico automático</p>
            <p className="text-xs text-muted-foreground">IA pesquisa o lead antes de personalizar</p>
          </div>
          <Switch defaultChecked />
        </div>
      </TabsContent>

      <TabsContent value="metrics" className="mt-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: "Custo da campanha", v: "R$ 624" },
            { l: "Taxa de resposta", v: "25.1%" },
            { l: "Custo por lead", v: "R$ 0,50" },
            { l: "Custo por oportunidade", v: "R$ 22" },
            { l: "Tempo médio de resposta", v: "12 min" },
            { l: "Leads ativos", v: "312" },
          ].map((m) => (
            <Card key={m.l} className="p-3 border-border/60">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.l}</p>
              <p className="text-lg font-semibold mt-1">{m.v}</p>
            </Card>
          ))}
        </div>
      </TabsContent>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border/60">
        <Button variant="outline" size="sm">Cancelar</Button>
        <Button size="sm"><Sparkles size={13} className="mr-1.5" /> Salvar campanha</Button>
      </div>
    </Tabs>
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
