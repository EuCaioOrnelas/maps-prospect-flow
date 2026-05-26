import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Scale, Megaphone, Wallet, Ban } from "lucide-react";

/**
 * Termos & Condições do Programa de Parceiros Wiize.
 * Página pública, linkada a partir do checkbox final do formulário de candidatura
 * (/partners/apply) e da landing /parceiros.
 */
const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
    </div>
    <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const Bullet = ({ children, allowed }: { children: React.ReactNode; allowed?: boolean }) => (
  <li className="flex gap-3 items-start">
    {allowed === true && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
    {allowed === false && <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
    {allowed === undefined && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 mt-2.5 shrink-0" />}
    <span className="text-foreground/90">{children}</span>
  </li>
);

export default function PartnersTerms() {
  const updatedAt = "26 de maio de 2026";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Helmet>
        <title>Termos do Programa de Parceiros — Wiize</title>
        <meta
          name="description"
          content="Regras de divulgação, comissionamento, condutas proibidas e políticas do Programa de Parceiros Wiize."
        />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/parceiros" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar para Wiize Partners
          </Link>
          <span className="text-xs text-muted-foreground">Atualizado em {updatedAt}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4 pb-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Scale className="h-4 w-4" /> Termos & Condições — Programa de Parceiros
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Termos do Programa de Parceiros Wiize
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Estes Termos regulam a relação entre você (Parceiro) e a Wiize. Ao aceitar a candidatura
            ao Programa, você declara que leu, entendeu e concorda integralmente com todas as cláusulas
            abaixo. Leia com atenção — o descumprimento pode levar a desclassificação, retenção de
            comissões e exclusão definitiva do Programa.
          </p>
        </div>

        <Section icon={CheckCircle2} title="1. Sobre o Programa">
          <p>
            O Programa de Parceiros Wiize é um programa de afiliação B2B que remunera parceiros
            aprovados por indicar novos clientes pagantes da plataforma Wiize, mediante o uso de
            links e cupons exclusivos atribuídos pela Wiize.
          </p>
          <p>
            A participação é gratuita, sujeita à aprovação prévia de candidatura e à manutenção das
            obrigações descritas neste documento. A Wiize pode, a seu critério, aceitar ou recusar
            qualquer candidatura, sem necessidade de justificativa.
          </p>
        </Section>

        <Section icon={Megaphone} title="2. Regras de Divulgação">
          <ul className="space-y-2.5">
            <Bullet allowed>
              Divulgar a Wiize de forma honesta, descrevendo benefícios reais, sem promessas de
              resultados garantidos ou ganhos exorbitantes.
            </Bullet>
            <Bullet allowed>
              Identificar-se claramente como Parceiro (afiliado) sempre que recomendar a Wiize em
              materiais públicos (vídeos, posts, e-mails, etc.).
            </Bullet>
            <Bullet allowed>
              Utilizar exclusivamente o link e/ou cupom oficial fornecido pela Wiize. Outros canais
              não rastreados não geram comissão.
            </Bullet>
            <Bullet allowed>
              Respeitar a identidade visual da Wiize (logos, cores, nome). Materiais oficiais estão
              disponíveis na área de Materiais do Parceiro.
            </Bullet>
            <Bullet allowed>
              Cumprir a LGPD e o Marco Civil da Internet em toda comunicação. Listas de e-mail,
              WhatsApp ou SMS exigem opt-in válido.
            </Bullet>
          </ul>
        </Section>

        <Section icon={Ban} title="3. Condutas Proibidas">
          <p className="font-medium text-foreground">
            As práticas abaixo são proibidas e podem gerar bloqueio imediato, perda de comissões
            acumuladas e medidas legais cabíveis:
          </p>
          <ul className="space-y-2.5 mt-2">
            <Bullet allowed={false}>
              <strong>Auto-indicação (self-referral):</strong> comprar a Wiize com seu próprio link,
              cupom ou utilizando dados de familiares, sócios, funcionários, empresas relacionadas
              ou contas de terceiros sob seu controle.
            </Bullet>
            <Bullet allowed={false}>
              <strong>Reembolsar comissão ao cliente (cashback não autorizado):</strong> oferecer
              dinheiro, PIX, bônus financeiro ou qualquer vantagem em troca da compra via seu link,
              salvo se expressamente autorizado por escrito pela Wiize.
            </Bullet>
            <Bullet allowed={false}>
              <strong>Brand bidding:</strong> rodar anúncios pagos (Google Ads, Meta Ads, TikTok
              Ads, Bing, etc.) usando os termos "Wiize", "Wiize Prospect", variações, erros de
              grafia ou domínio wiize.com.br como palavra-chave, em títulos, descrições ou URLs
              de exibição.
            </Bullet>
            <Bullet allowed={false}>
              <strong>Domínios/URLs enganosos:</strong> criar sites, subdomínios, perfis sociais ou
              landing pages que se passem pela Wiize ou induzam o usuário a acreditar que é canal
              oficial.
            </Bullet>
            <Bullet allowed={false}>
              <strong>SPAM e mensagens não solicitadas:</strong> envio em massa para listas
              compradas, scrapping de números, disparos no WhatsApp sem autorização do destinatário
              ou qualquer prática que viole políticas de plataformas (Meta, Google, etc.).
            </Bullet>
            <Bullet allowed={false}>
              <strong>Cookie stuffing, iframes ocultos, redirects forçados</strong> ou qualquer
              técnica fraudulenta para atribuir vendas que não foram geradas por recomendação
              legítima.
            </Bullet>
            <Bullet allowed={false}>
              <strong>Conteúdo ilegal, ofensivo ou impróprio:</strong> divulgar a Wiize em sites
              ou perfis com conteúdo adulto, pirataria, jogos de azar não regulamentados, discurso
              de ódio, violência ou que infrinja direitos de terceiros.
            </Bullet>
            <Bullet allowed={false}>
              <strong>Promessas falsas:</strong> garantir faturamento, número de leads ou prazos
              de retorno; usar prints/depoimentos não autênticos; comparar de forma desleal com
              concorrentes.
            </Bullet>
            <Bullet allowed={false}>
              <strong>Revenda da plataforma como sendo sua:</strong> ofertar a Wiize como
              produto white-label, sublicenciar ou repassar acessos.
            </Bullet>
          </ul>
        </Section>

        <Section icon={Wallet} title="4. Comissionamento, Níveis e Planos">
          <p className="text-foreground/90">
            A comissão é calculada sobre o valor líquido efetivamente pago pelo cliente indicado
            (plano + order bumps − descontos − impostos retidos pela operadora de pagamento) e segue
            a estrutura de níveis abaixo, vigente a partir de 26/05/2026:
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Nível</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Comissão</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Como subir</th>
                </tr>
              </thead>
              <tbody className="text-foreground/90">
                <tr className="border-t border-border"><td className="px-4 py-2.5 font-medium">Select</td><td className="px-4 py-2.5">10%</td><td className="px-4 py-2.5 text-muted-foreground">Nível inicial após aprovação</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2.5 font-medium">Signature</td><td className="px-4 py-2.5">15%</td><td className="px-4 py-2.5 text-muted-foreground">A partir de 5 clientes ativos</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2.5 font-medium">Prime</td><td className="px-4 py-2.5">20%</td><td className="px-4 py-2.5 text-muted-foreground">A partir de 15 clientes ativos</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2.5 font-medium">Exclusive</td><td className="px-4 py-2.5">25%</td><td className="px-4 py-2.5 text-muted-foreground">A partir de 30 clientes ativos + curadoria Wiize</td></tr>
              </tbody>
            </table>
          </div>
          <ul className="space-y-2.5 pt-2">
            <Bullet>
              A comissão incide sobre os <strong>planos pagos da Wiize</strong> (Atendimento, Growth e Enterprise),
              incluindo <strong>order bumps</strong> e add-ons contratados no checkout. Não há comissão sobre o plano
              gratuito, períodos de trial, créditos promocionais, taxas de gateway ou impostos.
            </Bullet>
            <Bullet>
              A recorrência é paga por até <strong>24 meses</strong> a partir da primeira fatura paga, desde que o
              cliente permaneça ativo e adimplente.
            </Bullet>
            <Bullet>
              A comissão é paga apenas sobre vendas <strong>aprovadas e efetivamente pagas</strong>, após período de
              carência (cooling-off) de <strong>14 dias</strong>, que cobre o direito de arrependimento, chargebacks
              e reembolsos.
            </Bullet>
            <Bullet>
              Vendas canceladas, estornadas, fraudulentas ou que violem estes Termos são <strong>deduzidas
              automaticamente</strong> do saldo do Parceiro, podendo gerar saldo negativo a ser compensado em ciclos
              futuros. Após o pagamento de uma comissão, o valor é descontado do saldo disponível e o histórico fica
              registrado no portal.
            </Bullet>
            <Bullet>
              <strong>Saque mínimo de R$ 100</strong> via PIX, processado em até 5 dias úteis após aprovação. É
              exigido cadastro e validação prévia da chave PIX no portal do Parceiro.
            </Bullet>
            <Bullet>
              É responsabilidade do Parceiro emitir nota fiscal de prestação de serviços e recolher os tributos
              devidos sobre as comissões recebidas. Para parceiros PF, valores acima de R$ 1.903,98/mês podem sofrer
              retenção de IRRF conforme tabela vigente.
            </Bullet>
            <Bullet>
              A Wiize pode ajustar percentuais, regras de atribuição (last-click, janela de cookies de 2 anos) e
              estrutura de níveis com aviso prévio mínimo de 30 dias, sempre respeitando as comissões já apuradas.
            </Bullet>
          </ul>
        </Section>

        <Section icon={ShieldAlert} title="5. Auditoria, Suspensão e Encerramento">
          <ul className="space-y-2.5">
            <Bullet>
              A Wiize pode auditar a qualquer momento as vendas, materiais e canais de divulgação
              do Parceiro, solicitando comprovações e correções.
            </Bullet>
            <Bullet>
              Indícios de violação destes Termos podem resultar em <strong>suspensão preventiva</strong>{" "}
              da conta, retenção de pagamentos e investigação interna.
            </Bullet>
            <Bullet>
              Confirmada a violação, a Wiize poderá encerrar a participação do Parceiro
              <strong> sem aviso prévio</strong>, cancelar comissões pendentes e, se aplicável,
              cobrar valores já pagos sobre vendas fraudulentas.
            </Bullet>
            <Bullet>
              O Parceiro pode encerrar sua participação a qualquer momento, mediante solicitação
              por escrito ao suporte do Programa. Comissões sobre vendas válidas e já liberadas
              permanecem devidas.
            </Bullet>
          </ul>
        </Section>

        <Section icon={Scale} title="6. Propriedade Intelectual e Confidencialidade">
          <ul className="space-y-2.5">
            <Bullet>
              A marca "Wiize", logotipos, layouts, textos e demais materiais são de propriedade
              exclusiva da Wiize e licenciados ao Parceiro apenas para fins de divulgação durante
              a vigência do Programa.
            </Bullet>
            <Bullet>
              Materiais internos (relatórios, dashboards, dados de leads, métricas, treinamentos
              gravados) são confidenciais e não podem ser compartilhados com terceiros nem
              utilizados para fins concorrentes.
            </Bullet>
            <Bullet>
              É vedado registrar marcas, domínios ou perfis em redes sociais que contenham o termo
              "Wiize" ou variações.
            </Bullet>
          </ul>
        </Section>

        <Section icon={CheckCircle2} title="7. LGPD e Tratamento de Dados">
          <p>
            O Parceiro atua como controlador independente dos dados pessoais que coleta em sua
            própria audiência. A Wiize trata os dados do Parceiro (nome, CPF/CNPJ, contato e dados
            bancários) para fins de operação do Programa, conforme nossa{" "}
            <Link to="/privacy" className="text-primary underline">Política de Privacidade</Link>.
          </p>
          <p>
            O Parceiro compromete-se a obter consentimento válido de seus contatos antes de
            promover a Wiize por canais diretos (e-mail, WhatsApp, SMS) e a respeitar pedidos de
            descadastro.
          </p>
        </Section>

        <Section icon={Scale} title="8. Disposições Gerais">
          <ul className="space-y-2.5">
            <Bullet>
              Estes Termos podem ser atualizados a qualquer momento. Alterações relevantes serão
              comunicadas por e-mail e/ou na área do Parceiro com pelo menos 15 dias de antecedência.
            </Bullet>
            <Bullet>
              A relação entre as partes é estritamente comercial, não configurando vínculo
              empregatício, sociedade, mandato ou representação exclusiva.
            </Bullet>
            <Bullet>
              Fica eleito o foro da Comarca de Belo Horizonte/MG para dirimir quaisquer controvérsias
              oriundas destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado
              que seja.
            </Bullet>
            <Bullet>
              Dúvidas? Fale conosco em{" "}
              <a href="mailto:parceiros@wiize.com.br" className="text-primary underline">
                parceiros@wiize.com.br
              </a>
              .
            </Bullet>
          </ul>
        </Section>

        <div className="text-center pt-6">
          <Link
            to="/partners/apply"
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Voltar para a candidatura
          </Link>
          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Wiize · Todos os direitos reservados ·{" "}
            <Link to="/privacy" className="hover:text-foreground underline">Privacidade</Link> ·{" "}
            <Link to="/terms" className="hover:text-foreground underline">Termos de Uso da Plataforma</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
