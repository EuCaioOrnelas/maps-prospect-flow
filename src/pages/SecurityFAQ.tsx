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
          answer: "Usamos conexões protegidas por TLS, isolamento dos dados entre empresas, controles de acesso, proteção de credenciais e registros de segurança. Nenhum sistema é infalível, por isso também mantemos processos de prevenção, monitoramento e resposta a incidentes."
        },
        {
          question: "Vocês vendem meus dados para terceiros?",
          answer: "Não. O Wiize nunca vende, aluga ou compartilha seus dados pessoais com terceiros para fins de marketing. Compartilhamos dados apenas com processadores essenciais para o funcionamento do serviço (como processadores de pagamento) e quando exigido por lei."
        },
        {
          question: "Onde meus dados são armazenados?",
          answer: "Os dados são mantidos em infraestrutura de nuvem gerenciada e podem ser processados por fornecedores necessários ao serviço. Aplicamos controles técnicos e contratuais e explicamos as categorias de subprocessadores na Política de Privacidade."
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
          answer: "Você pode solicitar a exclusão pela página de contato ou usar a opção disponível nas configurações da conta. Alguns registros podem ser preservados pelo prazo necessário ao cumprimento de obrigações legais, segurança e prevenção a fraude."
        },
        {
          question: "Vocês usam cookies? Quais tipos?",
          answer: "Sim. Cookies essenciais mantêm segurança, sessão e funcionamento. Cookies funcionais, analíticos e de marketing são opcionais e podem ser aceitos, recusados ou alterados pelo aviso e pelo link “Preferências de cookies” no rodapé."
        },
        {
          question: "Minha atividade na plataforma é monitorada?",
          answer: "Registramos eventos de uso, auditoria e segurança necessários para operar, proteger, prestar suporte e melhorar a plataforma. Mensagens e arquivos podem ser processados para entregar chat, CRM, SDR, automações e suporte conforme as instruções do cliente."
        }
      ]
    },
    {
      title: "WhatsApp e Comunicações",
      icon: MessageSquare,
      questions: [
        {
          question: "As mensagens enviadas pelo Wiize são criptografadas?",
          answer: "As comunicações entre a Wiize e os serviços conectados usam canais protegidos. Para prestar chat, CRM, SDR e automações, a plataforma precisa processar e armazenar o conteúdo autorizado pelo cliente. As proteções específicas também dependem da modalidade do número e das regras do WhatsApp."
        },
        {
          question: "O Wiize tem acesso ao conteúdo das minhas mensagens?",
          answer: "A Wiize processa o conteúdo necessário para exibir o histórico, executar automações, operar o SDR, gerar resumos e permitir atendimento pela equipe. O acesso é limitado ao contexto da empresa e às permissões dos usuários autorizados."
        },
        {
          question: "Como funciona a segurança da conexão do WhatsApp?",
          answer: "O Número de Marketing é conectado pelo fluxo oficial da Meta e usa permissões autorizadas pelo cliente. O Número de Suporte mantém uma sessão destinada a conversas individuais e pode exigir reconexão. Credenciais e sessões recebem controles de acesso e podem ser revogadas."
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
          answer: "Sim. O Número de Marketing usa a API Oficial da Meta para campanhas, templates aprovados e reabertura de conversas. A Wiize também oferece um Número de Suporte para atendimento individual, chat, SDR e automações de suporte; ele não deve ser usado para campanhas."
        },
        {
          question: "Existe risco de bloqueio de número na API Oficial?",
          answer: "Sim. A Meta pode aplicar limites, reduzir a qualidade ou restringir contas e números conforme suas políticas, denúncias e padrões de uso. A conexão oficial reduz riscos operacionais, mas não elimina decisões da Meta nem garante entregabilidade."
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
          answer: "Os pagamentos por cartão ou PIX são processados por provedores de pagamento integrados. A Wiize não armazena o número completo do cartão nem o código de segurança; recebe apenas informações necessárias sobre a cobrança, o status e a assinatura."
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
