import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Termos de Uso"
        description="Leia os Termos de Uso da plataforma Wiize. Saiba como usar nossos serviços de prospecção de leads de forma ética e legal."
        keywords="termos de uso, termos de serviço, regras, wiize"
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
            Termos de Uso
          </h1>

          <div className="prose prose-invert max-w-none space-y-4 sm:space-y-6 text-muted-foreground text-sm sm:text-base">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e usar a plataforma Wiize, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
                Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">2. Descrição do Serviço</h2>
              <p>
                O Wiize é uma plataforma de geração de leads que permite aos usuários buscar e coletar informações 
                de empresas e contatos comerciais disponíveis publicamente na internet para fins de prospecção comercial.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">3. Uso Aceitável</h2>
              <p>Você concorda em usar o serviço apenas para fins legais e de acordo com estes termos. É proibido:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Usar o serviço para enviar spam ou comunicações não solicitadas em massa</li>
                <li>Violar leis de proteção de dados aplicáveis</li>
                <li>Coletar dados para fins ilegais ou antiéticos</li>
                <li>Compartilhar credenciais de acesso com terceiros</li>
                <li>Tentar burlar limitações do sistema ou acessar áreas não autorizadas</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">4. Conta e Segurança</h2>
              <p>
                Você é responsável por manter a confidencialidade de sua conta e senha. Você concorda em notificar 
                imediatamente sobre qualquer uso não autorizado de sua conta.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">5. Pagamentos, Assinaturas e Reembolsos</h2>
              <p>
                Os planos pagos são cobrados mensalmente. Você pode cancelar sua assinatura a qualquer momento através 
                do portal de gerenciamento. Para informações detalhadas sobre reembolsos, consulte nossa{" "}
                <Link to="/refund-policy" className="text-primary hover:underline">
                  Política de Reembolso
                </Link>.
              </p>
              <p>
                Ao utilizar a plataforma, você declara ciência de que o uso gera custos operacionais imediatos e não recuperáveis, 
                e que o reembolso está condicionado ao não uso da plataforma ou a falhas técnicas comprovadas, conforme descrito 
                em nossa Política de Reembolso.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">6. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo, marcas, logos e software da plataforma são de propriedade exclusiva do Wiize. 
                É proibida a reprodução sem autorização prévia.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">7. Limitação de Responsabilidade</h2>
              <p>
                O Wiize não se responsabiliza por danos indiretos, incidentais ou consequentes resultantes do uso 
                ou impossibilidade de uso do serviço. Os dados fornecidos são obtidos de fontes públicas e podem 
                conter imprecisões.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">8. Modificações dos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas 
                serão comunicadas através da plataforma ou por email.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">9. Lei Aplicável</h2>
              <p>
                Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será 
                resolvida nos tribunais competentes do Brasil.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">10. Contato</h2>
              <p>
                Para dúvidas ou sugestões sobre estes termos,{" "}
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

export default Terms;
