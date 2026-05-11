import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, HelpCircle, Search, Brain, MessageSquare, CreditCard, Shield, Flame, Bot, Target, BarChart3, Plug, Wallet, Sparkles, Workflow, BookOpen, HelpCircle as HelpCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const normalizeMd = (s: string) =>
  (s ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "  ");

const FaqAnswer = ({ children, className }: { children: string; className?: string }) => (
  <div
    className={cn(
      "prose prose-sm sm:prose-base max-w-none text-muted-foreground",
      "prose-p:my-2 prose-headings:text-foreground prose-strong:text-foreground prose-strong:font-semibold",
      "prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2",
      "prose-a:text-primary hover:prose-a:underline",
      "prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none",
      className
    )}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizeMd(children)}</ReactMarkdown>
  </div>
);

const ICON_MAP: Record<string, any> = {
  Brain, MessageSquare, CreditCard, Shield, Flame, Bot, Target,
  BarChart3, Plug, Wallet, Sparkles, Workflow, BookOpen, HelpCircle: HelpCircleIcon,
};

const _legacyCategories = [
  {
    id: "plataforma",
    title: "Plataforma",
    icon: Brain,
    questions: [
      {
        question: "O que é o Wiize?",
        answer: "O Wiize é uma plataforma completa de prospecção inteligente que utiliza IA para encontrar leads qualificados no Google Maps e automatizar o contato via WhatsApp. Combinamos busca estratégica, CRM integrado, agentes de IA, diagnóstico com IA, índice de fechamento e disparos em massa em uma única solução."
      },
      {
        question: "O que é uma busca estratégica?",
        answer: "Uma busca estratégica é uma pesquisa inteligente que utiliza nossa IA para analisar empresas no Google Maps e entregar apenas leads qualificados: empresas ativas, com contatos verificados e alto potencial de conversão. Cada busca retorna até 60 leads pré-qualificados."
      },
      {
        question: "Como funciona a geração de mensagens personalizadas com IA?",
        answer: "O Wiize analisa cada lead encontrado — nome da empresa, segmento, localização, avaliações e perfil do negócio — e gera automaticamente uma mensagem única e personalizada com 4 parágrafos estruturados: saudação contextualizada, introdução profissional, proposta de valor e chamada para ação. Cada lead recebe uma abordagem consultiva e humanizada."
      },
      {
        question: "O que é o Índice de Fechamento?",
        answer: "O Índice de Fechamento (Índ. Fech.) é uma pontuação calculada pela IA que indica a probabilidade de conversão de cada lead. Ele considera fatores como avaliações no Google Maps, volume de reviews, presença digital, categoria do negócio e potencial de receita para ajudar você a priorizar os melhores leads."
      },
      {
        question: "O que é o Diagnóstico com IA?",
        answer: "O Diagnóstico com IA analisa automaticamente cada lead e gera um relatório com oportunidades identificadas, pontos fracos do negócio e a melhor estratégia de abordagem. Isso transforma sua prospecção em algo consultivo, não invasivo."
      },
      {
        question: "Preciso instalar algum software?",
        answer: "Não. O Wiize é 100% online e funciona diretamente no navegador. Basta criar sua conta e começar a usar. Não é necessário instalar extensões, plugins ou softwares adicionais."
      },
      {
        question: "Os dados dos leads são atualizados?",
        answer: "Sim. Todos os dados são extraídos diretamente do Google Maps em tempo real no momento da sua busca, garantindo informações sempre atualizadas como telefone, site, endereço e avaliações."
      },
      {
        question: "Posso usar o Wiize no celular?",
        answer: "O Wiize é otimizado para uso em desktop e notebook. Algumas funcionalidades como o CRM Kanban e os disparos de campanha são melhor aproveitadas em telas maiores. Porém, relatórios e métricas podem ser acompanhados pelo celular."
      },
    ]
  },
  {
    id: "ia-prospeccao",
    title: "IA e Prospecção",
    icon: Sparkles,
    questions: [
      {
        question: "Como a IA gera mensagens personalizadas?",
        answer: "A IA do Wiize analisa dados como nome da empresa, segmento, localização, nota no Google Maps e número de avaliações para criar uma mensagem única para cada lead. A estrutura segue 4 parágrafos: saudação contextualizada ao horário, introdução profissional, proposta de valor específica e chamada para ação. Isso garante uma abordagem consultiva, não genérica."
      },
      {
        question: "O que é o Índice de Fechamento (Índ. Fech.)?",
        answer: "É uma pontuação calculada pela IA que indica a probabilidade de conversão de cada lead. Considera fatores como avaliações, presença digital, categoria do negócio e potencial de receita. Leads com índice mais alto devem ser priorizados na sua estratégia de abordagem."
      },
      {
        question: "Como funciona o Diagnóstico com IA?",
        answer: "O Diagnóstico com IA analisa automaticamente cada lead e gera um relatório com: oportunidades identificadas no negócio, pontos fracos que você pode resolver, e a melhor estratégia de abordagem comercial. Isso transforma sua prospecção em algo consultivo e relevante para o lead."
      },
      {
        question: "Posso editar a mensagem gerada pela IA antes de enviar?",
        answer: "Sim. Após a IA gerar a mensagem personalizada, você pode revisar e editar o texto antes de enviar. A mensagem gerada é uma sugestão inteligente que serve como ponto de partida, mas você tem controle total sobre o conteúdo final."
      },
      {
        question: "Como funciona o cooldown entre envios?",
        answer: "Para segurança da sua conta, o Wiize impõe um intervalo mínimo de 2 minutos entre cada envio de mensagem personalizada. Isso simula comportamento humano natural e protege seu número contra bloqueios."
      },
      {
        question: "O que é a Ação Recomendada pela IA?",
        answer: "Para cada lead, a IA sugere a melhor ação a tomar: abordar agora, agendar follow-up, ou priorizar outros leads. Essa recomendação é baseada no perfil do negócio, momento do mercado e probabilidade de conversão."
      },
    ]
  },
  {
    id: "whatsapp",
    title: "WhatsApp e Disparos",
    icon: MessageSquare,
    questions: [
      {
        question: "Como funcionam os disparos em massa via WhatsApp?",
        answer: "Cada número WhatsApp conectado pode enviar até 200 mensagens por dia, respeitando as políticas anti-banimento. O sistema usa delays aleatórios, variações de texto e pausas automáticas para simular comportamento humano. O limite é resetado automaticamente à meia-noite."
      },
      {
        question: "Quantos números WhatsApp posso conectar?",
        answer: "Depende do seu plano: Start permite 1 número (200 disparos/dia), Growth permite 2 números (400 disparos/dia no total), e Scale permite 5 números (1.000 disparos/dia no total). Cada número tem limite individual de 200 disparos."
      },
      {
        question: "Meu número pode ser bloqueado?",
        answer: "Bloqueios são decisões exclusivas do WhatsApp e podem ocorrer com qualquer ferramenta de envio. No Wiize, implementamos um conjunto robusto de proteções para minimizar drasticamente esse risco: delays aleatórios entre envios, variações automáticas de texto, pausas inteligentes, limites diários seguros e o sistema de Aquecimento de Chips. Seguindo nossas recomendações e boas práticas, a grande maioria dos nossos usuários opera com tranquilidade e sem intercorrências."
      },
      {
        question: "Por que acontecem bloqueios no WhatsApp?",
        answer: "O WhatsApp utiliza algoritmos de detecção de comportamento não orgânico. Bloqueios geralmente acontecem quando há envio de mensagens em volume muito alto para contatos desconhecidos, uso de textos repetitivos ou muito comerciais, muitos links em uma única mensagem, denúncias de spam pelos destinatários ou envios fora do horário comercial. Esses fatores são independentes da ferramenta utilizada — por isso o Wiize oferece recursos específicos para mitigar cada um deles."
      },
      {
        question: "Como o Wiize me protege contra bloqueios?",
        answer: "O Wiize oferece um ecossistema completo de proteção: 1) Aquecimento de Chips em 4 níveis progressivos durante 20 dias; 2) Delays aleatórios que simulam comportamento humano; 3) Variações automáticas de texto para cada envio; 4) Pausas inteligentes configuráveis após X contatos; 5) Limite diário seguro de 200 mensagens por número; 6) Alertas automáticos quando detectamos risco elevado. Essas camadas combinadas reduzem significativamente a probabilidade de bloqueio."
      },
      {
        question: "O que fazer se meu número for bloqueado?",
        answer: "Caso ocorra um bloqueio, você pode solicitar uma revisão diretamente pelo aplicativo do WhatsApp. A maioria dos bloqueios temporários é revertida em 24 a 72 horas. Para números com bom histórico, o desbloqueio costuma ser rápido. Nossa equipe de suporte pode orientá-lo sobre os próximos passos e ajudar a ajustar sua estratégia para evitar futuras ocorrências."
      },
      {
        question: "Quais práticas devo seguir para evitar bloqueios?",
        answer: "Recomendamos: sempre aquecer números novos antes de campanhas; começar com volumes baixos e aumentar gradualmente; usar variações de mensagem personalizadas; respeitar horário comercial (8h-20h); nunca ignorar pedidos de 'pare' ou 'não quero'; evitar textos com muitos links ou emojis excessivos; e manter uma abordagem consultiva e personalizada ao invés de puramente comercial."
      },
      {
        question: "Que tipo de conteúdo é proibido nos envios?",
        answer: "É proibido enviar mensagens promovendo cassinos, apostas ou jogos de azar; conteúdo adulto ou sexualmente explícito; produtos falsificados, réplicas ou piratas; esquemas financeiros, pirâmides ou promessas de ganho fácil; conteúdo que incite violência, ódio ou discriminação; phishing, golpes ou tentativas de fraude; venda de armas, drogas ou substâncias ilegais; e mensagens enganosas ou com informações falsas. Essas regras são definidas pelo WhatsApp/Meta e violá-las pode resultar em bloqueio permanente do seu número. Consulte nossas Diretrizes de Envio completas em /diretrizes-de-envio."
      },
      {
        question: "O que acontece se eu violar as regras do WhatsApp?",
        answer: "As consequências podem incluir: bloqueio temporário ou permanente do seu número, suspensão da conta no Meta Business Suite, redução do tier de envio e limites da sua conta, perda do número e de todo o histórico de conversas, e impossibilidade de recuperação em casos de violações graves. A Wiize não se responsabiliza por bloqueios, pois essas decisões são exclusivas do WhatsApp."
      },
      {
        question: "Posso personalizar as mensagens?",
        answer: "Sim! Você pode criar múltiplas variações de mensagem para cada campanha. O sistema rotaciona automaticamente entre as variações, tornando os envios mais naturais e reduzindo o risco de detecção como spam."
      },
      {
        question: "Qual a diferença entre Outbound e Inbound?",
        answer: "Outbound são disparos proativos que você envia para leads prospectados (via Evolution API). Inbound são mensagens de relacionamento enviadas a contatos que já interagiram com você (via Meta API Oficial). O Wiize oferece ambos os modelos integrados."
      },
      {
        question: "Como funciona o sistema de pausas inteligentes?",
        answer: "O Wiize oferece pausas automáticas configuráveis. Após um número definido de envios, o sistema pausa por alguns minutos antes de continuar. Isso simula comportamento humano natural e reduz drasticamente os riscos de detecção pelo WhatsApp."
      },
    ]
  },
  {
    id: "meta-api",
    title: "Meta API Oficial",
    icon: Shield,
    questions: [
      {
        question: "O que é a Meta API Oficial?",
        answer: "A Meta API Oficial (Cloud API v21.0) é a interface autorizada pelo Meta/Facebook para envio de mensagens via WhatsApp Business. Ela oferece máxima confiabilidade, criptografia de ponta a ponta e conformidade total com as políticas do WhatsApp."
      },
      {
        question: "O Wiize é um Meta Business Partner?",
        answer: "Sim. O Wiize é integrado como Meta Business Partner, o que garante acesso à API oficial com suporte direto da Meta e total conformidade com as diretrizes de uso da plataforma."
      },
      {
        question: "Qual a diferença entre API Oficial e Evolution API?",
        answer: "A API Oficial do Meta é usada para campanhas de relacionamento (inbound), com templates aprovados e máxima segurança. A Evolution API é utilizada para prospecção outbound com estratégias de aquecimento. O Wiize combina ambas para oferecer a melhor experiência em cada cenário."
      },
      {
        question: "Preciso de uma conta Meta Business?",
        answer: "Para campanhas via API Oficial (relacionamento/inbound), sim — você conecta sua conta Meta Business diretamente pelo Wiize em poucos cliques. Para prospecção outbound com disparos em massa, não é necessário. Basta conectar seu número WhatsApp pelo QR Code."
      },
      {
        question: "As mensagens pela API Oficial são criptografadas?",
        answer: "Sim. Todas as mensagens enviadas pela Meta API Oficial possuem criptografia de ponta a ponta, garantindo que apenas você e o destinatário tenham acesso ao conteúdo."
      },
      {
        question: "Como conecto minha conta Meta Business ao Wiize?",
        answer: "O processo é simples: acesse a seção 'Meta Campanhas' no Wiize, clique em 'Conectar conta Meta', faça login com sua conta do Facebook/Meta Business e autorize o Wiize. Todo o processo leva menos de 2 minutos e a conexão é feita via Embedded Signup oficial do Meta."
      },
      {
        question: "O que são templates aprovados pela Meta?",
        answer: "Templates são modelos de mensagem que devem ser aprovados pela Meta antes de serem usados para iniciar conversas. Eles garantem que as mensagens sigam as políticas do WhatsApp. Você pode criar e gerenciar templates diretamente pelo Wiize."
      },
      {
        question: "Posso usar API Oficial e Evolution API ao mesmo tempo?",
        answer: "Sim! Essa é uma das grandes vantagens do Wiize. Você pode usar a Meta API Oficial para campanhas de relacionamento e remarketing (inbound), e a Evolution API para prospecção de novos leads (outbound). Ambas funcionam de forma integrada na mesma plataforma."
      },
    ]
  },
  {
    id: "aquecimento",
    title: "Aquecimento de Chips",
    icon: Flame,
    questions: [
      {
        question: "O que é o Aquecimento de Chips?",
        answer: "O Aquecimento de Chips é um sistema inteligente que prepara números novos ou inativos para uso comercial em 20 dias. Funciona em 4 níveis progressivos: nos primeiros 5 dias envia mensagens simples, depois evolui para interações mais naturais e mensagens pré-comerciais."
      },
      {
        question: "O aquecimento garante que meu número não será bloqueado?",
        answer: "Não. O aquecimento reduz significativamente o risco de bloqueio ao construir reputação gradualmente, mas não elimina completamente essa possibilidade. O WhatsApp utiliza algoritmos próprios e nenhuma ferramenta pode garantir 100% de proteção."
      },
      {
        question: "Quantos chips posso aquecer simultaneamente?",
        answer: "Você pode conectar e aquecer até 10 chips simultaneamente, dependendo do seu plano. O processo é 100% automatizado — basta conectar o número e o sistema cuida de todo o restante."
      },
      {
        question: "Quanto tempo dura o aquecimento?",
        answer: "O processo completo leva 20 dias. É dividido em 4 níveis de 5 dias cada, com intensidade progressiva. Após o aquecimento, o número está preparado para campanhas de maior volume com segurança."
      },
      {
        question: "Posso pular o aquecimento?",
        answer: "Sim, é possível pular o aquecimento. Porém, recomendamos fortemente completar o processo, especialmente para números novos. Números sem aquecimento têm maior risco de bloqueio ao iniciar campanhas de volume."
      },
    ]
  },
  {
    id: "agentes-ia",
    title: "Agentes de IA",
    icon: Bot,
    questions: [
      {
        question: "O que são os Agentes de IA?",
        answer: "Os Agentes de IA são vendedores virtuais que trabalham 24/7 no seu WhatsApp. Eles respondem mensagens automaticamente, qualificam leads com perguntas inteligentes e organizam tudo no CRM — sem precisar de prompts complexos."
      },
      {
        question: "Como configuro um Agente de IA?",
        answer: "A configuração é simples: escolha um número WhatsApp conectado, defina o objetivo do agente (vendas, suporte, qualificação), ajuste o estilo de comunicação e pronto. O assistente de configuração guia você em cada etapa."
      },
      {
        question: "O agente responde a qualquer mensagem?",
        answer: "O agente responde dentro do horário de operação configurado e segue as regras que você definir. Você pode configurar limites de respostas por conversa, critérios de encerramento e comportamento pós-resposta."
      },
      {
        question: "Posso pausar o agente a qualquer momento?",
        answer: "Sim. Você pode pausar e retomar o agente quando quiser, tanto manualmente quanto automaticamente baseado em horários de operação definidos."
      },
      {
        question: "O agente funciona com o CRM?",
        answer: "Sim! O agente integra com o CRM automaticamente. Quando um lead responde, o agente pode mover o lead para etapas específicas do pipeline, como 'Respondeu', 'Qualificado' ou 'Perdido', baseado nas regras que você configurar."
      },
    ]
  },
  {
    id: "flows",
    title: "Flows e Automações",
    icon: Sparkles,
    questions: [
      {
        question: "O que são os Flows de Automação?",
        answer: "Flows são sequências visuais de automação que você monta em um editor drag-and-drop. Cada fluxo pode incluir envio de mensagens, esperas programadas, condições (se respondeu/não respondeu), coleta de dados, testes A/B, integração com Google Sheets, Gmail e Google Calendar. O sistema executa tudo automaticamente após o disparo."
      },
      {
        question: "Quais nós estão disponíveis no editor de Flows?",
        answer: "O editor oferece diversos nós: Mensagem (texto, imagem, vídeo, áudio), Espera (timer configurável), Condição (baseada em resposta, horário, variáveis), Coleta de Dados, Botões interativos, Teste A/B, Split Aleatório, Ação (webhook, CRM), Transferência para humano, integração com Gmail, Google Sheets e Google Calendar, e nó de Agente de IA."
      },
      {
        question: "O que é o Flow com IA?",
        answer: "O Flow com IA permite que a inteligência artificial gere fluxos de automação completos a partir de uma descrição simples. Basta descrever seu objetivo (ex: 'follow-up para leads que não responderam em 48h') e a IA cria o fluxo com nós, mensagens e condições já configurados. Você pode editar e ajustar depois."
      },
      {
        question: "Posso criar fluxos a partir de templates prontos?",
        answer: "Sim. O Wiize oferece templates pré-configurados para os cenários mais comuns: boas-vindas, follow-up, qualificação de leads, pesquisa de satisfação e reengajamento. Basta selecionar o template e personalizá-lo."
      },
      {
        question: "Posso integrar Flows com Google Sheets e Gmail?",
        answer: "Sim. Os Flows suportam integração nativa com Google Sheets (para leitura/escrita de dados), Gmail (para envio de emails automáticos) e Google Calendar (para criação de eventos). Basta conectar sua conta Google pelo Wiize."
      },
      {
        question: "Qual o limite de fluxos que posso criar?",
        answer: "Não há limite de fluxos. Você pode criar quantos fluxos quiser e ativá-los simultaneamente. Cada fluxo pode ter suas próprias regras de disparo e condições de operação."
      },
    ]
  },
  {
    id: "crm",
    title: "CRM e Leads",
    icon: Target,
    questions: [
      {
        question: "O que é o CRM do Wiize?",
        answer: "O CRM integrado permite gerenciar todos os seus leads em um pipeline visual estilo Kanban. Acompanhe cada lead desde a prospecção até o fechamento, adicione notas, tags e acompanhe o histórico completo de interações."
      },
      {
        question: "Posso importar leads de outras fontes?",
        answer: "Sim. Além dos leads prospectados pelo Wiize, você pode adicionar leads manualmente com nome, telefone e informações de contato. Todos os leads são organizados no mesmo pipeline."
      },
      {
        question: "Os leads são compartilhados entre usuários?",
        answer: "Não. Cada usuário tem acesso exclusivo aos seus próprios leads. Implementamos políticas de segurança em nível de linha (RLS) que garantem total isolamento dos dados."
      },
      {
        question: "Posso exportar meus leads?",
        answer: "Sim. Você pode exportar seus leads em formato Excel (.xlsx) a qualquer momento, incluindo todas as informações de contato, status e histórico de interações."
      },
      {
        question: "Como funcionam as etapas do pipeline?",
        answer: "Você pode personalizar as etapas do pipeline de acordo com seu processo de vendas. Arraste e solte leads entre etapas no quadro Kanban. As etapas padrão incluem: Novo, Contatado, Respondeu, Qualificado e Fechado."
      },
    ]
  },
  {
    id: "planos",
    title: "Planos e Pagamentos",
    icon: CreditCard,
    questions: [
      {
        question: "Qual plano é ideal para mim?",
        answer: "O plano Start (R$197/mês) é ideal para freelancers e autônomos com 200 buscas e 1 número WhatsApp. O Growth (R$497/mês) é perfeito para vendedores e pequenas equipes com 600 buscas e 2 números. O Enterprise (investimento personalizado) é indicado para agências e operações de alto volume — fale com nosso time para uma proposta sob medida."
      },
      {
        question: "Posso cancelar minha assinatura a qualquer momento?",
        answer: "Sim! Você pode cancelar sua assinatura quando quiser. Não há fidelidade ou taxas de cancelamento. Seu acesso continua ativo até o final do período pago."
      },
      {
        question: "Quais formas de pagamento são aceitas?",
        answer: "Aceitamos cartão de crédito (Visa, Mastercard, Amex) e PIX. Todos os pagamentos são processados de forma segura pelo Stripe, com certificação PCI DSS Level 1."
      },
      {
        question: "Meus dados de pagamento são seguros?",
        answer: "Sim. Não armazenamos dados de cartão de crédito em nossos servidores. Todos os pagamentos são processados pelo Stripe, uma das plataformas mais seguras do mundo."
      },
      {
        question: "Como funciona a política de reembolso?",
        answer: "Reembolsos são avaliados caso a caso, considerando o uso da plataforma e possíveis falhas técnicas. Consulte nossa Política de Reembolso completa para mais detalhes."
      },
      {
        question: "Posso fazer upgrade ou downgrade do plano?",
        answer: "Sim. Você pode alterar seu plano a qualquer momento. O upgrade é aplicado imediatamente com cobrança proporcional. O downgrade é aplicado no próximo ciclo de cobrança."
      },
      {
        question: "Como funciona o pagamento via PIX?",
        answer: "Ao escolher PIX, você receberá um QR Code para pagamento. Após a confirmação (geralmente instantânea), seu acesso é liberado automaticamente. O PIX é processado com total segurança."
      },
    ]
  },
  {
    id: "seguranca",
    title: "Segurança e Privacidade",
    icon: Shield,
    questions: [
      {
        question: "Como meus dados são protegidos?",
        answer: "Utilizamos criptografia de ponta a ponta, controle de acesso rigoroso e monitoramento contínuo. Todos os dados sensíveis são criptografados em repouso e em trânsito usando TLS 1.3. Nossa infraestrutura possui certificações de segurança reconhecidas internacionalmente."
      },
      {
        question: "O Wiize está em conformidade com a LGPD?",
        answer: "Sim. Seguimos todas as diretrizes da Lei Geral de Proteção de Dados. Você tem direito a acessar, corrigir, solicitar exclusão e portabilidade dos seus dados a qualquer momento."
      },
      {
        question: "Vocês vendem meus dados?",
        answer: "Não. O Wiize nunca vende, aluga ou compartilha seus dados pessoais com terceiros para fins de marketing. Dados são compartilhados apenas com processadores essenciais para o serviço."
      },
      {
        question: "Meus contatos e leads ficam expostos?",
        answer: "Não. Seus contatos são armazenados de forma segura e acessíveis apenas para você. Implementamos políticas de segurança em nível de linha que garantem isolamento total dos dados de cada usuário."
      },
      {
        question: "O que acontece com meus dados se eu cancelar?",
        answer: "Após o cancelamento, seus dados ficam disponíveis até o final do período pago. Depois disso, são mantidos por 30 dias para eventual reativação. Você pode solicitar a exclusão completa a qualquer momento conforme a LGPD."
      },
    ]
  },
  {
    id: "conectar-meta",
    title: "Conectar Meta API",
    icon: Plug,
    questions: [
      {
        question: "Quais são os pré-requisitos para conectar a Meta API?",
        answer: "Você precisa de: uma conta do Facebook ativa, uma conta Meta Business (pode criar gratuitamente em business.facebook.com), e um número de telefone que não esteja vinculado a nenhuma outra conta do WhatsApp Business API."
      },
      {
        question: "Passo a passo: Como conectar a Meta API no Wiize?",
        answer: "1) Acesse 'Meta Campanhas' no menu lateral. 2) Clique em 'Conectar conta Meta'. 3) Faça login com sua conta do Facebook. 4) Autorize o Wiize como parceiro. 5) Selecione ou crie uma conta WhatsApp Business. 6) Escolha o número de telefone. Pronto! A conexão é imediata."
      },
      {
        question: "Preciso verificar meu negócio no Meta Business?",
        answer: "Para envios de alto volume, sim. A verificação do negócio no Meta Business Suite aumenta seus limites de envio e dá acesso a recursos adicionais. Para começar com volumes menores, não é obrigatório."
      },
      {
        question: "Quanto custa usar a Meta API Oficial?",
        answer: "O uso da Meta API dentro do Wiize está incluído no seu plano. Porém, a Meta cobra por conversa iniciada (conversation-based pricing). Os custos variam por país e tipo de conversa (marketing, utilidade, autenticação). Consulte a tabela de preços da Meta para valores atualizados."
      },
      {
        question: "Posso usar o mesmo número na API Oficial e nos disparos?",
        answer: "Não. Um número vinculado à Meta API Oficial não pode ser usado simultaneamente na Evolution API para disparos outbound. Recomendamos usar números diferentes para cada tipo de campanha."
      },
    ]
  },
  {
    id: "relatorios",
    title: "Relatórios e Métricas",
    icon: BarChart3,
    questions: [
      {
        question: "Quais métricas posso acompanhar?",
        answer: "O Wiize oferece dashboards completos com taxa de entrega, taxa de resposta, performance por número, evolução diária, funil de conversão e muito mais. Tudo em tempo real para você otimizar sua estratégia."
      },
      {
        question: "Posso compartilhar relatórios?",
        answer: "Sim. Você pode gerar links de relatórios compartilháveis protegidos por senha para apresentar resultados a clientes ou equipe."
      },
      {
        question: "Os relatórios são atualizados em tempo real?",
        answer: "Sim. Todos os dashboards e métricas são atualizados em tempo real conforme as campanhas são processadas e as respostas chegam."
      },
      {
        question: "Posso exportar os relatórios?",
        answer: "Sim. Os relatórios podem ser exportados em PDF para apresentações e compartilhamento. Você também pode exportar os dados brutos de leads em Excel para análises próprias."
      },
    ]
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: Wallet,
    questions: [
      {
        question: "Onde vejo minhas faturas?",
        answer: "Suas faturas e histórico de pagamentos podem ser acessados na seção 'Minha Conta' > 'Assinatura'. Lá você encontra todas as cobranças, status de pagamento e pode baixar recibos."
      },
      {
        question: "Recebi uma cobrança indevida, o que faço?",
        answer: "Entre em contato com nosso suporte através da página de contato. Informe seu e-mail cadastrado e os detalhes da cobrança. Nossa equipe analisará e resolverá em até 48 horas úteis."
      },
      {
        question: "O que acontece se meu pagamento falhar?",
        answer: "Se o pagamento falhar, você receberá um aviso por e-mail. Seu acesso será mantido por um período de carência de alguns dias para que regularize a situação. Após esse período, o acesso será suspenso até a regularização."
      },
    ]
  },
];

const HelpCenterFAQ = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Array<{ id: string; title: string; icon: any; questions: { question: string; answer: string }[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void _legacyCategories;
    (async () => {
      const { data: topics } = await supabase
        .from("faq_topics")
        .select("id, slug, name, icon, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      const { data: faqs } = await supabase
        .from("faqs")
        .select("id, topic_id, title, content, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      const built = (topics ?? [])
        .map((t: any) => {
          const qs = (faqs ?? [])
            .filter((f: any) => f.topic_id === t.id)
            .map((f: any) => ({ question: f.title, answer: f.content }));
          return {
            id: t.slug,
            title: t.name,
            icon: ICON_MAP[t.icon ?? ""] ?? HelpCircleIcon,
            questions: qs,
          };
        })
        .filter((c) => c.questions.length > 0);
      setCategories(built);
      if (built.length && !activeCategory) {
        setActiveCategory(built[0].id);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!categories.length) return;
    if (location.hash) {
      const hash = location.hash.replace("#", "");
      const found = categories.find((c) => c.id === hash);
      if (found) setActiveCategory(hash);
    }
  }, [location.hash, categories]);

  const activeData = useMemo(
    () => categories.find((c) => c.id === activeCategory),
    [categories, activeCategory]
  );

  const filteredQuestions = searchQuery.trim()
    ? categories.flatMap((cat) =>
        cat.questions
          .filter(
            (q) =>
              q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.answer.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((q) => ({ ...q, category: cat.title }))
      )
    : null;

  return (
    <>
      <SEO
        title="FAQ - Central de Ajuda"
        description="Encontre respostas para todas as suas dúvidas sobre o Wiize."
        keywords="FAQ, ajuda, suporte, perguntas frequentes, wiize"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate("/ajuda")}
                className="gap-2 text-sm px-3"
              >
                <ArrowLeft size={16} />
                Central de Ajuda
              </Button>
              <Logo size="md" />
              <div className="w-20" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
              Perguntas Frequentes
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Tire suas dúvidas sobre a plataforma, funcionalidades e muito mais.
            </p>

            <div className="max-w-md mx-auto relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar pergunta..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8 animate-pulse">
              <aside className="md:w-64 lg:w-72 shrink-0">
                <div className="h-3 w-16 bg-muted rounded mb-3 ml-3" />
                <nav className="flex md:flex-col gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted/60 rounded-lg" />
                  ))}
                </nav>
              </aside>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-8 pb-5 border-b border-border/50">
                  <div className="h-6 w-6 bg-muted rounded" />
                  <div className="h-8 w-56 bg-muted rounded" />
                </div>
                <div className="space-y-8">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i}>
                      <div className="h-5 w-3/4 bg-muted rounded mb-3" />
                      <div className="border-l-2 border-primary/20 pl-4 ml-1 space-y-2">
                        <div className="h-3 w-full bg-muted/70 rounded" />
                        <div className="h-3 w-11/12 bg-muted/70 rounded" />
                        <div className="h-3 w-2/3 bg-muted/70 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : filteredQuestions ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {filteredQuestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum resultado encontrado para "{searchQuery}"
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filteredQuestions.length} resultado(s) encontrado(s)
                  </p>
                  {filteredQuestions.map((q, i) => (
                    <div key={i} className="border border-border/50 rounded-lg p-5 bg-card/50">
                      <span className="text-xs text-primary font-medium mb-1 block">{q.category}</span>
                      <h3 className="font-semibold text-base mb-2">{q.question}</h3>
                      <FaqAnswer className="text-sm">{q.answer}</FaqAnswer>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
              <aside className="md:w-64 lg:w-72 shrink-0">
                <div className="md:sticky md:top-24">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                    Tópicos
                  </h3>
                  <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            activeCategory === cat.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Icon size={16} className="shrink-0" />
                          {cat.title}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              <div className="flex-1 min-w-0">
                {activeData && (
                  <>
                    <div className="flex items-center gap-3 mb-8 pb-5 border-b border-border/50">
                      <activeData.icon size={24} className="text-primary shrink-0" />
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">{activeData.title}</h2>
                    </div>

                    <div className="space-y-8">
                      {activeData.questions.map((q, i) => (
                        <div key={i} className="group">
                          <h3 className="font-semibold text-lg sm:text-xl mb-3 text-foreground">
                            {q.question}
                          </h3>
                          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed border-l-2 border-primary/30 pl-4 ml-1">
                            {q.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-12 p-6 bg-card/50 border border-border/50 rounded-xl text-center">
            <h3 className="text-lg font-semibold mb-2">Ainda tem dúvidas?</h3>
            <p className="text-muted-foreground mb-4">
              Nossa equipe está pronta para ajudar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/contato">Fale Conosco</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/seguranca-faq">FAQ de Segurança</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default HelpCenterFAQ;
