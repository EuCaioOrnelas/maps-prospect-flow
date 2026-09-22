import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";

const RefundPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Política de Reembolso"
        description="Conheça nossa Política de Reembolso. Entenda as condições para solicitação de reembolso na plataforma Wiize."
        keywords="política de reembolso, reembolso, cancelamento, wiize"
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
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
            Política de Reembolso
          </h1>

          <div className="prose max-w-none space-y-4 text-sm text-muted-foreground prose-strong:text-foreground sm:space-y-6 sm:text-base">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Última atualização: 22 de setembro de 2026 · Versão 2.0
            </p>

            <p className="text-foreground">
              Nosso compromisso é oferecer uma plataforma robusta, transparente e funcional. Esta Política de Reembolso tem como objetivo alinhar expectativas antes da contratação e evitar interpretações equivocadas sobre o uso do sistema.
            </p>

            <section className="space-y-3 sm:space-y-4 bg-primary/10 p-4 sm:p-6 rounded-lg border border-primary/30">
              <h2 className="text-lg sm:text-xl font-semibold text-primary">Período de Teste Gratuito</h2>
              <p className="text-foreground">
                A Wiize oferece <strong>7 dias de teste gratuito</strong>, nas condições apresentadas no cadastro, para que você possa avaliar as funcionalidades incluídas no plano escolhido antes da primeira cobrança.
              </p>
              <p>
                Durante esse período, você pode avaliar os recursos liberados para o plano selecionado. Se a assinatura não for cancelada antes do encerramento do teste, a cobrança começa no 8º dia.
              </p>
              <p className="font-medium text-foreground">
                Ao optar pela contratação após o período de teste, o usuário declara que já testou e validou a plataforma, compreendendo que o reembolso não será possível, exceto nos casos específicos descritos nesta política.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">1. Uso da plataforma e custos operacionais</h2>
              <p>
                Ao acessar e utilizar a plataforma, mesmo que de forma parcial ou por curto período, o usuário passa a consumir recursos técnicos e operacionais, incluindo, mas não se limitando a:
              </p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>APIs externas (como WhatsApp Business Platform)</li>
                <li>Infraestrutura de servidores</li>
                <li>Processamento e armazenamento em banco de dados</li>
                <li>Mensagens e campanhas enviadas pela API Oficial da Meta</li>
                <li>Prospecção automatizada e assistida por Inteligência Artificial</li>
                <li>Funcionalidades de CRM (gestão de contatos, histórico, tags, funis, etc.)</li>
                <li>Custos de licenciamento, operação e manutenção do sistema</li>
              </ul>
              <p>
                Esses recursos geram custos imediatos e não recuperáveis, independentemente do volume de uso ou dos resultados obtidos.
              </p>
              <p className="font-medium text-foreground">
                Por esse motivo, não é possível conceder reembolso após qualquer uso da plataforma.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">2. Quando o reembolso NÃO é aplicável</h2>
              <p>O reembolso não será aceito nos seguintes casos:</p>
              
              <p className="font-medium text-foreground">Após qualquer tipo de uso da plataforma, incluindo, mas não se limitando a:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                 <li>Mensagens, campanhas ou templates processados pela API Oficial da Meta</li>
                <li>Prospecção manual ou automatizada com uso de IA</li>
                <li>Conexão e ativação de números</li>
                <li>Consumo de APIs externas</li>
                <li>Uso de funcionalidades de CRM</li>
                <li>Criação ou execução de campanhas, fluxos ou automações</li>
              </ul>

              <p className="font-medium text-foreground mt-4">Insatisfação relacionada a:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Bloqueio, limitação ou suspensão de números pelo WhatsApp</li>
                <li>Resultados de prospecção, conversão ou vendas</li>
                <li>Estratégias, copies, abordagens ou segmentações utilizadas</li>
                <li>Uso inadequado da plataforma ou descumprimento das boas práticas recomendadas</li>
                <li>Decisões, políticas ou ações de terceiros (como WhatsApp ou provedores de API), que não estão sob controle da plataforma</li>
              </ul>

              <p className="mt-4 bg-muted/50 p-4 rounded-lg border border-border">
                O WhatsApp e demais serviços integrados possuem políticas próprias e sistemas automatizados de análise, não sendo possível garantir ausência de bloqueios, limitações ou penalidades.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">3. Quando o reembolso PODE ser solicitado</h2>
              <p>O reembolso poderá ser analisado exclusivamente nos seguintes casos:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>O usuário não utilizou a plataforma, sem qualquer consumo de recursos técnicos</li>
                <li>Ocorrência de problemas técnicos comprovados que:
                  <ul className="list-disc pl-4 sm:pl-6 mt-1 space-y-1">
                    <li>Impossibilitem totalmente o uso da plataforma</li>
                    <li>Sejam de responsabilidade direta do sistema</li>
                  </ul>
                </li>
                <li>Falhas críticas persistentes, devidamente reportadas ao suporte, que não tenham sido solucionadas em prazo razoável</li>
              </ul>
              <p className="mt-2 text-foreground">
                Cada solicitação será analisada individualmente, mediante verificação técnica do uso da conta.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">4. Prazo e processo de análise</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Solicitações de reembolso devem ser realizadas dentro do prazo legal aplicável</li>
                <li>O prazo de análise pode levar até 7 dias úteis</li>
                <li>Poderemos solicitar informações adicionais para validação da solicitação</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">5. Transparência e responsabilidade do usuário</h2>
              <p>Ao contratar e utilizar a plataforma, o usuário declara estar ciente de que:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>A ferramenta oferece controle e infraestrutura, não garantia de resultados</li>
                <li>Prospecção via WhatsApp envolve riscos inerentes às políticas de terceiros</li>
                 <li>Campanhas, uso de IA e CRM demandam configuração e estratégia adequadas</li>
                <li>O reembolso está condicionado ao não uso da plataforma ou a falhas técnicas comprovadas</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">6. Suporte e orientação</h2>
              <p>
                Nosso suporte está disponível para orientar usuários antes do uso da plataforma, esclarecendo dúvidas sobre funcionamento, riscos e boas práticas, ajudando a evitar problemas e frustrações futuras.
              </p>
            </section>

            <div className="pt-6 sm:pt-8">
              <Link to="/contato">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Entre em contato
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default RefundPolicy;
