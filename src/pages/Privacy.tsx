import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Política de Privacidade"
        description="Saiba como o Wiize coleta, usa e protege seus dados pessoais. Nossa política de privacidade está em conformidade com a LGPD."
        keywords="política de privacidade, LGPD, proteção de dados, privacidade, wiize"
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
            Política de Privacidade
          </h1>

          <div className="prose prose-invert max-w-none space-y-4 sm:space-y-6 text-muted-foreground text-sm sm:text-base">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">1. Introdução</h2>
              <p>
                Esta Política de Privacidade descreve como o Wiize coleta, usa, armazena e protege suas informações 
                pessoais. Ao usar nosso serviço, você concorda com as práticas descritas nesta política.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">2. Informações que Coletamos</h2>
              <p>Coletamos os seguintes tipos de informações:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li><strong>Dados de cadastro:</strong> nome, email, senha (criptografada)</li>
                <li><strong>Dados de uso:</strong> histórico de buscas, leads exportados, páginas visitadas</li>
                <li><strong>Dados de pagamento:</strong> processados de forma segura pelo Stripe</li>
                <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, dispositivo</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">3. Como Usamos suas Informações</h2>
              <p>Utilizamos suas informações para:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Processar pagamentos e gerenciar assinaturas</li>
                <li>Enviar comunicações sobre sua conta</li>
                <li>Detectar e prevenir fraudes</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">4. Compartilhamento de Dados</h2>
              <p>
                Não vendemos suas informações pessoais. Podemos compartilhar dados apenas com:
              </p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Processadores de pagamento (Stripe)</li>
                <li>Serviços de infraestrutura (hospedagem)</li>
                <li>Autoridades legais quando exigido por lei</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">5. Segurança dos Dados</h2>
              <p>
                Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo 
                criptografia, controle de acesso e monitoramento contínuo.
              </p>
              <p>
                Para as funcionalidades de integração com o WhatsApp, utilizamos a API oficial do WhatsApp Business, 
                que oferece criptografia de ponta a ponta em todas as mensagens. Isso significa que suas comunicações 
                são protegidas por protocolos de segurança avançados, garantindo que apenas você e o destinatário 
                tenham acesso ao conteúdo das mensagens. O Wiize não tem acesso ao conteúdo criptografado das 
                suas conversas.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">6. Seus Direitos (LGPD)</h2>
              <p>De acordo com a Lei Geral de Proteção de Dados, você tem direito a:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar a exclusão de seus dados</li>
                <li>Revogar consentimento a qualquer momento</li>
                <li>Solicitar a portabilidade dos dados</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">7. Cookies</h2>
              <p>
                Utilizamos cookies essenciais para o funcionamento da plataforma e cookies analíticos para 
                melhorar a experiência do usuário. Você pode gerenciar suas preferências de cookies nas 
                configurações do navegador.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">8. Retenção de Dados</h2>
              <p>
                Mantemos seus dados pelo tempo necessário para fornecer nossos serviços e cumprir obrigações 
                legais. Após o encerramento da conta, os dados são excluídos em até 90 dias.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">9. Alterações nesta Política</h2>
              <p>
                Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas 
                através da plataforma.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">10. Contato</h2>
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre nossa política de privacidade,{" "}
                <Link to="/contato" className="text-primary hover:underline">
                  entre em contato conosco
                </Link>.
              </p>
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default Privacy;
