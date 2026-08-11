import { ArrowLeft, Shield, Lock, Eye, MessageSquare, AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SecurityFAQ = () => {
  const navigate = useNavigate();

  const faqCategories = [
    {
      title: "Segurança de Dados",
      icon: Shield,
      questions: [
        {
          question: "Como meus dados são protegidos no Wiize?",
          answer: "Utilizamos criptografia de ponta a ponta, controle de acesso rigoroso e monitoramento contínuo. Todos os dados sensíveis são criptografados em repouso e em trânsito usando protocolos de segurança avançados (TLS 1.3). Nossos servidores são hospedados em infraestrutura segura com certificações de segurança reconhecidas internacionalmente."
        },
        {
          question: "Vocês vendem meus dados para terceiros?",
          answer: "Não. O Wiize nunca vende, aluga ou compartilha seus dados pessoais com terceiros para fins de marketing. Compartilhamos dados apenas com processadores essenciais para o funcionamento do serviço (como processadores de pagamento) e quando exigido por lei."
        },
        {
          question: "Onde meus dados são armazenados?",
          answer: "Seus dados são armazenados em servidores seguros com redundância geográfica. Utilizamos provedores de infraestrutura de classe mundial que seguem as melhores práticas de segurança e possuem certificações como ISO 27001 e SOC 2."
        },
        {
          question: "Por quanto tempo meus dados são mantidos?",
          answer: "Mantemos seus dados enquanto sua conta estiver ativa e pelo tempo necessário para cumprir obrigações legais. Após o encerramento da conta, os dados são excluídos em até 90 dias, exceto quando a lei exigir retenção por período maior."
        }
      ]
    },
    {
      title: "Privacidade",
      icon: Eye,
      questions: [
        {
          question: "Quais são meus direitos sobre meus dados (LGPD)?",
          answer: "De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a: acessar seus dados pessoais, corrigir dados incompletos ou desatualizados, solicitar a exclusão dos seus dados, revogar consentimento a qualquer momento, solicitar a portabilidade dos dados para outro serviço, e saber com quem seus dados são compartilhados."
        },
        {
          question: "Como posso solicitar a exclusão dos meus dados?",
          answer: "Você pode solicitar a exclusão dos seus dados através da página de contato ou diretamente nas configurações da sua conta. Processamos solicitações de exclusão em até 15 dias úteis, conforme exigido pela LGPD."
        },
        {
          question: "Vocês usam cookies? Quais tipos?",
          answer: "Sim, utilizamos cookies essenciais para o funcionamento da plataforma (autenticação, preferências) e cookies analíticos para melhorar a experiência do usuário. Você pode gerenciar suas preferências de cookies nas configurações do seu navegador."
        },
        {
          question: "Minha atividade na plataforma é monitorada?",
          answer: "Coletamos dados de uso agregados e anonimizados para melhorar nossos serviços. Não monitoramos o conteúdo das suas mensagens ou comunicações. Os logs de atividade são usados apenas para segurança, suporte técnico e melhoria da plataforma."
        }
      ]
    },
    {
      title: "WhatsApp e Comunicações",
      icon: MessageSquare,
      questions: [
        {
          question: "As mensagens enviadas pelo Wiize são criptografadas?",
          answer: "Sim. Utilizamos a API oficial do WhatsApp Business, que oferece criptografia de ponta a ponta em todas as mensagens. Isso significa que apenas você e o destinatário têm acesso ao conteúdo das mensagens. Nem o Wiize nem o WhatsApp podem ler o conteúdo criptografado."
        },
        {
          question: "O Wiize tem acesso ao conteúdo das minhas mensagens?",
          answer: "Não temos acesso ao conteúdo criptografado das suas conversas. Os modelos de mensagem que você cria ficam armazenados de forma segura, mas as mensagens trocadas entre você e seus contatos são protegidas pela criptografia de ponta a ponta do WhatsApp."
        },
        {
          question: "Como funciona a segurança da conexão do WhatsApp?",
          answer: "A conexão com o WhatsApp é feita de forma segura através de autenticação por QR Code. Suas credenciais de sessão são armazenadas de forma criptografada e não compartilhamos esses dados com terceiros. Você pode desconectar a qualquer momento através das configurações."
        },
        {
          question: "Meus contatos ficam expostos?",
          answer: "Seus contatos e leads são armazenados de forma segura e acessíveis apenas para você. Implementamos políticas de segurança em nível de linha (RLS) que garantem que cada usuário só pode acessar seus próprios dados."
        }
      ]
    },
    {
      title: "Segurança nos Envios via WhatsApp",
      icon: AlertTriangle,
      questions: [
        {
          question: "O Wiize opera com a API Oficial da Meta?",
          answer: "Sim. O Wiize opera 100% via API Oficial da Meta (WhatsApp Cloud API), com templates aprovados e total conformidade com as políticas do WhatsApp Business. Isso garante criptografia de ponta a ponta, alta entregabilidade e segurança máxima nos envios."
        },
        {
          question: "Existe risco de bloqueio de número na API Oficial?",
          answer: "Como operamos via API Oficial da Meta, o risco de bloqueio arbitrário é mínimo. Ainda assim, o WhatsApp pode aplicar restrições em casos de violação das políticas oficiais (spam, conteúdo proibido, denúncias em massa). Seguir as boas práticas e nossas Diretrizes de Envio mantém sua conta saudável."
        },
        {
          question: "O que acontece se minha conta Meta Business for restringida?",
          answer: "Restrições e limites são decisões exclusivas da Meta. Se sua conta for restringida, você pode solicitar revisão diretamente pelo Meta Business Suite. O Wiize não se responsabiliza por decisões da Meta, mas nossa equipe pode orientá-lo sobre boas práticas para manter a conta em conformidade."
        },
        {
          question: "Quais práticas devo evitar para manter minha conta saudável?",
          answer: "Evite: enviar mensagens para contatos que não conhecem você, usar templates não aprovados, ignorar solicitações de parada (opt-out), enviar conteúdo proibido (apostas, adulto, esquemas financeiros) e volumes muito acima do tier atual da sua conta Meta. Prefira sempre uma abordagem personalizada e respeitosa."
        }
      ]
    },
    {
      title: "Pagamentos e Assinatura",
      icon: Lock,
      questions: [
        {
          question: "Meus dados de pagamento são seguros?",
          answer: "Sim. Não armazenamos dados de cartão de crédito em nossos servidores. Todos os pagamentos são processados de forma segura pelo Stripe, uma das plataformas de pagamento mais seguras do mundo, com certificação PCI DSS Level 1."
        },
        {
          question: "Posso cancelar minha assinatura a qualquer momento?",
          answer: "Sim. Você pode cancelar sua assinatura a qualquer momento através do portal de gerenciamento. O acesso continua até o final do período já pago. Não há taxas de cancelamento."
        },
        {
          question: "Como funciona a política de reembolso?",
          answer: "Nossa política de reembolso está detalhada na página específica. Em resumo, reembolsos são avaliados caso a caso, considerando o uso da plataforma e possíveis falhas técnicas. Recomendamos ler nossa Política de Reembolso completa para mais detalhes."
        }
      ]
    }
  ];

  return (
    <>
      <SEO 
        title="FAQ de Segurança e Privacidade"
        description="Perguntas frequentes sobre segurança de dados, privacidade, uso do WhatsApp e proteção das suas informações no Wiize."
        keywords="FAQ, segurança, privacidade, LGPD, proteção de dados, WhatsApp, criptografia, wiize"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
              >
                <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline">Voltar</span>
              </Button>
              
              <Logo size="md" />
              
              <div className="w-16 sm:w-20" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[18px] bg-primary/10 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              FAQ de Segurança e Privacidade
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Encontre respostas para as perguntas mais frequentes sobre como protegemos seus dados, 
              sua privacidade e as melhores práticas de uso da plataforma.
            </p>
          </div>

          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => (
              <section key={categoryIndex} className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <category.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                    {category.title}
                  </h2>
                </div>
                
                <Accordion type="single" collapsible className="space-y-2">
                  {category.questions.map((faq, faqIndex) => (
                    <AccordionItem 
                      key={faqIndex} 
                      value={`${categoryIndex}-${faqIndex}`}
                      className="border border-border/50 rounded-lg px-4 bg-card/50"
                    >
                      <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm sm:text-base pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>

          <div className="mt-12 p-6 bg-card/50 border border-border/50 rounded-xl text-center">
            <h3 className="text-lg font-semibold mb-2">Ainda tem dúvidas?</h3>
            <p className="text-muted-foreground mb-4">
              Nossa equipe está pronta para ajudar com qualquer questão sobre segurança e privacidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/contato">Fale Conosco</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/privacy">Política de Privacidade</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/terms">Termos de Uso</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default SecurityFAQ;
