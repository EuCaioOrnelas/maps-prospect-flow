import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, MessageCircle, FileText, Bell, HelpCircle, Clock, CheckCircle2, Zap } from "lucide-react";
import { reaberturaFlows } from "@/components/meta/mockData";

const examples = [
  { icon: Calendar, title: "Confirmar reunião", desc: "Lembre o lead 2h antes do horário agendado" },
  { icon: MessageCircle, title: "Retomar contato", desc: "Reabra conversas inativas há mais de 48h" },
  { icon: FileText, title: "Enviar proposta", desc: "Dispare proposta após qualificação no CRM" },
  { icon: Bell, title: "Lembrete comercial", desc: "Mantenha leads quentes com follow-ups inteligentes" },
];

export default function MetaReabertura({ embedded = false }: { embedded?: boolean } = {}) {
  const HowItWorksDialog = (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <HelpCircle size={14} /> Como funciona
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Como funciona a Reabertura?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O WhatsApp só permite enviar mensagens livres por <strong className="text-foreground">24h após a última resposta do lead</strong>. Passado esse tempo, você só pode reabrir a conversa usando um <strong className="text-foreground">template aprovado pela Meta</strong>. Os fluxos de Reabertura automatizam esse processo: detectam o gatilho, esperam o tempo configurado e disparam o template certo — trazendo o lead de volta sem você precisar lembrar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
          {[
            { icon: Zap, title: "1. Gatilho", desc: "Lead inativo, etapa do CRM, agendamento, etc." },
            { icon: Clock, title: "2. Espera", desc: "Aguarda o tempo definido (ex.: 48h, 2h antes)." },
            { icon: CheckCircle2, title: "3. Envio", desc: "Dispara o template aprovado e reabre a janela." },
          ].map((s) => (
            <div key={s.title} className="flex items-start gap-2 rounded-md bg-primary/5 border border-primary/15 p-3">
              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <s.icon size={13} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{s.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  const actions = (
    <div className="flex items-center gap-2">
      {HowItWorksDialog}
      <Button size="sm"><Plus size={14} className="mr-1.5" /> Novo fluxo</Button>
    </div>
  );

  const body = (
    <>
      {!embedded && (
        <MetaPageHeader
          title="Fluxos de Reabertura"
          description="Automatize reaberturas de janela 24h usando templates aprovados Meta."
          actions={actions}
        />
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Fluxos de Reabertura</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Reengaje leads automaticamente após a janela de 24h do WhatsApp.</p>
          </div>
          {actions}
        </div>
      )}
      {/* Examples */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Exemplos prontos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {examples.map((e) => (
            <Card key={e.title} className="p-4 border-border/60 hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <e.icon size={16} />
              </div>
              <p className="text-sm font-medium text-foreground">{e.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Active flows */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Fluxos ativos</h3>
        <Card className="border-border/60 divide-y divide-border/60">
          {reaberturaFlows.map((f) => (
            <div key={f.id} className="p-4 flex items-center gap-4">
              <Switch defaultChecked={f.active} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{f.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Template <span className="font-mono">{f.template}</span> · Disparo {f.delay}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-6 text-xs">
                <div className="text-right">
                  <p className="text-muted-foreground">Enviados</p>
                  <p className="tabular-nums font-medium text-foreground">{f.sent}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Abertos</p>
                  <p className="tabular-nums font-medium text-emerald-500">{f.opened}</p>
                </div>
              </div>
              <Badge variant={f.active ? "default" : "outline"}>{f.active ? "Ativo" : "Pausado"}</Badge>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Editar</Button>
            </div>
          ))}
        </Card>
      </div>
    </>
  );

  if (embedded) return <div className="space-y-6">{body}</div>;
  return (
    <MetaLayout title="Fluxos de Reabertura" description="Reengaje leads fora da janela de 24h com templates aprovados.">
      {body}
    </MetaLayout>
  );
}
