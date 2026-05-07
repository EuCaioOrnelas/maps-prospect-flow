import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import {
  MessageSquare, Shield, DollarSign, FileText, Settings, CheckCircle2,
  AlertTriangle, Clock, ExternalLink, ChevronDown, ChevronRight,
  Smartphone, Building2, Globe, Zap, Users, ArrowRight, Info,
  BookOpen, Layout, Send, ShieldCheck, BadgeCheck, Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const MetaApiGuide = () => {
  useAutoScoreTracking("meta-api-guide");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, email, avatar_url, plan, searches_used, searches_limit, trial_start_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AppHeader profile={profile} />
        <BackgroundGlow />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-10">

            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BookOpen size={24} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">Documentação da Meta API Oficial</h1>
                  <p className="text-muted-foreground text-sm">Guia completo para configurar e usar a API oficial do WhatsApp</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/meta-campaigns")} className="gap-2">
                <ArrowRight size={14} className="rotate-180" /> Voltar para Campanhas Meta
              </Button>
            </div>

            {/* Intro Section */}
            <GuideSection
              icon={<MessageSquare size={20} />}
              title="O que é a API Oficial do WhatsApp?"
              defaultOpen
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A API Oficial do WhatsApp Business (Cloud API) é a solução da Meta para empresas
                  que desejam se comunicar com seus clientes de forma profissional, segura e escalável
                  pelo WhatsApp. Diferente do WhatsApp Business App convencional, a API permite automação,
                  integração com sistemas e envio em escala.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard
                    icon={<ShieldCheck size={16} />}
                    title="100% oficial e segura"
                    desc="Aprovada e mantida pela Meta. Sem risco de banimento por uso de API não oficial."
                  />
                  <InfoCard
                    icon={<BadgeCheck size={16} />}
                    title="Selo verde verificado"
                    desc="Sua empresa pode solicitar o selo de verificação do WhatsApp Business."
                  />
                  <InfoCard
                    icon={<Zap size={16} />}
                    title="Alta escalabilidade"
                    desc="Envie milhares de mensagens por dia com infraestrutura da Meta."
                  />
                  <InfoCard
                    icon={<Shield size={16} />}
                    title="Criptografia de ponta"
                    desc="Todas as mensagens são protegidas com criptografia end-to-end."
                  />
                </div>
              </div>
            </GuideSection>

            {/* Use cases */}
            <GuideSection
              icon={<Megaphone size={20} />}
              title="Para que serve? (Uso permitido)"
            >
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-2.5 mb-3">
                    <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold text-foreground">Uso para RELACIONAMENTO (permitido)</p>
                  </div>
                  <ul className="space-y-2 ml-6">
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      Enviar mensagens para clientes e leads que já interagiram com sua empresa
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      Reengajar leads que responderam ou demonstraram interesse
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      Enviar atualizações, promoções e novidades para sua base de contatos
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      Notificações de pedidos, confirmações e lembretes
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <div className="flex items-start gap-2.5 mb-3">
                    <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold text-foreground">Prospecção fria NÃO é permitida</p>
                  </div>
                  <ul className="space-y-2 ml-6">
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      Enviar mensagens para números que nunca interagiram com sua empresa
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      Comprar listas de números e fazer disparos em massa
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      Spam ou mensagens não solicitadas em grande volume
                    </li>
                  </ul>
                  <p className="text-xs text-destructive/80 mt-3 pl-6">
                    A Meta pode banir permanentemente sua conta se detectar uso indevido.
                  </p>
                </div>
              </div>
            </GuideSection>

            {/* Message types and costs */}
            <GuideSection
              icon={<DollarSign size={20} />}
              title="Tipos de mensagens e custos"
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A Meta cobra por conversa iniciada (janela de 24 horas), não por mensagem individual.
                  Os custos variam conforme o tipo de conversa e o país do destinatário.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Categoria</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Descrição</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Custo (Brasil)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="py-3 px-4 font-medium text-foreground">Marketing</td>
                        <td className="py-3 px-4 text-muted-foreground">Promoções, ofertas, novidades de produtos</td>
                        <td className="py-3 px-4 text-foreground font-mono">~R$ 0,50</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-foreground">Utilidade</td>
                        <td className="py-3 px-4 text-muted-foreground">Atualizações de pedido, confirmações, lembretes</td>
                        <td className="py-3 px-4 text-foreground font-mono">~R$ 0,15</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-foreground">Autenticação</td>
                        <td className="py-3 px-4 text-muted-foreground">Códigos de verificação, senhas temporárias</td>
                        <td className="py-3 px-4 text-foreground font-mono">~R$ 0,15</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-foreground">Serviço</td>
                        <td className="py-3 px-4 text-muted-foreground">Quando o cliente inicia a conversa (gratuito!)</td>
                        <td className="py-3 px-4 text-primary font-mono font-semibold">Grátis</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
                  <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Os valores são aproximados e podem variar. Cada conversa de marketing inclui uma janela de 24h
                    onde você pode enviar quantas mensagens quiser sem custo adicional. Consulte os preços atualizados em{" "}
                    <a href="https://developers.facebook.com/docs/whatsapp/pricing" target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5">
                      Meta Pricing <ExternalLink size={9} />
                    </a>
                  </p>
                </div>
              </div>
            </GuideSection>

            {/* Templates */}
            <GuideSection
              icon={<FileText size={20} />}
              title="Templates de mensagem (obrigatório)"
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Para iniciar uma conversa com um cliente pela API, você precisa obrigatoriamente usar um
                  <strong className="text-foreground"> template de mensagem aprovado pela Meta</strong>. Templates são
                  mensagens pré-formatadas que passam por uma revisão antes de poderem ser usadas.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard
                    icon={<Clock size={16} />}
                    title="Aprovação em até 24h"
                    desc="A Meta analisa e aprova (ou rejeita) seus templates geralmente em minutos, mas pode levar até 24 horas."
                  />
                  <InfoCard
                    icon={<Layout size={16} />}
                    title="Formatos flexíveis"
                    desc="Suportam texto, imagens, vídeos, documentos, botões de ação e links."
                  />
                  <InfoCard
                    icon={<Users size={16} />}
                    title="Variáveis personalizáveis"
                    desc="Use {{1}}, {{2}}, etc. para inserir nome do cliente, valores e dados dinâmicos."
                  />
                  <InfoCard
                    icon={<Shield size={16} />}
                    title="Conformidade garantida"
                    desc="Templates aprovados seguem as políticas da Meta, reduzindo risco de bloqueio."
                  />
                </div>

                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                  <p className="text-sm font-semibold text-foreground">Dicas para aprovação rápida:</p>
                  <ul className="space-y-2">
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                      Seja claro e objetivo no conteúdo da mensagem
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                      Não inclua conteúdo enganoso, agressivo ou com linguagem ofensiva
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                      Escolha a categoria correta (Marketing, Utilidade ou Autenticação)
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                      Adicione exemplos de variáveis no campo de amostra
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                      Evite URLs encurtadas ou links suspeitos
                    </li>
                  </ul>
                </div>
              </div>
            </GuideSection>

            {/* Step by step: Create Meta Account */}
            <GuideSection
              icon={<Building2 size={20} />}
              title="Passo 1: Criar conta no Meta Business Suite"
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Antes de usar a API, você precisa de uma conta no Meta Business Suite (antigo Facebook Business Manager).
                </p>
                <StepList steps={[
                  {
                    title: "Acesse o Meta Business Suite",
                    desc: "Vá para business.facebook.com e clique em 'Criar conta'. Se já tem uma conta, faça login.",
                    link: "https://business.facebook.com",
                  },
                  {
                    title: "Preencha os dados da empresa",
                    desc: "Informe o nome da empresa, seu nome e e-mail corporativo. Use dados reais pois a Meta pode verificar.",
                  },
                  {
                    title: "Verifique seu e-mail",
                    desc: "A Meta enviará um código de verificação para o e-mail informado. Confirme para ativar a conta.",
                  },
                  {
                    title: "Complete o perfil da empresa",
                    desc: "Adicione endereço, telefone e site da empresa. Quanto mais completo, maior a confiança da Meta.",
                  },
                ]} />
              </div>
            </GuideSection>

            {/* Step by step: Create WhatsApp Business Account */}
            <GuideSection
              icon={<Smartphone size={20} />}
              title="Passo 2: Criar conta WhatsApp Business (WABA)"
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Dentro do Meta Business Suite, você precisa criar uma conta do WhatsApp Business vinculada.
                </p>
                <StepList steps={[
                  {
                    title: "Acesse Configurações da conta",
                    desc: "Em business.facebook.com, clique em 'Configurações' (ícone de engrenagem no canto inferior esquerdo).",
                    link: "https://business.facebook.com",
                  },
                  {
                    title: "Vá em Contas → Contas do WhatsApp",
                    desc: "No menu lateral de Configurações, abra 'Contas' e depois 'Contas do WhatsApp'.",
                  },
                  {
                    title: "Adicionar conta WhatsApp",
                    desc: "Clique em 'Adicionar', preencha os dados solicitados (nome do negócio, fuso horário, moeda) e confirme para criar a WABA.",
                  },
                  {
                    title: "Adicione um número de telefone",
                    desc: "Informe o número que será usado para enviar mensagens. IMPORTANTE: Este número não pode estar registrado no WhatsApp comum ou WhatsApp Business App.",
                  },
                  {
                    title: "Verifique o número",
                    desc: "A Meta enviará um código por SMS ou ligação para verificar o número. Insira o código para confirmar.",
                  },
                  {
                    title: "Configure o perfil comercial",
                    desc: "Adicione foto de perfil, descrição, endereço, horário de funcionamento e categoria da empresa.",
                  },
                ]} />

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive/80">
                    <strong>Atenção:</strong> O número usado na API NÃO pode estar ativo no WhatsApp pessoal ou
                    no app WhatsApp Business simultaneamente. Ao registrar na API, ele será desvinculado do app.
                  </p>
                </div>
              </div>
            </GuideSection>

            {/* Step 3: Create templates */}
            <GuideSection
              icon={<Layout size={20} />}
              title="Passo 3: Criar templates de mensagem"
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Antes de enviar campanhas, você precisa criar e ter templates aprovados pela Meta.
                </p>
                <StepList steps={[
                  {
                    title: "Acesse o WhatsApp Manager",
                    desc: "No Meta Business Suite, vá em 'WhatsApp Manager' e selecione sua conta WABA.",
                    link: "https://business.facebook.com/wa/manage/message-templates/",
                  },
                  {
                    title: "Clique em 'Criar template'",
                    desc: "Escolha a categoria: Marketing (promoções), Utilidade (atualizações) ou Autenticação (códigos).",
                  },
                  {
                    title: "Defina nome e idioma",
                    desc: "Use um nome descritivo (ex: promo_janeiro_2025) e selecione 'Português (BR)' como idioma.",
                  },
                  {
                    title: "Monte o conteúdo",
                    desc: "Adicione cabeçalho (texto, imagem ou vídeo), corpo da mensagem com variáveis {{1}}, rodapé e botões se desejar.",
                  },
                  {
                    title: "Adicione amostras",
                    desc: "Preencha exemplos para as variáveis (ex: {{1}} = 'João'). Isso acelera a aprovação.",
                  },
                  {
                    title: "Envie para aprovação",
                    desc: "Clique em 'Enviar' e aguarde. A análise geralmente leva de minutos a 24 horas.",
                  },
                ]} />
              </div>
            </GuideSection>

            {/* Step 4: Connect on Wiize */}
            <GuideSection
              icon={<Zap size={20} />}
              title="Passo 4: Conectar na Wiize"
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Com sua conta e templates prontos, conecte sua conta na Wiize para começar a enviar campanhas.
                </p>
                <StepList steps={[
                  {
                    title: "Acesse 'Campanhas Meta' na Wiize",
                    desc: "No menu lateral, clique em 'Campanhas Meta'. Se for seu primeiro acesso, aceite os termos de uso.",
                  },
                  {
                    title: "Clique em 'Conectar com Meta Business'",
                    desc: "Um popup do Facebook será aberto. Faça login com a conta que administra o Meta Business Suite.",
                  },
                  {
                    title: "Autorize o acesso",
                    desc: "Permita que a Wiize acesse sua conta WhatsApp Business. Selecione o número que deseja conectar.",
                  },
                  {
                    title: "Pronto! Conexão automática",
                    desc: "O token permanente e o webhook são configurados automaticamente. Você já pode enviar campanhas!",
                  },
                ]} />

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    A conexão gera um token permanente que não expira. Você não precisa reconectar periodicamente.
                    O acesso pode ser revogado a qualquer momento no Meta Business Suite.
                  </p>
                </div>
              </div>
            </GuideSection>

            {/* Step 5: Send campaign */}
            <GuideSection
              icon={<Send size={20} />}
              title="Passo 5: Enviar sua primeira campanha"
            >
              <div className="space-y-4">
                <StepList steps={[
                  {
                    title: "Selecione o número remetente",
                    desc: "Escolha qual dos seus números conectados vai enviar a campanha.",
                  },
                  {
                    title: "Escolha o template aprovado",
                    desc: "Os templates aprovados do seu número aparecerão automaticamente para seleção.",
                  },
                  {
                    title: "Preencha as variáveis (se houver)",
                    desc: "Se o template tem variáveis como {{1}}, preencha com o valor desejado (ex: nome, link, etc).",
                  },
                  {
                    title: "Selecione os destinatários",
                    desc: "Escolha leads do seu CRM ou insira números manualmente. Lembre-se: apenas contatos com opt-in.",
                  },
                  {
                    title: "Revise e envie",
                    desc: "Confira o preview da mensagem e clique em 'Enviar campanha'. Acompanhe o status em tempo real.",
                  },
                ]} />
              </div>
            </GuideSection>

            {/* FAQ */}
            <GuideSection
              icon={<Info size={20} />}
              title="Perguntas frequentes"
            >
              <div className="space-y-3">
                <FAQItem
                  q="Posso usar meu número pessoal do WhatsApp?"
                  a="Não é recomendado. Ao registrar um número na API, ele é desvinculado do WhatsApp pessoal/Business App. Recomendamos usar um número dedicado para a empresa."
                />
                <FAQItem
                  q="Quanto tempo demora a aprovação de templates?"
                  a="Geralmente de minutos a 24 horas. Templates de marketing podem levar mais tempo que os de utilidade. Certifique-se de seguir as diretrizes da Meta para aprovação rápida."
                />
                <FAQItem
                  q="Posso enviar mensagens para qualquer número?"
                  a="Não. A Meta exige que os destinatários tenham dado consentimento (opt-in) para receber suas mensagens. Enviar para contatos sem consentimento pode resultar em bloqueio da conta."
                />
                <FAQItem
                  q="O que acontece se meu template for rejeitado?"
                  a="Você receberá o motivo da rejeição. Corrija o conteúdo e envie novamente. Motivos comuns: linguagem agressiva, links suspeitos, categoria incorreta."
                />
                <FAQItem
                  q="Preciso pagar algo para a Meta?"
                  a="Sim. A Meta cobra por conversa iniciada. Os custos variam por categoria (marketing ~R$0,50, utilidade ~R$0,15). Conversas iniciadas pelo cliente são gratuitas. O saldo é gerenciado no Meta Business Suite."
                />
                <FAQItem
                  q="Posso conectar mais de um número?"
                  a="Sim! Na Wiize você pode conectar vários números da API oficial. Cada número pode ter seus próprios templates e campanhas."
                />
                <FAQItem
                  q="Como adiciono saldo/créditos?"
                  a="Os créditos de envio são gerenciados diretamente no Meta Business Suite, na seção de pagamentos. Adicione um método de pagamento (cartão de crédito) e defina um limite."
                />
                <FAQItem
                  q="Se o número é desvinculado do WhatsApp, como respondo os leads?"
                  a="As respostas dos leads chegam no inbox do Meta Business Suite (business.facebook.com), que é o painel oficial da Meta para gerenciar conversas da API. Lá você pode ler e responder todas as mensagens recebidas. Na Wiize, você acompanha os status de entrega e as métricas das campanhas. Para uma experiência completa, recomendamos manter o Meta Business Suite aberto para gerenciar as conversas em tempo real."
                />
              </div>
            </GuideSection>

            {/* CTA */}
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-4">
              <h3 className="text-lg font-bold text-foreground">Pronto para começar?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Se você já configurou sua conta no Meta Business Suite e tem templates aprovados,
                conecte sua conta na Wiize e envie sua primeira campanha.
              </p>
              <Button onClick={() => navigate("/meta-campaigns")} className="gap-2">
                <Zap size={16} /> Ir para Campanhas Meta
              </Button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

/* ---- Sub-components ---- */

const GuideSection = ({ icon, title, children, defaultOpen = false }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card group">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-left transition-colors"
      >
        <div className="text-primary shrink-0 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">{icon}</div>
        <h2 className="text-base md:text-lg font-bold text-foreground flex-1">{title}</h2>
        {open ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
};

const InfoCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/30 border border-border group/card">
    <div className="text-primary mt-0.5 shrink-0 transition-transform duration-300 group-hover/card:scale-125 group-hover/card:rotate-12">{icon}</div>
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  </div>
);

const StepList = ({ steps }: { steps: { title: string; desc: string; link?: string }[] }) => (
  <div className="space-y-3">
    {steps.map((step, i) => (
      <div key={i} className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-primary">{i + 1}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{step.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
          {step.link && (
            <a href={step.link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
              Acessar <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    ))}
  </div>
);

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3.5 text-left transition-colors"
      >
        <p className="text-sm font-medium text-foreground flex-1">{q}</p>
        {open ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5">
          <p className="text-sm text-muted-foreground">{a}</p>
        </div>
      )}
    </div>
  );
};

export default MetaApiGuide;
