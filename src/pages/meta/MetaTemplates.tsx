import { useState } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, RefreshCw, Copy, Archive, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { templates } from "@/components/meta/mockData";

const INTERNAL_CATEGORIES = [
  "todos", "abertura fria", "follow-up", "reabertura", "confirmação", "reunião", "proposta", "recuperação", "nurture",
];

export default function MetaTemplates() {
  const [filter, setFilter] = useState("todos");
  const [editorOpen, setEditorOpen] = useState(false);

  const list = filter === "todos" ? templates : templates.filter((t) => t.internal === filter);

  return (
    <MetaLayout title="Templates" description="Gerencie templates Meta aprovados e em revisão.">
      <MetaPageHeader
        title="Templates"
        description="Editor visual com preview WhatsApp em tempo real e categorização interna."
        actions={
          <>
            <Button variant="outline" size="sm"><RefreshCw size={14} className="mr-1.5" /> Sincronizar Meta</Button>
            <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus size={14} className="mr-1.5" /> Novo template</Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
                <SheetHeader><SheetTitle>Editor de template</SheetTitle></SheetHeader>
                <TemplateEditor />
              </SheetContent>
            </Sheet>
          </>
        }
      />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap h-auto bg-muted/40">
          {INTERNAL_CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c} className="capitalize text-xs">{c}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((t) => (
          <Card key={t.id} className="p-5 border-border/60 hover:border-border transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{t.internal}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>

            <div className="rounded-lg bg-[hsl(120_15%_94%)] dark:bg-emerald-950/20 p-3 mb-3 border border-border/40">
              <p className="text-xs text-foreground/80 leading-relaxed">
                Olá {`{{1}}`}, identifiquei oportunidades de crescimento para {`{{2}}`}. Posso te apresentar um diagnóstico rápido?
              </p>
            </div>

            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{t.metaCat}</Badge>
                <Badge variant="outline" className="text-[10px]">{t.lang}</Badge>
              </div>
              {t.score > 0 && (
                <span className="text-muted-foreground tabular-nums">Score {t.score}</span>
              )}
            </div>

            <div className="flex items-center gap-1 border-t border-border/60 pt-3">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Editar</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"><Copy size={12} /></Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs ml-auto"><Archive size={12} /></Button>
            </div>
          </Card>
        ))}
      </div>
    </MetaLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-0"><CheckCircle2 size={10} className="mr-1" />Aprovado</Badge>;
  }
  if (status === "rejected") {
    return <Badge className="bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 border-0"><AlertCircle size={10} className="mr-1" />Rejeitado</Badge>;
  }
  return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-0"><Clock size={10} className="mr-1" />Pendente</Badge>;
}

function TemplateEditor() {
  const [body, setBody] = useState("Olá {{1}}, identifiquei oportunidades de crescimento para {{2}}. Posso te apresentar um diagnóstico rápido?");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
      <div className="space-y-4">
        <Field label="Nome interno"><Input placeholder="ex.: abertura_frio_v3" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria interna">
            <Select><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {INTERNAL_CATEGORIES.slice(1).map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent></Select>
          </Field>
          <Field label="Categoria Meta">
            <Select defaultValue="MARKETING"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKETING">MARKETING</SelectItem>
                <SelectItem value="UTILITY">UTILITY</SelectItem>
                <SelectItem value="AUTHENTICATION">AUTHENTICATION</SelectItem>
              </SelectContent></Select>
          </Field>
          <Field label="Idioma">
            <Select defaultValue="pt_BR"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt_BR">Português (BR)</SelectItem>
                <SelectItem value="en">Inglês</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
              </SelectContent></Select>
          </Field>
          <Field label="Caracteres">
            <Input value={`${body.length} / 1024`} readOnly />
          </Field>
        </div>
        <Field label="Corpo da mensagem">
          <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-1">Use {`{{1}}, {{2}}`} para variáveis dinâmicas.</p>
        </Field>
        <Field label="CTA / Quick replies"><Input placeholder="Ex.: Quero diagnóstico, Agora não" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm">Cancelar</Button>
          <Button size="sm">Enviar para aprovação Meta</Button>
        </div>
      </div>

      {/* Preview WhatsApp */}
      <div>
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <div className="mt-2 rounded-2xl border border-border/60 bg-[hsl(150_20%_96%)] dark:bg-zinc-900 p-4 min-h-[400px]">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[hsl(120_60%_72%)] dark:bg-emerald-700 px-3 py-2 shadow-sm">
              <p className="text-[13px] text-foreground/90 dark:text-white leading-relaxed whitespace-pre-wrap">
                {body.replace(/\{\{1\}\}/g, "João").replace(/\{\{2\}\}/g, "Clínica Sorriso")}
              </p>
              <p className="text-[10px] text-foreground/50 dark:text-white/70 text-right mt-1">10:24 ✓✓</p>
            </div>
          </div>
        </div>
      </div>
    </div>
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
