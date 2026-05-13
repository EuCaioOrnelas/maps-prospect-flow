import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plug, RefreshCw, Trash2, Webhook, ShieldCheck, CheckCircle2, AlertTriangle, Phone,
} from "lucide-react";
import { numbers } from "@/components/meta/mockData";

const fmtN = (n: number) => n.toLocaleString("pt-BR");

const qualityColor: Record<string, string> = {
  HIGH: "bg-emerald-500/15 text-emerald-600",
  MEDIUM: "bg-amber-500/15 text-amber-600",
  LOW: "bg-rose-500/15 text-rose-600",
};

export default function MetaNumeros() {
  return (
    <MetaLayout title="Números & WABA" description="Gerencie números conectados, qualidade e tiers.">
      <MetaPageHeader
        title="Números & WABA"
        description="Status de conexão, qualidade e limites de cada número WhatsApp Business."
        actions={
          <Button size="sm"><Plug size={14} className="mr-1.5" /> Conectar via Embedded Signup</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {numbers.map((n) => {
          const usagePct = (n.daily / n.limit) * 100;
          return (
            <Card key={n.id} className="p-5 border-border/60">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-muted-foreground shrink-0" />
                    <p className="font-semibold text-foreground truncate">{n.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{n.phone}</p>
                </div>
                {n.status === "connected" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                    <CheckCircle2 size={10} className="mr-1" /> Conectado
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-600 border-0">
                    <AlertTriangle size={10} className="mr-1" /> Atenção
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quality rating</p>
                  <Badge className={`${qualityColor[n.quality]} border-0 mt-1`}>{n.quality}</Badge>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tier</p>
                  <p className="text-sm font-medium mt-1">{n.tier}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Uso diário</span>
                  <span className="tabular-nums font-medium">{fmtN(n.daily)} / {fmtN(n.limit)}</span>
                </div>
                <Progress value={usagePct} className="h-1.5" />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <ShieldCheck size={12} className={n.verified ? "text-emerald-500" : "text-muted-foreground/50"} />
                <span>{n.verified ? "Verificado pela Meta" : "Não verificado"}</span>
              </div>

              <div className="flex items-center gap-1 border-t border-border/60 pt-3">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"><RefreshCw size={12} className="mr-1" /> Reconectar</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Sincronizar</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs ml-auto"><Webhook size={12} /></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"><Trash2 size={12} /></Button>
              </div>
            </Card>
          );
        })}

        {/* Add new card */}
        <button className="rounded-[var(--radius-card)] border-2 border-dashed border-border/60 hover:border-primary/60 hover:bg-primary/5 transition-colors p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary min-h-[280px]">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Plug size={18} />
          </div>
          <p className="text-sm font-medium">Conectar novo número</p>
          <p className="text-xs">Embedded Signup oficial Meta</p>
        </button>
      </div>
    </MetaLayout>
  );
}
