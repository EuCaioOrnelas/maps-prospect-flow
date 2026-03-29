import { SEO } from "@/components/SEO";
import { Shield, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SendingGuidelines = () => {
  const navigate = useNavigate();

  const doItems = [
    "Envie mensagens relevantes e personalizadas para cada lead",
    "Respeite imediatamente pedidos de opt-out (quando alguém pedir para parar)",
    "Use variações de texto para manter as mensagens naturais",
    "Mantenha o aquecimento ativo antes de iniciar campanhas maiores",
    "Identifique-se claramente nas mensagens (nome da empresa)",
    "Envie apenas dentro do horário comercial (8h às 20h)",
    "Mantenha um intervalo adequado entre os envios",
    "Use a funcionalidade de pausas inteligentes da plataforma",
  ];

  const dontItems = [
    "Enviar spam ou mensagens em massa sem personalização",
    "Conteúdo adulto, pornográfico ou sexualmente explícito",
    "Promoção de cassinos, apostas ou jogos de azar",
    "Venda de produtos falsificados, réplicas ou piratas",
    "Esquemas financeiros, pirâmides ou promessas de ganho fácil",
    "Conteúdo que incite violência, ódio ou discriminação",
    "Phishing, golpes ou tentativas de fraude",
    "Venda de armas, drogas ou substâncias ilegais",
    "Mensagens enganosas ou com informações falsas",
    "Ignorar pedidos de remoção ou opt-out dos contatos",
    "Enviar mensagens fora do horário comercial (madrugada)",
    "Usar números sem aquecimento adequado para grandes volumes",
  ];

  const consequences = [
    "Bloqueio temporário ou permanente do seu número pelo WhatsApp",
    "Suspensão da conta no Meta Business Suite",
    "Redução do tier de envio e limites da sua conta",
    "Perda do número e de todo o histórico de conversas",
    "Impossibilidade de recuperação em casos de violações graves",
  ];

  return (
    <>
      <SEO
        title="Diretrizes de Envio | Wiize"
        description="Boas práticas e orientações para envio de mensagens via WhatsApp pela plataforma Wiize."
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft size={16} className="mr-1" />
            Voltar
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Diretrizes de Envio</h1>
              <p className="text-sm text-muted-foreground">Boas práticas para uso responsável da plataforma</p>
            </div>
          </div>

          <p className="text-muted-foreground mt-4 mb-8 leading-relaxed">
            A Wiize atua como intermediária tecnológica e não define as regras do WhatsApp. 
            No entanto, orientamos nossos usuários sobre as melhores práticas para proteger seus números 
            e garantir uma experiência positiva tanto para você quanto para seus leads.
          </p>

          {/* Do */}
          <div className="glass rounded-2xl p-6 mb-6 border border-primary/20">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <CheckCircle2 size={20} className="text-primary" />
              O que fazer
            </h2>
            <ul className="space-y-2.5">
              {doItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Don't */}
          <div className="glass rounded-2xl p-6 mb-6 border border-destructive/20">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <XCircle size={20} className="text-destructive" />
              O que evitar
            </h2>
            <ul className="space-y-2.5">
              {dontItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <XCircle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Consequences */}
          <div className="glass rounded-2xl p-6 mb-8 border border-amber-500/20">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-amber-500" />
              Possíveis consequências
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              O descumprimento das diretrizes do WhatsApp pode resultar em:
            </p>
            <ul className="space-y-2.5">
              {consequences.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="text-center space-y-2 pb-8">
            <p className="text-xs text-muted-foreground/70 italic max-w-2xl mx-auto">
              Estas orientações são de caráter informativo e educativo. As regras oficiais são definidas 
              exclusivamente pelo WhatsApp/Meta. A Wiize não se responsabiliza por bloqueios ou restrições 
              aplicadas pela plataforma, pois essas decisões são exclusivas do WhatsApp.
            </p>
            <p className="text-xs text-muted-foreground/50">
              Última atualização: Março de 2026
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SendingGuidelines;
