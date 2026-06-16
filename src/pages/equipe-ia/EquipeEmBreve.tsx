import { Bot, Sparkles, MessageSquare, Brain, Workflow, Users, Zap, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const features = [
  {
    icon: Brain,
    title: "Colaboradores digitais com cérebro próprio",
    desc: "Cada agente aprende seu negócio, seu tom de voz e seus processos — sem precisar configurar prompt.",
  },
  {
    icon: MessageSquare,
    title: "Atendimento 24/7 no WhatsApp",
    desc: "Responda leads em segundos, qualifique e agende reuniões enquanto seu time dorme.",
  },
  {
    icon: Workflow,
    title: "Conexão com CRM e Fluxos",
    desc: "Movimente leads no Kanban, dispare campanhas e integre com seus fluxos automaticamente.",
  },
  {
    icon: Users,
    title: "Equipe inteira em minutos",
    desc: "Monte SDRs, Closers, Suporte e Pós-venda em um único painel visual.",
  },
  {
    icon: Zap,
    title: "Ativação em menos de 2 minutos",
    desc: "Escolha um modelo pronto, ajuste detalhes e publique. Sem código, sem complicação.",
  },
  {
    icon: ShieldCheck,
    title: "Controle total e versionamento",
    desc: "Teste antes de publicar, salve versões e restaure quando quiser.",
  },
];

export default function EquipeEmBreve() {
  const [joined, setJoined] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Em breve na Wiize</span>
          </div>

          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-6">
            <Bot className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Equipe IA
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            Sua nova equipe de <span className="text-foreground font-medium">colaboradores digitais</span>.
            Atendem, qualificam, vendem e movimentam seu CRM 24/7 — sem precisar contratar mais ninguém.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => {
                setJoined(true);
                toast({
                  title: "Você está na lista! 🎉",
                  description: "Avisaremos assim que a Equipe IA for liberada na sua conta.",
                });
              }}
              disabled={joined}
              className="min-w-[220px]"
            >
              {joined ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Na lista de espera
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Quero acesso antecipado
                </>
              )}
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Lançamento em breve
            </div>
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-3">O que vem aí</Badge>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Uma equipe inteira trabalhando por você
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <Card key={f.title} className="p-6 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <Card className="mt-16 p-8 md:p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              Seja um dos primeiros a ativar
            </h3>
            <p className="text-muted-foreground mb-6">
              Quem entrar na lista de espera terá acesso antecipado, condições especiais de lançamento e
              suporte direto da nossa equipe na configuração dos primeiros colaboradores digitais.
            </p>
            <Button
              size="lg"
              onClick={() => {
                setJoined(true);
                toast({
                  title: "Você está na lista! 🎉",
                  description: "Avisaremos assim que a Equipe IA for liberada na sua conta.",
                });
              }}
              disabled={joined}
            >
              {joined ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Inscrição confirmada
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Entrar na lista de espera
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
