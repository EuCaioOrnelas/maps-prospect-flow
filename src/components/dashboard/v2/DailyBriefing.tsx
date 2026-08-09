import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquareText, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ExecutiveAlert } from "./ExecutiveAlerts";

interface DailyBriefingProps {
  alerts: ExecutiveAlert[];
  userName?: string | null;
  periodDays: number;
}

interface BriefingMessage {
  id: string;
  text: string;
  items?: { text: string; route: string; tone: ExecutiveAlert["type"] }[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function firstName(name?: string | null) {
  if (!name) return null;
  const clean = name.trim().split(/\s+/)[0];
  if (!clean) return null;
  return capitalize(clean.toLowerCase());
}

export function DailyBriefing({ alerts, userName, periodDays }: DailyBriefingProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const today = new Date();
  const dateLabel = capitalize(
    today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
  );

  const messages = useMemo<BriefingMessage[]>(() => {
    const list = (alerts || []).filter((a) => !a.text.includes("NaN"));
    const critical = list.filter((a) => a.type === "danger");
    const attention = list.filter((a) => a.type === "warning");
    const positives = list.filter((a) => a.type === "success");
    const infos = list.filter((a) => a.type === "info");

    const name = firstName(userName);
    const hello = `${greeting(today.getHours())}${name ? `, ${name}` : ""}! Aqui está o seu resumo comercial de hoje, considerando os últimos ${periodDays} dias.`;

    const msgs: BriefingMessage[] = [{ id: "hello", text: hello }];

    if (positives.length > 0) {
      msgs.push({
        id: "positives",
        text:
          positives.length === 1
            ? "Começando pela boa notícia do dia:"
            : `Boas notícias primeiro: identifiquei ${positives.length} pontos positivos na sua operação.`,
        items: positives.slice(0, 4).map((a) => ({ text: a.text, route: a.route, tone: a.type })),
      });
    }

    if (critical.length > 0) {
      msgs.push({
        id: "critical",
        text:
          critical.length === 1
            ? "Tem um ponto crítico que precisa da sua atenção agora:"
            : `Tem ${critical.length} pontos críticos que precisam da sua atenção agora:`,
        items: critical.slice(0, 4).map((a) => ({ text: a.text, route: a.route, tone: a.type })),
      });
    }

    if (attention.length > 0) {
      msgs.push({
        id: "attention",
        text:
          attention.length === 1
            ? "E mais um ponto de atenção para acompanhar:"
            : `Além disso, ${attention.length} pontos de atenção para acompanhar:`,
        items: attention.slice(0, 4).map((a) => ({ text: a.text, route: a.route, tone: a.type })),
      });
    }

    if (critical.length === 0 && attention.length === 0) {
      msgs.push({
        id: "clean",
        text: "Nenhum risco crítico hoje. Sua operação está com os indicadores dentro do esperado.",
      });
    }

    if (infos.length > 0) {
      msgs.push({
        id: "infos",
        text: "Duas observações que podem ajudar no planejamento dos envios:",
        items: infos.slice(0, 2).map((a) => ({ text: a.text, route: a.route, tone: a.type })),
      });
    }

    const priority = critical[0] || attention[0] || positives[0];
    msgs.push({
      id: "closing",
      text: priority
        ? `Minha recomendação para hoje: comece por "${priority.text}". Resolver isso primeiro é o que mais move o seu resultado.`
        : "Minha recomendação para hoje: mantenha o ritmo de prospecção e follow-up para sustentar o pipeline.",
    });

    return msgs;
  }, [alerts, userName, periodDays]);

  return (
    <Card className="border-border/40 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquareText size={16} className="text-primary" />
            Briefing do dia
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{dateLabel}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <>Abrir <ChevronDown size={14} /></> : <>Fechar <ChevronUp size={14} /></>}
        </Button>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-3 pb-5">
          {messages.map((m) => (
            <div key={m.id} className="flex gap-2.5">
              <div className="w-7 h-7 shrink-0 rounded-sm bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                W
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="inline-block max-w-full rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm text-foreground/85 leading-relaxed">
                  {m.text}
                </div>
                {m.items && m.items.length > 0 && (
                  <div className="space-y-1.5">
                    {m.items.map((it, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => navigate(it.route)}
                        className={cn(
                          "w-full text-left flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm transition-colors group",
                          it.tone === "danger"
                            ? "bg-destructive/[0.06] border-destructive/20 hover:bg-destructive/10"
                            : it.tone === "warning"
                            ? "bg-yellow-500/[0.06] border-yellow-500/20 hover:bg-yellow-500/10"
                            : it.tone === "success"
                            ? "bg-primary/[0.06] border-primary/20 hover:bg-primary/10"
                            : "bg-muted/50 border-border/30 hover:bg-muted/80",
                        )}
                      >
                        <span className="flex-1 text-foreground/80">{it.text}</span>
                        <ArrowRight
                          size={14}
                          className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
