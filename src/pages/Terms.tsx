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
        description="Termos de Uso da plataforma Wiize: prospecção B2B, IA, CRM, campanhas Meta e integrações. Regras, responsabilidades e conformidade legal."
        keywords="termos de uso, termos de serviço, wiize, B2B, LGPD, whatsapp business, meta"
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
              Última atualização: {new Date().toLocaleDateString("pt-BR")}
            </p>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">1. Aceitação</h2>
              <p>
                Ao criar uma conta, acessar ou usar a plataforma <strong>Wiize</strong>, o cliente concorda
                integralmente com estes Termos de Uso e com a{" "}
                <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
                Caso não concorde, o uso deve ser descontinuado imediatamente.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">2. Natureza do serviço (B2B)</h2>
              <p>
                A Wiize é uma plataforma <strong>estritamente B2B</strong> destinada a pessoas jurídicas
                para: prospecção de oportunidades comerciais, gestão de leads (CRM), campanhas e
                atendimento via WhatsApp (API Oficial da Meta), fluxos
                automatizados, agentes de IA, integrações com Google (Sheets, Calendar, Gmail, Drive),
                relatórios e APIs (Integration Layer).
              </p>
              <p>
                É vedado o uso da plataforma para finalidades pessoais, de consumo (B2C) ou para tratar
                dados de titulares fora de contexto profissional/comercial legítimo.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">3. Cadastro, conta e segurança</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>O cliente deve ser maior de 18 anos e ter poderes para representar a pessoa jurídica contratante.</li>
                <li>As informações de cadastro devem ser verdadeiras, completas e atualizadas.</li>
                <li>Credenciais são pessoais e intransferíveis. O cliente é responsável por todas as ações realizadas em sua conta.</li>
                <li>Suspeitas de acesso não autorizado devem ser reportadas imediatamente pelos canais oficiais.</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">4. Uso aceitável</h2>
              <p>O cliente concorda em <strong>não</strong>:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Enviar spam, mensagens não solicitadas em massa ou conteúdo enganoso.</li>
                <li>Violar a LGPD, direitos de terceiros ou legislação aplicável.</li>
                <li>Prospectar, contatar ou tratar dados de consumidores pessoas físicas fora de contexto B2B legítimo.</li>
                <li>Utilizar a plataforma para fins ilícitos, discriminatórios, difamatórios, de assédio, fraude ou golpe.</li>
                <li>Compartilhar acessos, revender o serviço, executar engenharia reversa ou tentar burlar limites técnicos, cotas ou controles de segurança.</li>
                <li>Enviar conteúdo relacionado a itens proibidos pelas políticas do WhatsApp/Meta.</li>
                <li>Automatizar cadastros, criar múltiplas contas para contornar limites ou explorar o período de avaliação.</li>
              </ul>
              <p>
                A Wiize pode suspender ou encerrar contas envolvidas em uso indevido, sem prejuízo das
                medidas legais cabíveis.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">5. Responsabilidades sobre dados de leads</h2>
              <p>
                Nos módulos de prospecção, CRM, campanhas e fluxos, o <strong>cliente é o controlador</strong>
                dos dados dos leads. Cabe ao cliente:
              </p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Definir a finalidade e possuir base legal adequada (ex.: legítimo interesse B2B).</li>
                <li>Fornecer canais de opt-out e atender às solicitações dos titulares.</li>
                <li>Respeitar as políticas do WhatsApp/Meta, Google e demais canais utilizados.</li>
                <li>Garantir que dados importados foram obtidos de forma lícita.</li>
              </ul>
              <p>
                A Wiize atua como <strong>operadora</strong> desses dados, seguindo instruções do cliente,
                nos termos da LGPD.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">6. Inteligência Artificial (score, agentes e conteúdos)</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>A plataforma usa modelos de IA para analisar sinais de leads, calcular <strong>score de oportunidade</strong>, sugerir estágio no CRM, gerar mensagens e operar <strong>agentes conversacionais</strong>.</li>
                <li>Os resultados da IA são <strong>estimativas e recomendações</strong>. Não constituem garantia de conversão, receita ou aderência regulatória do conteúdo gerado.</li>
                <li>O cliente é responsável por revisar o conteúdo gerado pela IA antes de utilizá-lo em comunicações e por assegurar que as mensagens respeitam a lei e os termos das plataformas utilizadas.</li>
                <li>Existem limites diários por plano para geração de fluxos, prospecção e outras operações que consomem IA.</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">7. WhatsApp — API Oficial (Meta)</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>
                  A Wiize atua como <strong>intermediário tecnológico</strong>. A conta WhatsApp Business
                  (WABA) pertence ao cliente, que a conecta via <em>Embedded Signup</em> autorizando a Wiize
                  a operar mensagens e configurações no escopo autorizado.
                </li>
                <li>O cliente é o único responsável pelo conteúdo enviado, pela conformidade com a Política Comercial e as Políticas de Uso do WhatsApp/Meta e pelas leis aplicáveis (inclusive LGPD).</li>
                <li>Custos de mensagens cobrados pela Meta são faturados diretamente ao cliente pela própria Meta.</li>
                <li>A Wiize <strong>não se responsabiliza</strong> por suspensões, restrições, bloqueios ou encerramentos de contas WABA ou números realizados pela Meta, seja por violação de políticas, denúncias de spam ou outro motivo.</li>
                <li>Tokens e credenciais são armazenados criptografados e podem ser revogados pelo cliente a qualquer momento.</li>
              </ul>
              <p>
                Ao conectar sua conta WhatsApp Business, o cliente confirma ter lido e concordado com os{" "}
                <a href="https://www.whatsapp.com/legal/business-terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Termos do WhatsApp Business</a> e a{" "}
                <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Política Comercial do WhatsApp</a>.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">8. Integrações Google</h2>
              <p>
                Ao conectar contas Google (Sheets, Calendar, Gmail, Drive), o cliente autoriza a Wiize a
                operar exclusivamente dentro dos escopos concedidos e das funcionalidades ativadas. Tokens
                OAuth podem ser revogados a qualquer momento nas configurações da plataforma ou na conta
                Google do cliente.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">9. Integration Layer e uso de API</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>O acesso programático à Wiize (Integration Layer, APIs privadas) requer credenciais próprias emitidas para o cliente e uso de <strong>assinatura HMAC</strong>, <em>nonce</em> e controle de <em>timestamp</em>.</li>
                <li>É vedado compartilhar credenciais, expô-las em código público ou repassá-las a terceiros sem autorização.</li>
                <li>Aplicam-se limites de taxa (rate limiting) e proteções antiabuso. O uso excessivo, malicioso ou automatizado fora do escopo contratado pode acarretar bloqueio imediato do <em>client</em> e do IP de origem.</li>
                <li>O cliente é responsável por qualquer aplicação (ex.: assistentes de IA próprios) que integrar à API da Wiize e pelos dados que trafegar por ela.</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">10. Planos, cobrança, teste gratuito e cancelamento</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Planos são cobrados de forma recorrente (mensal ou anual) por gateways integrados (Stripe e Asaas), no cartão ou PIX conforme a modalidade.</li>
                <li>O cliente pode cancelar a assinatura a qualquer momento pelo portal de assinatura; o acesso permanece disponível até o fim do ciclo já pago.</li>
                <li>O período de <strong>teste gratuito</strong> possui regras específicas informadas no momento da contratação, sujeitas a limites técnicos e comerciais para evitar abuso.</li>
                <li>Alterações de preço e reajustes seguem a política vigente, com aviso prévio. Preços contratados podem ser mantidos para clientes elegíveis (<em>grandfathering</em>) conforme regras específicas.</li>
                <li>Impostos, taxas de gateway ou custos externos (ex.: mensagens cobradas pela Meta) não estão inclusos e são de responsabilidade do cliente.</li>
              </ul>
              <p>
                Para reembolsos, consulte a{" "}
                <Link to="/refund-policy" className="text-primary hover:underline">Política de Reembolso</Link>.
                O uso da plataforma gera custos operacionais imediatos e não recuperáveis; reembolsos
                observam as regras dessa política.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">11. Propriedade intelectual</h2>
              <p>
                Software, marca, identidade visual, textos, documentação e demais elementos da plataforma
                são de propriedade da Wiize e/ou de seus licenciadores. É concedida ao cliente uma
                licença limitada, não exclusiva, intransferível e revogável para uso do serviço conforme
                estes Termos. Conteúdos gerados pelo cliente permanecem de sua titularidade.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">12. Disponibilidade e alterações do serviço</h2>
              <p>
                A Wiize busca alta disponibilidade, mas o serviço é fornecido "no estado em que se
                encontra". Podem ocorrer indisponibilidades por manutenção, incidentes ou falhas de
                terceiros (Meta, Google, gateways, provedores de IA). Funcionalidades podem ser
                adicionadas, alteradas ou descontinuadas a qualquer tempo, mediante aviso razoável quando
                a alteração for material.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">13. Limitação de responsabilidade</h2>
              <p>
                Na máxima extensão permitida em lei, a Wiize não responde por danos indiretos,
                incidentais, lucros cessantes, perda de oportunidade, perda de dados de terceiros ou
                consequenciais decorrentes do uso ou impossibilidade de uso do serviço, inclusive
                relacionados a: dados obtidos de fontes públicas que possam conter imprecisões; bloqueios
                do WhatsApp/Meta; conteúdo gerado por IA; falhas de terceiros; violação de políticas ou
                leis pelo próprio cliente.
              </p>
              <p>
                A responsabilidade total agregada da Wiize por qualquer reclamação relacionada ao serviço
                limita-se ao valor efetivamente pago pelo cliente nos 12 (doze) meses anteriores ao evento
                que originou a reclamação.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">14. Suspensão e encerramento</h2>
              <p>
                A Wiize pode suspender ou encerrar o acesso, no todo ou em parte, em caso de: violação
                destes Termos, inadimplência, risco de segurança, uso abusivo, ordem legal ou
                descontinuação do serviço. O cliente pode encerrar sua conta a qualquer momento pelos
                canais oficiais.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">15. Alterações destes Termos</h2>
              <p>
                Estes Termos podem ser atualizados periodicamente. A versão vigente é a publicada nesta
                página. Alterações materiais serão comunicadas pela plataforma ou por e-mail. O uso
                continuado após a atualização representa aceite da nova versão.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">16. Lei aplicável e foro</h2>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
                da comarca da sede da Wiize para dirimir controvérsias, com renúncia a qualquer outro,
                por mais privilegiado que seja.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">17. Contato</h2>
              <p>
                Dúvidas sobre estes Termos ou sobre privacidade e LGPD:{" "}
                <a href="mailto:wiize.app@gmail.com" className="text-primary hover:underline">wiize.app@gmail.com</a>{" "}
                ou{" "}
                <Link to="/contato" className="text-primary hover:underline">página de contato</Link>.
              </p>
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default Terms;
