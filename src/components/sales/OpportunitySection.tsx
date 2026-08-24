import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { X, Check, ListChecks } from "lucide-react";
import logoWhiteAsset from "@/assets/wiize-logo-branca.png.asset.json";
import { SectionHeading } from "@/components/landing/SectionHeading";

type Row = { strong: string; rest: string };

const rows: Row[] = [
  { strong: "Encontra empresas do seu ICP", rest: "por nicho, região e características" },
  { strong: "Mostra quais têm mais potencial", rest: "antes de você gastar tempo com elas" },
  { strong: "Escreve a abordagem de cada empresa", rest: "com o contexto real do negócio" },
  { strong: "Inicia a conversa pelo WhatsApp oficial", rest: "com segurança e entrega garantida" },
  { strong: "Responde e qualifica o interesse", rest: "24 horas por dia, sem fila de espera" },
  { strong: "Faz follow-up de quem não respondeu", rest: "sem ninguém precisar lembrar" },
  { strong: "Marca a reunião na agenda do time", rest: "no horário que estiver livre" },
  { strong: "Registra tudo no CRM sozinha", rest: "conversas, histórico e etapa do funil" },
  { strong: "Mostra quem merece atenção agora", rest: "com base no interesse demonstrado" },
  { strong: "Continua trabalhando quando o time para", rest: "com automações e follow-up contínuo" },
  { strong: "Mostra o que está travando as vendas", rest: "com o resumo diário do Wian" },
];

const OldCell = () => (
  <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-destructive/10">
    <X size={14} className="text-destructive" strokeWidth={3} />
  </span>
);

const WiizeCell = () => (
  <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-primary shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
    <Check size={14} className="text-primary-foreground" strokeWidth={3} />
  </span>
);

export const OpportunitySection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading
          eyebrow="Antes e depois da Wiize"
          title="Como sua operação funcionava antes,"
          highlight="e como ela funciona com a Wiize"
          highlightFit="tight"
          description="Antes, cada etapa dependia de alguém lembrar, planilhar e correr atrás. Com a Wiize, prospecção, IA, conversas, follow-up, reuniões e CRM acontecem em um único fluxo."
          isVisible={isVisible}
        />


        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-card border border-border bg-card shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.25)]"
        >
          {/* Header */}
          <div className="grid grid-cols-[minmax(0,1fr)_82px_88px] sm:grid-cols-[minmax(0,1fr)_150px_180px]">
            <div className="flex min-h-20 items-center gap-2 px-3 sm:px-5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-primary/10 shrink-0">
                <ListChecks size={14} className="text-primary" strokeWidth={2.5} />
              </span>
              <span className="text-xs font-bold text-foreground sm:text-sm">Recurso</span>
            </div>
            <div className="flex min-h-20 items-center justify-center px-1 text-center">
              <span className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-sm">
                Antes (sem Wiize)
              </span>
            </div>
            <div className="flex min-h-20 flex-row items-center justify-center gap-2 sm:gap-3 bg-gradient-to-b from-primary to-primary/90 px-2">
              <img
                src={logoWhiteAsset.url}
                alt="Wiize"
                className="h-6 w-auto object-contain sm:h-8"
                loading="lazy"
              />
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, index) => (
            <motion.div
              key={row.strong}
              initial={{ opacity: 0, y: 6 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.12 + index * 0.035 }}
              className="grid min-h-14 grid-cols-[minmax(0,1fr)_82px_88px] border-t border-border sm:grid-cols-[minmax(0,1fr)_150px_180px]"
            >
              <div className="flex items-center px-3 py-3 sm:px-5">
                <span className="text-[11px] leading-snug text-muted-foreground sm:text-[15px]">
                  <span className="font-semibold text-foreground">{row.strong}</span> {row.rest}
                </span>
              </div>
              <div className="flex items-center justify-center py-3">
                <OldCell />
              </div>
              <div className="flex items-center justify-center border-l border-primary/15 bg-primary/[0.045] py-3 dark:bg-primary/10">
                <WiizeCell />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
