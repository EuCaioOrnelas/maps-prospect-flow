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
        description="Saiba como a Wiize coleta, usa, compartilha e protege dados pessoais de clientes e de leads B2B. Em conformidade com a LGPD (Lei nº 13.709/2018)."
        keywords="política de privacidade, LGPD, proteção de dados, B2B, wiize, dpo, encarregado"
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
              Última atualização: {new Date().toLocaleDateString("pt-BR")}
            </p>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">1. Quem somos e o escopo desta Política</h2>
              <p>
                A <strong>Wiize</strong> é uma plataforma <strong>estritamente B2B</strong> de prospecção,
                relacionamento e gestão comercial voltada a pessoas jurídicas. Esta Política descreve como
                coletamos, tratamos, compartilhamos, armazenamos e protegemos dados pessoais em todas as
                funcionalidades da plataforma, em conformidade com a <strong>Lei Geral de Proteção de Dados
                (Lei nº 13.709/2018 — LGPD)</strong>.
              </p>
              <p>
                A Wiize <strong>não oferece serviços a consumidores pessoas físicas (B2C)</strong>. O uso da
                plataforma pressupõe finalidade comercial legítima e observância pelo cliente das leis
                aplicáveis, das políticas do WhatsApp/Meta e desta Política.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">2. Papéis no tratamento de dados</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>
                  <strong>Controladora</strong> — quanto aos dados dos usuários que contratam a plataforma
                  (cadastro, uso, pagamento, suporte, cookies), a Wiize atua como controladora.
                </li>
                <li>
                  <strong>Operadora</strong> — quanto aos dados de leads B2B, contatos, mensagens e
                  automações criados, importados ou geridos pelo cliente dentro da plataforma (CRM,
                  campanhas Meta, agentes de IA, fluxos), a Wiize atua como operadora,
                  tratando dados em nome e sob instruções do cliente, que é o controlador desses dados.
                </li>
              </ul>
              <p>
                O cliente é responsável por possuir base legal adequada (ex.: legítimo interesse
                comercial B2B, consentimento, execução de contrato) para tratar os dados de leads que
                insere ou coleta por meio da Wiize e por atender solicitações de titulares desses dados.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">3. Dados que coletamos</h2>

              <p><strong>3.1. Dados do cliente (usuário da plataforma):</strong></p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Cadastro: nome, e-mail, senha (armazenada com hash), telefone, CPF/CNPJ, razão social.</li>
                <li>Autenticação: sessões, tokens, provedor social (Google) quando aplicável.</li>
                <li>Cobrança: histórico de assinaturas, faturas, meio de pagamento (o dado do cartão/PIX é processado diretamente pelos gateways, sem retenção do PAN pela Wiize).</li>
                <li>Uso: telemetria da aplicação, cliques, páginas visitadas, funcionalidades acessadas, logs de auditoria e de segurança (rate-limit, tentativas de login).</li>
                <li>Suporte: mensagens, tickets, transcrições de atendimento com o Wian (Suporte Inteligente).</li>
                <li>Dados técnicos: endereço IP, user-agent, geolocalização aproximada por IP, tipo de dispositivo.</li>
              </ul>

              <p><strong>3.2. Dados de leads B2B tratados a pedido do cliente:</strong></p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Dados obtidos de fontes públicas de internet (motores de busca, redes profissionais, sites corporativos) por meio do módulo de prospecção.</li>
                <li>Dados importados pelo cliente (planilhas, CRM externo, integrações).</li>
                <li>Dados coletados via WhatsApp/Meta durante conversas iniciadas pelo cliente ou por seus agentes.</li>
                <li>Enriquecimento e sinais (site, redes sociais, tecnologias detectadas, sinais de intenção) usados pelos módulos de IA e scoring.</li>
                <li>Resultados de análise por IA: score, estágio no CRM, resumos, transcrições e classificações geradas automaticamente.</li>
              </ul>

              <p>
                O foco da coleta é sempre <strong>dados corporativos e profissionais</strong> (empresa, cargo,
                contato comercial). A Wiize não busca ativamente dados sensíveis (art. 5º, II, LGPD).
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">4. Bases legais e finalidades</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li><strong>Execução de contrato</strong> — prestação do serviço, autenticação, cobrança, suporte.</li>
                <li><strong>Cumprimento de obrigação legal/regulatória</strong> — fiscal, tributária, requisições judiciais.</li>
                <li><strong>Legítimo interesse</strong> — segurança, prevenção a fraude e abuso, melhoria dos serviços, prospecção B2B por parte do cliente.</li>
                <li><strong>Consentimento</strong> — comunicações de marketing sobre novidades da Wiize, cookies analíticos, integrações opcionais (ex.: Google Sheets, Calendar, Gmail, Drive).</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">5. Uso de Inteligência Artificial e decisões automatizadas</h2>
              <p>
                A plataforma utiliza modelos de IA para: (i) analisar sinais públicos de leads e calcular
                um <strong>score de oportunidade</strong>; (ii) gerar mensagens de abordagem, resumos e
                classificações no CRM; (iii) operar <strong>agentes conversacionais</strong> em canais como
                WhatsApp; (iv) apoiar o Wian (Suporte Inteligente da Wiize).
              </p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>O score e as classificações da IA são <strong>recomendações</strong>. Decisões comerciais (contatar, contratar, precificar) são do cliente, não automatizadas de forma vinculante.</li>
                <li>Prompts e conteúdos processados pela IA são enviados ao provedor de modelo por meio de gateway seguro; não são usados para treinar modelos de terceiros.</li>
                <li>O cliente pode, a qualquer momento, solicitar revisão humana das decisões automatizadas que impactem seus interesses, nos termos do art. 20 da LGPD.</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">6. WhatsApp — API Oficial da Meta</h2>
              <p>
                A Wiize integra-se ao WhatsApp exclusivamente por meio da <strong>API Oficial WhatsApp Business (Meta Cloud)</strong>,
                usada em chat, campanhas e fluxos. A conta WABA pertence ao cliente. A Wiize processa: ID da WABA,
                nome comercial, número, tokens de acesso (armazenados criptografados), metadados de mensagens (status,
                timestamps, IDs) e dados de contatos (número e nome de perfil informados pela API).
              </p>
              <p>
                O cliente é o único responsável pelo conteúdo enviado, pela obtenção de base legal para
                contatar cada destinatário e pela aderência às políticas do WhatsApp/Meta. A Wiize não
                garante entregabilidade nem se responsabiliza por bloqueios ou suspensões impostos pela Meta.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">7. Integrações Google (Sheets, Calendar, Gmail, Drive)</h2>
              <p>
                Quando o cliente conecta uma conta Google, solicitamos apenas os escopos mínimos
                necessários para as funcionalidades ativadas (ex.: leitura/escrita em planilhas indicadas,
                criação de eventos, envio de mensagens de e-mail iniciadas pelo cliente, upload de arquivos
                em pastas selecionadas). Tokens OAuth são armazenados criptografados, podem ser revogados a
                qualquer momento pelo cliente e não são compartilhados com terceiros.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">8. Compartilhamento de dados e subprocessadores</h2>
              <p>
                A Wiize <strong>não vende</strong> dados pessoais. Compartilhamos dados apenas com prestadores
                (operadores/subprocessadores) contratados para viabilizar o serviço, sob obrigações de
                confidencialidade e segurança compatíveis com a LGPD:
              </p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li><strong>Infraestrutura e banco de dados</strong> — provedor de cloud gerenciada da Wiize.</li>
                <li><strong>Pagamentos</strong> — Stripe (cartão internacional) e Asaas (PIX/cartão nacional).</li>
                <li><strong>E-mail transacional</strong> — Resend, para notificações de conta, cobrança e suporte.</li>
                <li><strong>IA</strong> — gateway de IA da Wiize sobre modelos de linguagem de terceiros, sem uso dos dados para treinamento externo.</li>
                <li><strong>Enriquecimento e busca</strong> — provedores de SERP e sinais públicos.</li>
                <li><strong>Mensageria</strong> — Meta Platforms, Inc. (WhatsApp Business API).</li>
                <li><strong>Google</strong> — quando integrações Google forem ativadas pelo cliente.</li>
                <li><strong>Autoridades competentes</strong> — mediante ordem judicial ou requisição legal.</li>
              </ul>
              <p>
                Parte dos subprocessadores está sediada fora do Brasil. Nesses casos, a transferência
                internacional observa as hipóteses do art. 33 da LGPD, com garantias contratuais adequadas.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">9. Segurança da informação</h2>
              <p>Aplicamos medidas técnicas e organizacionais como:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Criptografia em trânsito (TLS) e em repouso para segredos e tokens sensíveis.</li>
                <li>Row Level Security no banco de dados, isolando dados por conta de cliente.</li>
                <li>Controles de acesso baseados em papéis, com trilhas de auditoria administrativa.</li>
                <li>Rate limiting, proteção contra abuso, assinatura HMAC e nonce nas integrações públicas (Integration Layer).</li>
                <li>Monitoramento contínuo, backups e revisões periódicas de segurança.</li>
              </ul>
              <p>
                Nenhuma medida de segurança é infalível. Em caso de incidente relevante, notificaremos os
                clientes e a ANPD conforme exigido pela LGPD.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">10. Retenção e eliminação</h2>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li><strong>Dados de conta ativa</strong> — mantidos enquanto durar a relação contratual.</li>
                <li><strong>Após encerramento</strong> — dados operacionais são eliminados ou anonimizados em até 90 dias, salvo obrigação legal de guarda (ex.: fiscal por até 5 anos).</li>
                <li><strong>Tokens de terceiros</strong> (WhatsApp/Meta, Google) — eliminados em até 30 dias após revogação/desconexão.</li>
                <li><strong>Logs de segurança</strong> — mantidos por período proporcional à finalidade de prevenção a fraude e auditoria.</li>
              </ul>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">11. Direitos dos titulares (LGPD)</h2>
              <p>O titular de dados pessoais pode, a qualquer momento, solicitar:</p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Confirmação da existência e acesso aos seus dados.</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
                <li>Portabilidade a outro fornecedor.</li>
                <li>Informação sobre compartilhamentos e subprocessadores.</li>
                <li>Revogação de consentimento e revisão de decisões automatizadas.</li>
              </ul>
              <p>
                Para dados de leads B2B tratados por meio da plataforma, o cliente (controlador) é o
                interlocutor primário do titular; a Wiize prestará suporte razoável ao cliente para
                atender à solicitação, na qualidade de operadora.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">12. Cookies e tecnologias similares</h2>
              <p>
                Utilizamos cookies <strong>essenciais</strong> (sessão, autenticação, segurança) e cookies
                <strong> analíticos</strong> para entender o uso da plataforma e da página de vendas. O
                usuário pode gerenciar preferências no navegador; a desativação de cookies essenciais pode
                comprometer o funcionamento do serviço.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">13. Marketing e comunicações</h2>
              <p>
                Utilizamos e-mail (Resend) para comunicações transacionais (conta, cobrança, suporte,
                alertas de segurança) e, com base legal adequada, para novidades sobre produto e conteúdo
                educativo. O usuário pode optar por não receber comunicações de marketing a qualquer
                momento, sem impacto nas comunicações transacionais indispensáveis.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">14. Crianças e adolescentes</h2>
              <p>
                A plataforma é B2B e destinada a maiores de 18 anos com capacidade civil para representar
                a pessoa jurídica contratante. Não coletamos deliberadamente dados de crianças ou
                adolescentes.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">15. Alterações desta Política</h2>
              <p>
                Podemos atualizar esta Política para refletir mudanças legais, operacionais ou de
                produto. A versão vigente é sempre a publicada nesta página, com data de atualização no
                topo. Alterações materiais serão comunicadas pela plataforma ou por e-mail.
              </p>
            </section>

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">16. Encarregado (DPO) e contato</h2>
              <p>
                Para exercer direitos, obter informações adicionais ou reportar incidentes de segurança,
                fale com o Encarregado pelo Tratamento de Dados Pessoais (DPO) da Wiize:
              </p>
              <ul className="list-disc pl-4 sm:pl-6 space-y-1 sm:space-y-2">
                <li>E-mail: <a href="mailto:wiize.app@gmail.com" className="text-primary hover:underline">wiize.app@gmail.com</a></li>
                <li>Suporte geral: <Link to="/contato" className="text-primary hover:underline">página de contato</Link></li>
              </ul>
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default Privacy;
