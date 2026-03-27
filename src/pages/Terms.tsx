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
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">8. Uso do WhatsApp e Responsabilidade sobre Bloqueios</h2>
              <p>
                O Wiize oferece funcionalidades de integração com o WhatsApp para facilitar a comunicação comercial. 
                No entanto, é importante ressaltar que:
              </p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>O WhatsApp é uma plataforma de propriedade da Meta Platforms, Inc. e possui suas próprias políticas de uso e termos de serviço.</li>
                <li>Bloqueios, suspensões ou restrições de números de telefone são decisões exclusivas do WhatsApp, baseadas em seus algoritmos e políticas internas de combate a spam e uso indevido.</li>
                <li>O Wiize <strong>não possui controle</strong> sobre as ações do WhatsApp e <strong>não se responsabiliza</strong> por bloqueios ou banimentos de números, independentemente de terem sido usados em nossa plataforma.</li>
                <li>Bloqueios geralmente ocorrem devido ao envio de mensagens em grande volume, contatos que denunciam como spam, ou uso que o WhatsApp identifica como não orgânico.</li>
                <li>Oferecemos recursos de aquecimento de números para ajudar a reduzir o risco de bloqueios, porém estes não garantem a ausência de restrições por parte do WhatsApp.</li>
              </ul>
              <p>
                Ao utilizar as funcionalidades de WhatsApp do Wiize, você declara estar ciente destes riscos e assume 
                total responsabilidade pelo uso de seus números de telefone e pela observância dos termos de uso do WhatsApp.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">9. Integração com a API Oficial do WhatsApp (Meta Business Platform)</h2>
              <p>
                O Wiize oferece a possibilidade de conexão com a API Oficial do WhatsApp Business, fornecida pela Meta Platforms, Inc., 
                por meio do recurso de Embedded Signup. Ao utilizar esta funcionalidade, você declara estar ciente e de acordo com o seguinte:
              </p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>
                  <strong>O Wiize atua exclusivamente como intermediário tecnológico.</strong> A plataforma facilita a conexão entre o 
                  usuário e a Meta, mas <strong>não é proprietária, co-responsável nem operadora</strong> da conta WhatsApp Business (WABA) do usuário.
                </li>
                <li>
                  <strong>A conta WABA pertence integralmente ao usuário.</strong> Ao conectar sua conta via Embedded Signup, 
                  você autoriza o Wiize a acessar e gerenciar mensagens e configurações em seu nome, dentro do escopo das permissões concedidas.
                </li>
                <li>
                  <strong>O usuário é o único responsável</strong> pelo conteúdo das mensagens enviadas, pela conformidade com as 
                  Políticas de Uso do WhatsApp Business, pela Política Comercial da Meta e por todas as leis aplicáveis, incluindo a LGPD.
                </li>
                <li>
                  <strong>Custos de mensagens são de responsabilidade do usuário.</strong> As taxas cobradas pela Meta por mensagens 
                  enviadas através da API Oficial são faturadas diretamente ao usuário pela Meta, sem qualquer intermediação financeira do Wiize.
                </li>
                <li>
                  <strong>O Wiize não se responsabiliza</strong> por suspensões, restrições, bloqueios ou encerramento de contas WABA 
                  realizados pela Meta, seja por violação de políticas, denúncias de spam ou qualquer outro motivo.
                </li>
                <li>
                  <strong>Tokens de acesso e credenciais</strong> são armazenados de forma criptografada e utilizados exclusivamente 
                  para a operação dos serviços contratados. O usuário pode revogar o acesso a qualquer momento.
                </li>
                <li>
                  <strong>O usuário declara possuir</strong> a verificação de empresa (Business Verification) exigida pela Meta e 
                  compromete-se a manter seus dados cadastrais atualizados junto à plataforma Meta Business.
                </li>
              </ul>
              <p>
                Ao conectar sua conta WhatsApp Business ao Wiize, você confirma ter lido e concordado com os{" "}
                <a href="https://www.whatsapp.com/legal/business-terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Termos de Serviço do WhatsApp Business
                </a>{" "}e a{" "}
                <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Política Comercial do WhatsApp
                </a>.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">9. Modificações dos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas 
                serão comunicadas através da plataforma ou por email.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">10. Lei Aplicável</h2>
              <p>
                Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será 
                resolvida nos tribunais competentes do Brasil.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">11. Contato</h2>
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
