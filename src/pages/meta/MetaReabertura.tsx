import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, MessageCircle, FileText, Bell } from "lucide-react";
import { reaberturaFlows } from "@/components/meta/mockData";

const examples = [
  { icon: Calendar, title: "Confirmar reunião", desc: "Lembre o lead 2h antes do horário agendado" },
  { icon: MessageCircle, title: "Retomar contato", desc: "Reabra conversas inativas há mais de 48h" },
  { icon: FileText, title: "Enviar proposta", desc: "Dispare proposta após qualificação no CRM" },
  { icon: Bell, title: "Lembrete comercial", desc: "Mantenha leads quentes com follow-ups inteligentes" },
];

export default function MetaReabertura({ embedded = false }: { embedded?: boolean } = {}) {
  const body = (
    <>
      {!embedded && (
        <MetaPageHeader
          title="Fluxos de Reabertura"
          description="Automatize reaberturas de janela 24h usando templates aprovados Meta."
          actions={<Button size="sm"><Plus size={14} className="mr-1.5" /> Novo fluxo</Button>}
        />
      )}

      {embedded && (
        <div className="flex justify-end">
          <Button size="sm"><Plus size={14} className="mr-1.5" /> Novo fluxo</Button>
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
