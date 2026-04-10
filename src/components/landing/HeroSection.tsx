import { useEffect, useRef, useState } from "react";
import metaIcon from "@/assets/logos/meta-icon.png";
import gptIcon from "@/assets/logos/gpt-icon.png";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, Search, Zap, TrendingUp, MessageCircle, Users, Send, Check, 
  ChevronDown, Bot, Star, CalendarCheck, LayoutGrid, Sparkles, Clock,
  BadgeCheck, Brain, MousePointer2, Plus, MapPin
} from "lucide-react";
import { Link } from "react-router-dom";

/* ─── Animated counter ─── */
const AnimatedCounter = ({ value, duration = 2000 }: { value: string; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        const isPercentage = value.includes('%');
        const isPlus = value.startsWith('+');
        const hasK = value.includes('K');
        const hasM = value.includes('M');
        let numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
        const startTime = performance.now();
        const animate = (t: number) => {
          const p = Math.min((t - startTime) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 4);
          const cur = numericValue * ease;
          let f: string;
          if (hasM) f = cur.toFixed(1) + 'M+';
          else if (hasK) f = Math.floor(cur) + 'K+';
          else if (isPercentage) f = (isPlus ? '+' : '') + Math.floor(cur) + '%';
          else f = (isPlus ? '+' : '') + Math.floor(cur).toString();
          setDisplayValue(f);
          if (p < 1) requestAnimationFrame(animate); else setDisplayValue(value);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{displayValue}</span>;
};

/* ─── Stage definitions ─── */
const STAGE_DURATION = 5400;
const STAGE_CONTENT_HEIGHT = 340;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const segmentProgress = (progress: number, start: number, end: number) =>
  clamp01((progress - start) / (end - start));

interface Stage {
  color: string;
  label: string;
  icon: typeof Search;
}

const stages: Stage[] = [
  { color: "text-success",      label: "Captando leads qualificados",             icon: Search },
  { color: "text-warning",      label: "IA analisando e qualificando",            icon: Brain },
  { color: "text-info",         label: "Mensagens personalizadas automaticamente", icon: Sparkles },
  { color: "text-primary",      label: "Enviando mensagens automaticamente",       icon: Send },
  { color: "text-warning",      label: "Lead respondeu",                           icon: MessageCircle },
  { color: "text-destructive",  label: "IA conduzindo a conversa",                icon: Bot },
  { color: "text-success",      label: "Cliente fechado com sucesso",             icon: BadgeCheck },
  { color: "text-foreground",   label: "CRM atualizando automaticamente",         icon: LayoutGrid },
];

/* ─── Stage renders ─── */
const StageCapture = ({ progress }: { progress: number }) => {
  const leads = [
    { name: "CrossFit Box SP", phone: "(11) 99XXX-XXXX", rating: "4.8", note: "Matriz" },
    { name: "Arena Fit Training", phone: "(11) 98XXX-XXXX", rating: "4.6", note: "Unidade 2" },
    { name: "Power Gym Plus", phone: "(11) 97XXX-XXXX", rating: "4.9", note: "Plano premium" },
    { name: "Studio Core Fit", phone: "(11) 96XXX-XXXX", rating: "4.7", note: "Pilates + funcional" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-2">
      <div className="grid grid-cols-[1fr_auto] gap-2 shrink-0">
        <div className="grid gap-1.5">
          <div className="bg-secondary rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
            <Search size={12} className="text-muted-foreground" />
            <span className="text-foreground">academias</span>
            <span className="typing-cursor opacity-70">|</span>
          </div>
          <div className="bg-secondary rounded-lg px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-1.5">
            <MapPin size={11} className="text-primary" />
            <span>São Paulo, SP</span>
          </div>
        </div>
        <button className="bg-primary text-primary-foreground rounded-lg px-3 font-medium text-xs flex flex-col items-center justify-center gap-1 aspect-square shrink-0">
          <Search size={16} />
          <span>Buscar</span>
        </button>
      </div>
      <div className="rounded-xl bg-secondary/30 p-2 flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
        <div className="space-y-1.5 flex-1 min-h-0 overflow-hidden">
          {leads.map((l, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-background/55 rounded-lg p-2 border border-border/40"
              style={{
                opacity: progress > 0.08 + i * 0.12 ? 1 : 0,
                transform: `translateX(${progress > 0.08 + i * 0.12 ? 0 : -16}px)`,
                transition: "all 0.45s ease-out",
              }}
            >
              <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <Users size={12} className="text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[11px] truncate">{l.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{l.phone} · {l.note}</p>
              </div>
              <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary shrink-0">
                {l.rating}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 shrink-0">
          <div className="rounded-lg bg-success/10 p-1.5 border border-success/10">
            <p className="text-[9px] text-muted-foreground">Telefones validados</p>
            <p className="text-[10px] font-semibold text-success">4/4 com DDI + DDD</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-1.5 border border-primary/10">
            <p className="text-[9px] text-muted-foreground">Prontos para CRM</p>
            <p className="text-[10px] font-semibold text-primary">Importação instantânea</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StageDiagnosis = ({ progress }: { progress: number }) => {
  const diagnosticItems = [
    { label: "Presença digital", value: "Forte", icon: TrendingUp, color: "text-success", delay: 0.08 },
    { label: "Fit com ICP", value: "92%", icon: BadgeCheck, color: "text-primary", delay: 0.2 },
    { label: "Intenção de compra", value: "Alta", icon: Zap, color: "text-warning", delay: 0.34 },
    { label: "Decisor acessível", value: "Sim", icon: Users, color: "text-info", delay: 0.48 },
    { label: "Chance de reunião", value: "Muito alta", icon: MessageCircle, color: "text-success", delay: 0.62 },
  ];
  const tags = [
    { label: "Alto potencial", color: "bg-success/15 text-success" },
    { label: "Precisa de serviço", color: "bg-warning/15 text-warning" },
    { label: "Decisor identificado", color: "bg-info/15 text-info" },
  ];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center gap-2.5 bg-secondary/50 rounded-lg p-2.5">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Users size={12} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-xs">CrossFit Box SP</p>
          <p className="text-[10px] text-muted-foreground">(11) 99XXX-XXXX</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-warning/10 px-2 py-1" style={{ opacity: progress > 0.58 ? 1 : 0, transition: 'opacity 0.6s' }}>
          <img src={gptIcon} alt="GPT" className="w-6 h-6 rounded-full" />
          <span className="text-sm font-bold text-warning">{Math.min(Math.round(progress * 847), 847)}</span>
        </div>
      </div>
      <div className="rounded-xl bg-secondary/30 p-2.5 flex-1 min-h-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <img src={gptIcon} alt="GPT" className="w-6 h-6 rounded-full" />
          <div>
            <p className="text-[10px] font-medium text-primary">GPT cruzando sinais comerciais em tempo real</p>
            <p className="text-[10px] text-muted-foreground">Website, presença local, potencial e score preditivo</p>
          </div>
        </div>
        <div className="grid gap-1.5">
          {diagnosticItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-background/45 rounded-md px-2.5 py-1.5 border border-border/40"
              style={{
                opacity: progress > item.delay ? 1 : 0,
                transform: `translateX(${progress > item.delay ? 0 : -10}px)`,
                transition: 'all 0.6s ease-out'
              }}
            >
              <item.icon size={11} className={item.color} />
              <span className="text-[10px] text-muted-foreground flex-1">{item.label}</span>
              <span className={`text-[10px] font-semibold ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.color}`}
              style={{ opacity: progress > 0.58 + i * 0.08 ? 1 : 0, transform: `scale(${progress > 0.58 + i * 0.08 ? 1 : 0.85})`, transition: 'all 0.4s ease-out' }}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div
          className="rounded-lg border border-primary/10 bg-primary/5 p-2"
          style={{ opacity: progress > 0.74 ? 1 : 0, transform: `translateY(${progress > 0.74 ? 0 : 8}px)`, transition: 'all 0.5s ease-out' }}
        >
          <p className="text-[10px] font-semibold text-primary">Diagnóstico automático</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Lead com alta aderência ao ICP, boa presença local e janela favorável para uma abordagem consultiva.
          </p>
        </div>
      </div>
    </div>
  );
};

const StageMessage = ({ progress }: { progress: number }) => {
  const fullMsg = 'Oi João, vi que a CrossFit Box SP está com ótimas avaliações! Tenho uma proposta exclusiva que pode ajudar a crescer ainda mais...';
  const visibleChars = Math.round(progress * fullMsg.length);
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2.5">
        <div className="w-7 h-7 rounded-full bg-info/15 flex items-center justify-center shrink-0">
          <Users size={12} className="text-info" />
        </div>
        <div>
          <p className="font-medium text-xs">CrossFit Box SP</p>
          <p className="text-[10px] text-muted-foreground">João Silva — Proprietário</p>
        </div>
      </div>
      <div className="bg-secondary/30 rounded-lg p-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={11} className="text-primary animate-pulse" />
          <span className="text-[10px] font-medium text-primary">IA gerando mensagem personalizada</span>
        </div>
        <div className="bg-background/60 rounded-lg p-2.5 text-xs text-foreground leading-relaxed flex-1">
          {fullMsg.slice(0, visibleChars)}
          {visibleChars < fullMsg.length && <span className="typing-cursor opacity-70">|</span>}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Sparkles size={9} /> Variáveis dinâmicas</span>
          <span className="flex items-center gap-1"><Check size={9} className="text-success" /> Anti-spam</span>
        </div>
      </div>
    </div>
  );
};

const StageSend = ({ progress }: { progress: number }) => {
  const contacts = [
    "CrossFit Box SP",
    "Arena Fit Training",
    "Power Gym Plus",
    "Studio Alpha Wellness",
  ];

  const steps = contacts.map((_, index) => {
    const start = 0.06 + index * 0.18;
    const end = start + 0.13;
    const delivered = end + 0.08;

    return {
      start,
      end,
      delivered,
      sendingProgress: segmentProgress(progress, start, end),
    };
  });

  const overallProgress = Math.round(
    (steps.reduce((total, step) => total + step.sendingProgress, 0) / contacts.length) * 100
  );
  const startedCount = steps.filter((step) => progress >= step.start).length;
  const deliveredCount = steps.filter((step) => progress >= step.delivered).length;
  const activeIndex = steps.findIndex(
    (step) => progress >= step.start && progress < step.end
  );

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="space-y-2 flex-1 min-h-0">
        {contacts.map((c, i) => {
          const step = steps[i];
          const sent = progress >= step.start;
          const delivered = progress >= step.delivered;
          const sendPercent = delivered ? 100 : Math.round(step.sendingProgress * 100);

          return (
            <div key={i} className="bg-secondary/45 rounded-xl p-2.5 border border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Send size={11} className={`text-primary ${sent && !delivered ? 'animate-pulse' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">{c}</p>
                  <p className="text-[10px] text-muted-foreground truncate">Fila oficial · cadência inteligente</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {delivered ? (
                    <span className="text-[10px] text-success font-medium flex items-center gap-0.5"><Check size={10} /> Entregue</span>
                  ) : sent ? (
                    <span className="text-[10px] text-primary font-medium flex items-center gap-0.5"><Clock size={10} className="animate-pulse" /> {sendPercent}%</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Na fila</span>
                  )}
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${sendPercent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-primary/10 rounded-xl p-3 border border-primary/10">
        <div className="flex items-center gap-2 mb-2">
          <Send size={12} className="text-primary animate-pulse" />
          <span className="text-[11px] font-medium text-primary">Disparo em massa em andamento</span>
          <span className="text-[11px] font-semibold text-primary ml-auto">{overallProgress}%</span>
        </div>
        <div className="w-full bg-primary/10 rounded-full h-2 overflow-hidden">
          <div className="bg-primary h-2 rounded-full" style={{ width: `${overallProgress}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-muted-foreground">
          <span>{startedCount}/{contacts.length} contatos em processamento</span>
          <span>{deliveredCount} entregues{activeIndex >= 0 ? ` • ${contacts[activeIndex]}` : ''}</span>
        </div>
      </div>
    </div>
  );
};

const StageReply = ({ progress }: { progress: number }) => {
  const messages = [
    {
      dir: 'out',
      text: 'Oi João, vi que a CrossFit Box SP está crescendo bem. Faz sentido eu te mostrar como captar mais matrículas com IA?',
      time: '10:32',
      start: 0.06,
    },
    {
      dir: 'in',
      text: 'Pode sim. Vocês atendem academia com duas unidades?',
      time: '10:34',
      start: 0.28,
    },
    {
      dir: 'out',
      text: 'Atendemos. Inclusive centralizamos captação, resposta e CRM no mesmo fluxo para as duas unidades.',
      time: '10:34',
      start: 0.48,
    },
    {
      dir: 'in',
      text: 'Perfeito. Me manda valores e uma demonstração.',
      time: '10:35',
      start: 0.72,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="rounded-xl bg-secondary/30 p-2.5 flex-1 min-h-0">
        <div className="flex h-full flex-col justify-end gap-2 overflow-hidden">
          {messages.map((message, index) => {
            if (progress <= message.start) return null;

            return (
              <div key={index} className={`flex ${message.dir === 'out' ? 'justify-end' : 'justify-start'}`} style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
                <div className={`${message.dir === 'out' ? 'bg-primary/15 rounded-tr-sm' : 'bg-background/70 rounded-tl-sm'} rounded-xl px-3 py-2 max-w-[84%] border border-border/30`}>
                  <p className="text-[11px] text-foreground leading-relaxed">{message.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[8px] text-muted-foreground">{message.time}</span>
                    {message.dir === 'out' && (
                      <>
                        <Check size={8} className="text-primary" />
                        <Check size={8} className="text-primary -ml-1" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {progress > 0.18 && progress < 0.28 && (
            <div className="flex justify-start" style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
              <div className="bg-background/70 rounded-xl rounded-tl-sm px-3 py-2 border border-border/30">
                <div className="flex items-center gap-1 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '120ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-success/10 rounded-lg p-2.5 flex items-center gap-2 border border-success/10">
        <MessageCircle size={12} className="text-success" />
        <span className="text-[10px] font-medium text-success">Lead respondeu e abriu janela ativa para atendimento</span>
      </div>
    </div>
  );
};

const StageAIChat = ({ progress }: { progress: number }) => {
  const msgs = [
    { dir: 'in', text: 'Vi a demo. Consigo integrar com WhatsApp oficial?', time: '10:34', start: 0.08 },
    { dir: 'out', text: 'Sim. A operação capta leads, qualifica, dispara mensagens e atualiza o CRM no mesmo fluxo.', time: '10:34', start: 0.2 },
    { dir: 'in', text: 'E meu time comercial acompanha isso ao vivo?', time: '10:35', start: 0.34 },
    { dir: 'out', text: 'Acompanha tudo em tempo real com score, etapa, histórico e alertas de prioridade.', time: '10:35', start: 0.5 },
    { dir: 'in', text: 'Gostei. Quero ver proposta e prazo de implantação.', time: '10:36', start: 0.66 },
    { dir: 'out', text: 'Perfeito. Reservei uma reunião amanhã às 14h e já enviei o resumo executivo para você.', time: '10:36', start: 0.82 },
  ];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center gap-2 rounded-xl bg-secondary/30 p-2.5 border border-border/40">
        <img src={gptIcon} alt="GPT" className="w-7 h-7 rounded-full" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-primary">Agente de IA respondendo em tempo real</p>
          <p className="text-[10px] text-muted-foreground truncate">Contexto, score, CRM e histórico da conversa</p>
        </div>
        <div className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">GPT ativo</div>
      </div>
      <div className="rounded-xl bg-secondary/30 p-2.5 flex-1 min-h-0">
        <div className="flex h-full flex-col justify-end gap-1.5 overflow-hidden">
          {msgs.map((m, i) => {
            if (progress <= m.start) return null;

            return (
              <div key={i} className={`flex ${m.dir === 'out' ? 'justify-end' : 'justify-start'}`} style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
                <div className={`${m.dir === 'out' ? 'bg-primary/15 rounded-tr-sm' : 'bg-background/75 rounded-tl-sm'} rounded-xl px-2.5 py-1.5 max-w-[84%] border border-border/30`}>
                  <p className="text-[10px] text-foreground leading-relaxed">{m.text}</p>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="text-[8px] text-muted-foreground">{m.time}</span>
                    {m.dir === 'out' && <Bot size={8} className="text-primary" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-success/10 p-2 border border-success/10">
          <p className="text-[9px] text-muted-foreground">Intenção detectada</p>
          <p className="text-[10px] font-semibold text-success">Alta prioridade comercial</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 border border-primary/10">
          <p className="text-[9px] text-muted-foreground">Próximo passo</p>
          <p className="text-[10px] font-semibold text-primary">Reunião agendada</p>
        </div>
      </div>
    </div>
  );
};

const StageClose = ({ progress }: { progress: number }) => (
  <div className="flex h-full flex-col">
    <div className="flex items-center gap-2.5 bg-secondary/50 rounded-lg p-2.5">
      <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center shrink-0">
        <Users size={12} className="text-success" />
      </div>
      <div className="flex-1"><p className="font-medium text-xs">CrossFit Box SP</p><p className="text-[10px] text-muted-foreground">João Silva</p></div>
    </div>
    <div className="flex flex-col items-center justify-center gap-3 flex-1">
      {progress > 0.2 && (
        <div className="flex items-center gap-2 bg-success/15 rounded-full px-4 py-2.5" style={{ animation: 'scaleIn 0.5s ease-out' }}>
          <BadgeCheck size={18} className="text-success" />
          <span className="text-sm font-bold text-success">Cliente Fechado!</span>
        </div>
      )}
      {progress > 0.4 && (
        <div className="flex items-center gap-2 bg-info/10 rounded-full px-3 py-1.5" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
          <CalendarCheck size={13} className="text-info" />
          <span className="text-[11px] font-medium text-info">Reunião agendada — Sex 14:00</span>
        </div>
      )}
      {progress > 0.6 && (
        <div className="flex items-center gap-2 bg-warning/10 rounded-full px-3 py-1.5" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
          <Star size={13} className="text-warning" />
          <span className="text-[11px] font-medium text-warning">Valor: R$ 5.964/ano</span>
        </div>
      )}
      {progress > 0.8 && (
        <div className="flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1.5" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
          <TrendingUp size={13} className="text-primary" />
          <span className="text-[11px] font-medium text-primary">Movido para CRM automaticamente</span>
        </div>
      )}
    </div>
  </div>
);

const StageCRM = ({ progress }: { progress: number }) => {
  const createdLead = { name: "Studio Pilates One", score: 514, value: "R$ 4.7k" };
  const createdLeadQualified = { ...createdLead, score: 684, value: "R$ 6.2k" };
  const leadCreated = progress >= 0.18;
  const dragProgress = segmentProgress(progress, 0.38, 0.76);
  const dragActive = dragProgress > 0 && dragProgress < 1;
  const dragComplete = progress >= 0.76;
  const clickPulse = progress > 0.08 && progress < 0.18;

  const columns = [
    {
      title: "Novo",
      color: "bg-info",
      accent: "text-info",
      leads: [
        { name: "Dental Prime", score: 320, value: "R$ 3.2k" },
        ...(leadCreated && !dragComplete ? [createdLead] : []),
      ],
      showAdd: true,
    },
    {
      title: "Qualificado",
      color: "bg-warning",
      accent: "text-warning",
      leads: [
        { name: "Barbearia VIP", score: 580, value: "R$ 4.8k" },
        { name: "Pet Shop Rex", score: 620, value: "R$ 5.1k" },
        ...(dragComplete ? [createdLeadQualified] : []),
      ],
      highlight: progress > 0.44,
    },
    {
      title: "Proposta",
      color: "bg-primary",
      accent: "text-primary",
      leads: [
        { name: "Pizzaria Bella", score: 710, value: "R$ 7.4k" },
        { name: "Clínica Orto Mais", score: 760, value: "R$ 9.2k" },
      ],
    },
    {
      title: "Fechado",
      color: "bg-success",
      accent: "text-success",
      leads: [
        { name: "CrossFit Box SP", score: 847, value: "R$ 5.964" },
        { name: "Arena Black", score: 902, value: "R$ 8.400" },
      ],
    },
  ];

  const cursorX = progress < 0.18 ? 21 : progress < 0.38 ? 12 : 12 + dragProgress * 25;
  const cursorY = progress < 0.18 ? 10 : progress < 0.38 ? 42 : 42 - dragProgress * 4;

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="relative flex-1 min-h-0">
        <div className="grid h-full grid-cols-4 gap-2">
          {columns.map((col, i) => (
            <div
              key={i}
              className={`rounded-xl border bg-secondary/35 p-2 flex flex-col min-h-0 ${col.highlight ? 'border-warning/50 ring-1 ring-warning/20 shadow-lg shadow-warning/10' : 'border-border/40'}`}
              style={{
                opacity: progress > i * 0.06 ? 1 : 0,
                transform: `translateY(${progress > i * 0.06 ? 0 : 8}px)`,
                transition: 'all 0.45s ease-out',
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-1.5 h-1.5 rounded-full ${col.color}`} />
                <span className="text-[9px] font-semibold text-foreground truncate">{col.title}</span>
                <span className="text-[8px] text-muted-foreground ml-auto">{col.leads.length}</span>
                {col.showAdd && (
                  <div className="relative flex h-5 w-5 items-center justify-center rounded-md border border-border/50 bg-background/70">
                    <Plus size={10} className="text-primary" />
                    {clickPulse && <span className="absolute inset-0 rounded-md border border-primary/40 animate-ping" />}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-h-0">
                {col.leads.map((lead, leadIndex) => (
                  <div key={`${lead.name}-${leadIndex}`} className="rounded-lg border border-border/40 bg-background/75 p-1.5 shadow-sm" style={{ animation: progress > 0.16 ? 'fadeSlideUp 0.3s ease-out' : 'none' }}>
                    <p className="font-medium text-[8px] text-foreground truncate">{lead.name}</p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className={`text-[8px] font-semibold ${col.accent}`}>Score {lead.score}</span>
                      <span className="text-[8px] text-muted-foreground truncate">{lead.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute z-30 text-primary"
            style={{
              left: `${cursorX}%`,
              top: `${cursorY}%`,
              transform: `translate(-50%, -50%) scale(${clickPulse ? 0.95 : 1})`,
              transition: 'left 0.14s linear, top 0.14s linear, transform 0.14s linear',
            }}
          >
            <MousePointer2 size={16} className="drop-shadow-md" />
          </div>

          {dragActive && (
            <div
              className="absolute z-20 w-[23%] rounded-lg border border-primary/20 bg-background/95 p-1.5 shadow-lg shadow-primary/10"
              style={{
                left: `${10 + dragProgress * 25}%`,
                top: `${38 - dragProgress * 4}%`,
                transform: `rotate(${2 - dragProgress * 4}deg)`,
                transition: 'left 0.14s linear, top 0.14s linear, transform 0.14s linear',
              }}
            >
              <p className="font-medium text-[8px] text-foreground truncate">{createdLead.name}</p>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="text-[8px] font-semibold text-primary">Score {createdLead.score}</span>
                <span className="text-[8px] text-muted-foreground">{createdLead.value}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-secondary/30 rounded-xl p-2.5 flex items-center gap-2 border border-border/40">
        <TrendingUp size={12} className="text-success" />
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-foreground">Lead criado e movido automaticamente</p>
          <p className="text-[10px] text-muted-foreground truncate">Studio Pilates One entrou no CRM e avançou para Qualificado com novo score</p>
        </div>
      </div>
    </div>
  );
};

const stageRenderers = [StageCapture, StageDiagnosis, StageMessage, StageSend, StageReply, StageAIChat, StageClose, StageCRM];

/* ─── Floating cards ─── */
const floatingCards = [
  { icon: Send, value: "900K+", label: "Mensagens enviadas", position: "-left-[10.5rem] top-4", delay: "0.8s" },
  { icon: Users, value: "50K+", label: "Empresas prospectadas", position: "left-1/3 -top-8", delay: "1.2s" },
  { icon: TrendingUp, value: "63%", label: "Taxa de resposta", position: "-left-[7.5rem] bottom-[5.5rem]", delay: "1.6s" },
  { icon: Zap, value: "+40%", label: "Conversão vs tradicional", position: "-right-10 -bottom-3", delay: "2s" },
];

/* ─── Main component ─── */
interface HeroSectionProps { onSignupClick?: () => void; }

export const HeroSection = ({ onSignupClick }: HeroSectionProps) => {
  const [scrollY, setScrollY] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const animationSnapshotRef = useRef({ stage: 0, progress: 0 });

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) { requestAnimationFrame(() => { setScrollY(window.scrollY); ticking = false; }); ticking = true; }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setIsAnimating(e.isIntersecting), { threshold: 0.2 });
    if (demoRef.current) obs.observe(demoRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    animationSnapshotRef.current = { stage: currentStage, progress: stageProgress };
  }, [currentStage, stageProgress]);

  useEffect(() => {
    if (!isAnimating) return;

    const totalDuration = STAGE_DURATION * stages.length;
    const offset =
      animationSnapshotRef.current.stage * STAGE_DURATION +
      animationSnapshotRef.current.progress * STAGE_DURATION;
    const startTime = performance.now() - offset;
    let frameId = 0;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const cycleElapsed = ((elapsed % totalDuration) + totalDuration) % totalDuration;
      const nextStage = Math.floor(cycleElapsed / STAGE_DURATION);
      const nextProgress = (cycleElapsed % STAGE_DURATION) / STAGE_DURATION;

      setCurrentStage((prev) => (prev === nextStage ? prev : nextStage));
      setStageProgress(nextProgress);
      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [isAnimating]);

  const parallaxOffset = scrollY * 0.3;
  const imageOpacity = Math.max(1 - scrollY * 0.001, 0.7);
  const CurrentStageRenderer = stageRenderers[currentStage];
  const stage = stages[currentStage];

  return (
    <section ref={sectionRef} className="relative min-h-[85vh] flex items-center justify-center pt-16 pb-10 overflow-x-clip overflow-y-visible w-full">
      <div className="absolute inset-0 will-change-transform" style={{ transform: `translateY(${parallaxOffset * 0.5}px)`, background: "linear-gradient(180deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.72) 58%, hsl(var(--background) / 0.28) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.14] will-change-transform" style={{ transform: `translateY(${parallaxOffset * 0.2}px)`, backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`, backgroundSize: '18px 18px', maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cellipse cx='350' cy='220' rx='180' ry='200' fill='white'/%3E%3Cellipse cx='370' cy='420' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='550' cy='180' rx='200' ry='180' fill='white'/%3E%3Cellipse cx='560' cy='380' rx='100' ry='100' fill='white'/%3E%3Cellipse cx='750' cy='250' rx='180' ry='150' fill='white'/%3E%3Cellipse cx='800' cy='400' rx='60' ry='80' fill='white'/%3E%3Cellipse cx='900' cy='300' rx='120' ry='100' fill='white'/%3E%3Cellipse cx='1000' cy='350' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='200' cy='250' rx='100' ry='80' fill='white'/%3E%3C/svg%3E")`, WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cellipse cx='350' cy='220' rx='180' ry='200' fill='white'/%3E%3Cellipse cx='370' cy='420' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='550' cy='180' rx='200' ry='180' fill='white'/%3E%3Cellipse cx='560' cy='380' rx='100' ry='100' fill='white'/%3E%3Cellipse cx='750' cy='250' rx='180' ry='150' fill='white'/%3E%3Cellipse cx='800' cy='400' rx='60' ry='80' fill='white'/%3E%3Cellipse cx='900' cy='300' rx='120' ry='100' fill='white'/%3E%3Cellipse cx='1000' cy='350' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='200' cy='250' rx='100' ry='80' fill='white'/%3E%3C/svg%3E")`, maskSize: 'cover', WebkitMaskSize: 'cover', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-gradient-glow opacity-20 will-change-transform" style={{ transform: `translate(-50%, ${parallaxOffset * 0.3}px)` }} />

      <div className="container mx-auto px-6 sm:px-10 lg:px-16 relative z-10 max-w-[90rem] w-full">
        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-2 xl:gap-4 items-center">

          {/* LEFT */}
          <div className="text-center xl:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass mb-6 sm:mb-8 animate-fade-in border border-primary/10">
              <img src={metaIcon} alt="Meta" className="h-4 w-auto" />
              <span className="text-xs font-medium text-foreground tracking-tight">Meta Business Partner</span>
            </div>
            <h1 className="font-display text-[2.5rem] sm:text-[3rem] md:text-[3.5rem] lg:text-[3.75rem] xl:text-[4.25rem] font-bold mb-4 sm:mb-6 animate-slide-up text-foreground leading-[1.12]" style={{ animationDelay: "0.1s" }}>
              Transforme<br />Leads B2B em<br /><span className="text-shimmer-highlight">Clientes com IA</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-lg mx-auto xl:mx-0 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              Encontre leads qualificados, gere mensagens personalizadas com IA, automatize seu atendimento e follow-up no WhatsApp com inteligência artificial.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-3 sm:gap-4 mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <Link to="/signup" className="shrink-0" onClick={onSignupClick}>
                <Button variant="hero" size="lg" className="group rounded-full text-base px-8 h-12">
                  Começar agora
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#features" className="group shrink-0">
                <Button variant="ghost" size="lg" className="rounded-full text-base px-8 h-12 border border-transparent hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all">
                  Ver como funciona
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>
          </div>

          {/* RIGHT: 8-stage demo */}
          <div className="animate-slide-up will-change-transform w-full hidden xl:flex xl:justify-end" style={{ animationDelay: "0.5s", transform: `translateY(${-parallaxOffset * 0.05}px)`, opacity: imageOpacity }}>
            <div className="relative w-full max-w-[28rem] 2xl:max-w-[30rem]">
              <div className="absolute -inset-4 bg-primary/8 blur-3xl rounded-3xl will-change-transform" style={{ transform: `scale(${1 + scrollY * 0.0001})` }} />

              {/* Floating cards */}
              {floatingCards.map((card, i) => (
                <div key={i} className={`absolute ${card.position} z-30 floating-card hidden lg:block`} style={{ animationDelay: card.delay }}>
                  <div className="glass rounded-lg p-3 shadow-lg shadow-primary/10 border border-border/50 hover:border-primary/20 transition-all hover:scale-105">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><card.icon size={14} className="text-primary" /></div>
                      <div><p className="text-sm font-bold text-foreground"><AnimatedCounter value={card.value} duration={2000} /></p><p className="text-[10px] text-muted-foreground whitespace-nowrap">{card.label}</p></div>
                    </div>
                  </div>
                </div>
              ))}

              <div ref={demoRef} className={`relative glass rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-glow transition-shadow duration-500 ${isAnimating ? 'demo-animating' : 'demo-paused'}`}>
                {/* Window controls */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium tracking-wide uppercase">Wiize Platform</span>
                </div>

                <div className="bg-background/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  {/* Stage indicator bar */}
                  <div className="flex items-center gap-1 mb-3">
                    {stages.map((s, i) => (
                      <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-secondary/60">
                        <div
                          className={`h-full rounded-full ${i <= currentStage ? 'bg-primary' : 'bg-transparent'}`}
                          style={{ width: i < currentStage ? '100%' : i === currentStage ? `${stageProgress * 100}%` : '0%' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Stage label */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <stage.icon size={13} className={stage.color} />
                    <span className={`text-[11px] font-semibold ${stage.color}`}>{stage.label}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto">{currentStage + 1}/8</span>
                  </div>

                  {/* Stage content - fixed height */}
                  <div className="overflow-hidden" key={currentStage} style={{ height: STAGE_CONTENT_HEIGHT, animation: 'fadeSlideUp 0.4s ease-out' }}>
                    <CurrentStageRenderer progress={stageProgress} />
                  </div>
                </div>
                {/* Watermark */}
                <div className="absolute bottom-2 left-4 text-[8px] text-muted-foreground/40 font-medium tracking-wide">@wiizebrasil</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce opacity-50">
        <ChevronDown size={22} className="text-muted-foreground" />
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  );
};
