import { useEffect, useState, useRef, useMemo } from "react";
import metaIcon from "@/assets/logos/meta-icon.png";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, Search, Zap, TrendingUp, MessageCircle, Users, Send, Check, 
  ChevronDown, Bot, Star, CalendarCheck, LayoutGrid, Sparkles, Clock, 
  BadgeCheck, Brain, ChevronRight
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
const STAGE_DURATION = 3200; // ms per stage

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
    { name: "CrossFit Box SP", phone: "(11) 99XXX-XXXX", rating: "4.8" },
    { name: "Arena Fit Training", phone: "(11) 98XXX-XXXX", rating: "4.6" },
    { name: "Power Gym Plus", phone: "(11) 97XXX-XXXX", rating: "4.9" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="bg-secondary rounded-lg px-3 py-2 text-xs flex items-center gap-2">
            <Search size={12} className="text-muted-foreground" />
            <span className="text-foreground">academias</span>
            <span className="typing-cursor opacity-70">|</span>
          </div>
          <div className="bg-secondary rounded-lg px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-1.5">
            <span>📍</span> São Paulo, SP
          </div>
        </div>
        <button className="bg-primary text-primary-foreground rounded-lg px-3 font-medium text-xs flex flex-col items-center justify-center gap-1 aspect-square shrink-0">
          <Search size={16} />
          <span>Buscar</span>
        </button>
      </div>
      <div className="space-y-1.5 mt-1">
        {leads.map((l, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 bg-secondary/50 rounded-lg p-2.5 transition-all duration-500"
            style={{
              opacity: progress > (i + 1) * 0.2 ? 1 : 0,
              transform: `translateX(${progress > (i + 1) * 0.2 ? 0 : -16}px)`,
              transitionDelay: `${i * 120}ms`
            }}
          >
            <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center shrink-0">
              <Users size={12} className="text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs truncate">{l.name}</p>
              <p className="text-[10px] text-muted-foreground">{l.phone} · ⭐ {l.rating}</p>
            </div>
            {progress > 0.7 && (
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const StageDiagnosis = ({ progress }: { progress: number }) => {
  const diagnosticItems = [
    { label: "Presença digital", value: "Forte", icon: TrendingUp, color: "text-success", delay: 0.15 },
    { label: "Fit com ICP", value: "92%", icon: BadgeCheck, color: "text-primary", delay: 0.3 },
    { label: "Intenção de compra", value: "Alta", icon: Zap, color: "text-warning", delay: 0.45 },
    { label: "Decisor acessível", value: "Sim", icon: Users, color: "text-info", delay: 0.6 },
  ];
  const tags = [
    { label: "Alto potencial", color: "bg-success/15 text-success" },
    { label: "Precisa de serviço", color: "bg-warning/15 text-warning" },
    { label: "Decisor identificado", color: "bg-info/15 text-info" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 bg-secondary/50 rounded-lg p-2.5">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Users size={12} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-xs">CrossFit Box SP</p>
          <p className="text-[10px] text-muted-foreground">(11) 99XXX-XXXX</p>
        </div>
        <div className="flex items-center gap-1" style={{ opacity: progress > 0.7 ? 1 : 0, transition: 'opacity 0.4s' }}>
          <Brain size={13} className="text-warning" />
          <span className="text-sm font-bold text-warning">{Math.min(Math.round(progress * 847), 847)}</span>
        </div>
      </div>
      <div className="bg-secondary/30 rounded-lg p-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain size={11} className="text-primary animate-pulse" />
          <span className="text-[10px] font-medium text-primary">IA analisando perfil do lead...</span>
        </div>
        {diagnosticItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-background/40 rounded-md px-2.5 py-1.5 transition-all duration-400"
            style={{ opacity: progress > item.delay ? 1 : 0, transform: `translateX(${progress > item.delay ? 0 : -10}px)`, transition: 'all 0.4s ease-out' }}
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
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.color} transition-all`}
            style={{ opacity: progress > 0.5 + i * 0.12 ? 1 : 0, transform: `scale(${progress > 0.5 + i * 0.12 ? 1 : 0.8})`, transition: 'all 0.3s ease-out' }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const StageMessage = ({ progress }: { progress: number }) => {
  const fullMsg = 'Oi João, vi que a CrossFit Box SP está com ótimas avaliações! Tenho uma proposta exclusiva que pode ajudar a crescer ainda mais...';
  const visibleChars = Math.round(progress * fullMsg.length);
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2.5">
        <div className="w-7 h-7 rounded-full bg-info/15 flex items-center justify-center shrink-0">
          <Users size={12} className="text-info" />
        </div>
        <div>
          <p className="font-medium text-xs">CrossFit Box SP</p>
          <p className="text-[10px] text-muted-foreground">João Silva — Proprietário</p>
        </div>
      </div>
      <div className="bg-secondary/30 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={11} className="text-primary animate-pulse" />
          <span className="text-[10px] font-medium text-primary">IA gerando mensagem personalizada</span>
        </div>
        <div className="bg-background/60 rounded-lg p-2.5 text-xs text-foreground leading-relaxed min-h-[60px]">
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
  const contacts = ["CrossFit Box SP", "Arena Fit Training", "Power Gym Plus"];
  return (
    <div className="space-y-2">
      {contacts.map((c, i) => {
        const sent = progress > (i + 1) * 0.25;
        const delivered = progress > (i + 1) * 0.25 + 0.15;
        return (
          <div key={i} className="flex items-center gap-2.5 bg-secondary/50 rounded-lg p-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Send size={11} className={`text-primary ${sent && !delivered ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs truncate">{c}</p>
            </div>
            <div className="flex items-center gap-1">
              {delivered ? (
                <span className="text-[10px] text-success font-medium flex items-center gap-0.5"><Check size={10} /> Entregue</span>
              ) : sent ? (
                <span className="text-[10px] text-primary font-medium flex items-center gap-0.5"><Clock size={10} className="animate-pulse" /> Enviando</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Aguardando</span>
              )}
            </div>
          </div>
        );
      })}
      <div className="bg-primary/10 rounded-lg p-2 flex items-center gap-2 mt-1">
        <Send size={11} className="text-primary" />
        <div className="flex-1">
          <div className="flex justify-between mb-0.5"><span className="text-[10px] font-medium text-primary">Disparando via WhatsApp</span><span className="text-[10px] text-primary">{Math.min(Math.round(progress * 3), 3)}/3</span></div>
          <div className="w-full bg-primary/10 rounded-full h-1"><div className="bg-primary h-1 rounded-full transition-all duration-500" style={{ width: `${Math.min(progress * 100, 100)}%` }} /></div>
        </div>
      </div>
    </div>
  );
};

const StageReply = ({ progress }: { progress: number }) => (
  <div className="space-y-2">
    <div className="flex justify-end">
      <div className="bg-primary/15 rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%]">
        <p className="text-xs text-foreground">Oi João, vi que a CrossFit Box SP está com ótimas avaliações!</p>
        <div className="flex items-center justify-end gap-1 mt-0.5"><span className="text-[9px] text-muted-foreground">10:32</span><Check size={9} className="text-primary" /><Check size={9} className="text-primary -ml-1.5" /></div>
      </div>
    </div>
    {progress > 0.4 && (
      <div className="flex justify-start" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
        <div className="bg-secondary rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
          {progress > 0.6 ? (
            <>
              <p className="text-xs text-foreground">Oi! Que legal, obrigado! Me conta mais sobre essa proposta? 🤔</p>
              <span className="text-[9px] text-muted-foreground">10:34</span>
            </>
          ) : (
            <div className="flex items-center gap-1 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    )}
    {progress > 0.7 && (
      <div className="bg-success/10 rounded-lg p-2 flex items-center gap-2" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
        <MessageCircle size={12} className="text-success" />
        <span className="text-[10px] font-medium text-success">Lead respondeu! Janela de 24h aberta</span>
      </div>
    )}
  </div>
);

const StageAIChat = ({ progress }: { progress: number }) => {
  const msgs = [
    { dir: 'in', text: 'Oi! Me conta mais sobre essa proposta? 🤔', time: '10:34' },
    { dir: 'out', text: 'Claro, João! Temos um plano especial para academias que faturam acima de 30k/mês com foco em retenção de alunos.', time: '10:34' },
    { dir: 'in', text: 'Interessante! Quanto custa?', time: '10:35' },
    { dir: 'out', text: 'O investimento começa em R$497/mês. Posso agendar uma demonstração gratuita para você?', time: '10:35' },
  ];
  const visibleCount = Math.min(Math.floor(progress * (msgs.length + 1)), msgs.length);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Bot size={12} className="text-primary animate-pulse" />
        <span className="text-[10px] font-medium text-primary">IA Wiize respondendo automaticamente</span>
      </div>
      <div className="space-y-1.5 max-h-[160px] overflow-hidden">
        {msgs.slice(0, visibleCount).map((m, i) => (
          <div key={i} className={`flex ${m.dir === 'out' ? 'justify-end' : 'justify-start'}`} style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
            <div className={`${m.dir === 'out' ? 'bg-primary/15 rounded-tr-sm' : 'bg-secondary rounded-tl-sm'} rounded-xl px-2.5 py-1.5 max-w-[85%]`}>
              <p className="text-[11px] text-foreground leading-relaxed">{m.text}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8px] text-muted-foreground">{m.time}</span>
                {m.dir === 'out' && <Bot size={8} className="text-primary" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StageClose = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2.5 bg-secondary/50 rounded-lg p-2.5">
      <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center shrink-0">
        <Users size={12} className="text-success" />
      </div>
      <div className="flex-1"><p className="font-medium text-xs">CrossFit Box SP</p><p className="text-[10px] text-muted-foreground">João Silva</p></div>
    </div>
    <div className="flex flex-col items-center gap-3 py-3">
      {progress > 0.3 && (
        <div className="flex items-center gap-2 bg-success/15 rounded-full px-4 py-2" style={{ animation: 'scaleIn 0.5s ease-out' }}>
          <BadgeCheck size={16} className="text-success" />
          <span className="text-sm font-bold text-success">Cliente Fechado!</span>
        </div>
      )}
      {progress > 0.5 && (
        <div className="flex items-center gap-2 bg-info/10 rounded-full px-3 py-1.5" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
          <CalendarCheck size={13} className="text-info" />
          <span className="text-[11px] font-medium text-info">Reunião agendada — Sex 14:00</span>
        </div>
      )}
      {progress > 0.7 && (
        <div className="flex items-center gap-2 bg-warning/10 rounded-full px-3 py-1.5" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
          <Star size={13} className="text-warning" />
          <span className="text-[11px] font-medium text-warning">Valor: R$ 5.964/ano</span>
        </div>
      )}
    </div>
  </div>
);

const StageCRM = ({ progress }: { progress: number }) => {
  const columns = [
    { title: "Novo", count: 12, color: "bg-info" },
    { title: "Qualificado", count: 8, color: "bg-warning" },
    { title: "Proposta", count: 5, color: "bg-primary" },
    { title: "Fechado", count: 3, color: "bg-success" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <LayoutGrid size={12} className="text-foreground" />
        <span className="text-[10px] font-medium text-foreground">CRM Kanban — Atualizado automaticamente</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {columns.map((col, i) => (
          <div key={i} className="bg-secondary/40 rounded-lg p-1.5" style={{ opacity: progress > i * 0.2 ? 1 : 0, transition: 'opacity 0.4s', transitionDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-1 mb-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${col.color}`} />
              <span className="text-[9px] font-medium text-foreground truncate">{col.title}</span>
            </div>
            <span className="text-[9px] text-muted-foreground">{col.count} leads</span>
            {i === 3 && progress > 0.6 && (
              <div className="mt-1 bg-success/10 rounded p-1 text-[8px] text-success font-medium" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
                CrossFit Box SP
                <div className="text-[7px] text-success/70">Score: 847</div>
              </div>
            )}
          </div>
        ))}
      </div>
      {progress > 0.5 && (
        <div className="bg-secondary/30 rounded-lg p-2 flex items-center gap-2 mt-1" style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>
          <TrendingUp size={11} className="text-success" />
          <span className="text-[10px] text-muted-foreground">Pipeline atualizado: <span className="text-success font-medium">+R$ 5.964</span> em receita prevista</span>
        </div>
      )}
    </div>
  );
};

const stageRenderers = [StageCapture, StageDiagnosis, StageMessage, StageSend, StageReply, StageAIChat, StageClose, StageCRM];

/* ─── Floating cards ─── */
const floatingCards = [
  { icon: Send, value: "900K+", label: "Mensagens enviadas", position: "-left-[10.5rem] top-4", delay: "0.8s" },
  { icon: Users, value: "50K+", label: "Empresas prospectadas", position: "-right-16 -top-10", delay: "1.2s" },
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

  // Stage cycling
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setCurrentStage(prev => (prev + 1) % stages.length);
      setStageProgress(0);
    }, STAGE_DURATION);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Progress within stage
  useEffect(() => {
    if (!isAnimating) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      setStageProgress(Math.min(elapsed / (STAGE_DURATION - 200), 1));
      if (elapsed < STAGE_DURATION - 200) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentStage, isAnimating]);

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
                          className={`h-full rounded-full transition-all duration-300 ${i < currentStage ? 'bg-primary' : i === currentStage ? 'bg-primary' : 'bg-transparent'}`}
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

                  {/* Stage content */}
                  <div className="min-h-[250px]" key={currentStage} style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
                    <CurrentStageRenderer progress={stageProgress} />
                  </div>
                </div>
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
