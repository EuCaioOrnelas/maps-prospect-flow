// Base de conhecimento estática do Wian — usada para enriquecer respostas
// sobre como cada módulo da Wiize funciona. Injetada no system prompt
// quando relevante (categoria de triagem ou pedido do user).

export type ModuleKnowledge = {
  description: string;
  keyRules: string[];
  commonFlows: string[];
  troubleshooting: string[];
  relatedRoutes: string[];
};

export const WIAN_KNOWLEDGE: Record<string, ModuleKnowledge> = {
  // -------------------------------------------------- WhatsApp / Conexões
  whatsapp: {
    description:
      "Módulo de conexões de números. A Wiize tem 2 APIs: Evolution (usada para Aquecimento) e Meta Cloud / WABA (usada para Chat e Campanhas).",
    keyRules: [
      "Todo número Meta Cloud precisa de DDI 55 obrigatório.",
      "Conexão Evolution exige leitura de QR Code; reconectar invalida a sessão antiga.",
      "Tokens Meta podem expirar; o sistema faz health checks periódicos e marca status.",
      "Para campanhas e chat use WABA. Para aquecimento use Evolution.",
    ],
    commonFlows: [
      "Conectar Evolution: WhatsApp → Conexões → 'Conectar Evolution' → ler QR.",
      "Conectar Meta: WhatsApp → Conexões → 'Conectar Meta WhatsApp' → fluxo OAuth da Meta.",
      "Reconectar número desconectado: card do número → botão 'Reconectar'.",
    ],
    troubleshooting: [
      "Status vermelho/amarelo = sessão caiu; clicar em Reconectar.",
      "Token Meta expirado: refazer fluxo OAuth ('Conectar Meta WhatsApp').",
      "Número não aparece após conectar: aguardar 30s e dar refresh.",
    ],
    relatedRoutes: ["/whatsapp", "/whatsapp/conexoes"],
  },

  // -------------------------------------------------- Aquecimento
  warming: {
    description:
      "Aquece números do WhatsApp via Evolution para liberar volumes maiores de envio com segurança.",
    keyRules: [
      "Limites diários crescem por nível de aquecimento. Reset acontece às 08:00.",
      "Cada nível libera mais mensagens/dia até atingir 'hot'.",
      "Pular etapas ou forçar volume aumenta risco de banimento do número.",
    ],
    commonFlows: [
      "Iniciar aquecimento: WhatsApp → Aquecimento → escolher número → Iniciar.",
      "Pausar/retomar: cards no painel de aquecimento.",
    ],
    troubleshooting: [
      "Aquecimento parado: checar se o número Evolution está conectado.",
      "Mensagens/dia abaixo do esperado: nível ainda baixo, é proposital.",
      "Erro de envio: pode ser proxy degradado, sistema reatribui automático.",
    ],
    relatedRoutes: ["/whatsapp/aquecimento"],
  },

  // -------------------------------------------------- Campanhas
  campaigns: {
    description:
      "Disparo em massa de mensagens via Meta Cloud (Outbound) ou via leads do CRM (Relational). Suporta IA na composição ou mensagens customizadas.",
    keyRules: [
      "Delays de segurança são obrigatórios (intervalo + pausa após X contatos).",
      "Status: pending → running → paused/completed/failed.",
      "DDI 55 obrigatório para Meta. Números inválidos viram 'failed'.",
      "Campanhas de IA geram texto único por lead; Custom usa template fixo.",
    ],
    commonFlows: [
      "Criar campanha: Campanhas → Nova Campanha → escolher número → leads → mensagem → revisar → Enviar.",
      "Pausar/retomar: card da campanha → botão Pausar/Retomar.",
      "Reenviar falhas: abrir campanha → ver lista de falhas → botão Reenviar.",
    ],
    troubleshooting: [
      "Campanha não dispara: verificar se número WABA está conectado e não expirou.",
      "Fila travada: pausar 1 min, reconectar número, retomar.",
      "Mensagens lentas: comportamento esperado pelos delays de segurança.",
      "Erro 'sem WhatsApp': remover contato, aquele número não tem WhatsApp ativo.",
    ],
    relatedRoutes: ["/campanhas", "/campanhas/nova"],
  },

  // -------------------------------------------------- CRM
  crm: {
    description:
      "Kanban de leads com estágios customizáveis e scoring automático (0–1000). Leads movem-se sozinhos baseado em interações.",
    keyRules: [
      "CRM é progressivo: leads só avançam de estágio, não voltam (exceto manual).",
      "Estágio 'Prospectado' é protegido: leads novos sempre entram aí.",
      "Score é recalculado por eventos (resposta, mensagem, conversão); limite diário por regra.",
      "Tags são centralizadas em Configurações → Tags do CRM.",
    ],
    commonFlows: [
      "Mover lead: arrastar card no Kanban ou abrir detalhes → escolher novo estágio.",
      "Adicionar nota/tag: abrir lead → aba Notas / Tags.",
      "Importar leads p/ campanha: na criação de campanha → 'Importar do CRM'.",
    ],
    troubleshooting: [
      "Lead duplicado: telefones diferentes não são deduplicados; ajustar manualmente.",
      "Score não muda: regra pode ter atingido limite diário (ver Configurações → Score).",
      "Lead sumiu: verificar filtros aplicados no topo do Kanban.",
    ],
    relatedRoutes: ["/crm"],
  },

  // -------------------------------------------------- Flows
  flows: {
    description:
      "Builder visual de automações de WhatsApp com nós: mensagem, IA, dados, espera, ações CRM, integrações Google.",
    keyRules: [
      "Limite de 3 gerações de fluxo por IA por dia.",
      "Triggers definem quando o fluxo entra em ação (mensagem recebida, palavra-chave, etc.).",
      "Fluxos são filtrados por WABA — escolha o número correto na config.",
      "Não pode haver beco sem saída na geração por IA.",
    ],
    commonFlows: [
      "Criar fluxo: Flows → Novo Fluxo → arrastar nós → conectar → publicar.",
      "Gerar com IA: Flows → 'Gerar com IA' → descrever objetivo.",
      "Testar: botão 'Testar' no canvas envia para um número de teste.",
    ],
    troubleshooting: [
      "Fluxo não dispara: confirmar que está publicado e WABA correto.",
      "Resposta da IA estranha: revisar prompt do nó IA; ajustar contexto.",
      "Limite de geração atingido: aguardar 24h ou criar manualmente.",
    ],
    relatedRoutes: ["/flows", "/flows/novo"],
  },

  // -------------------------------------------------- IA Agents (chat)
  aiAgents: {
    description:
      "Agentes de IA que respondem mensagens de WhatsApp em nome do usuário, com prompt customizado, modelo, limite de chars e roteamento.",
    keyRules: [
      "Modelo padrão é gpt-4o-mini. Custos são suportados pelo plano do user.",
      "Agente é silenciado automaticamente se humano responder (handoff).",
      "Silenciamento dura por estágio do CRM e cooldowns configurados.",
      "Limites de mensagens/dia variam por nível de aquecimento do número.",
    ],
    commonFlows: [
      "Configurar agente: IA Agents → Novo → preencher prompt → vincular WABA.",
      "Reativar agente silenciado: chat do lead → toggle 'IA ativa'.",
    ],
    troubleshooting: [
      "Agente não responde: pode estar silenciado (humano respondeu) ou limite diário batido.",
      "Resposta fora de contexto: revisar system_prompt do agente.",
      "Lead não criado automaticamente: verificar regra de criação de lead nas configs do agente.",
    ],
    relatedRoutes: ["/ia-agents", "/chat"],
  },

  // -------------------------------------------------- Chat
  chat: {
    description:
      "Inbox unificado de conversas WhatsApp por número conectado. Permite responder manual e ver histórico do lead.",
    keyRules: [
      "Quando humano responde, o agente IA daquela conversa é silenciado.",
      "Mídias suportadas: imagem, áudio, documento, vídeo.",
      "Conversas vêm de WABA (Meta Cloud).",
    ],
    commonFlows: [
      "Abrir conversa: Chat → escolher número → clicar no contato.",
      "Ir do lead p/ chat: abrir lead no CRM → botão 'Conversar'.",
    ],
    troubleshooting: [
      "Mensagens não chegam: WABA pode estar desconectado ou webhook offline.",
      "Não consigo enviar mídia: tamanho máximo Meta é 16MB para vídeo, 5MB imagem.",
    ],
    relatedRoutes: ["/chat"],
  },

  // -------------------------------------------------- Oportunidades
  opportunities: {
    description:
      "Motor de prospecção que cruza buscas Google Maps + sinais de pesquisa para gerar leads B2B com score adaptativo por nicho.",
    keyRules: [
      "1 busca = 3 créditos = ~60 leads (multiplicador SERP).",
      "Perfil da empresa é OBRIGATÓRIO antes de prospectar (define ICP).",
      "Score adapta por nicho — médicos pontuam diferente de e-commerce.",
      "Outreach IA monta mensagem em 4 parágrafos.",
    ],
    commonFlows: [
      "Definir perfil: Oportunidades → Perfil da Empresa → preencher.",
      "Prospectar: Oportunidades → buscar nicho/cidade → revisar leads → exportar p/ campanha.",
    ],
    troubleshooting: [
      "Sem leads gerados: refinar busca, abrir região, verificar créditos.",
      "Score baixo demais: ajustar perfil ICP para ficar mais alinhado.",
    ],
    relatedRoutes: ["/oportunidades"],
  },

  // -------------------------------------------------- Billing
  billing: {
    description:
      "Planos Start, Growth e Enterprise (Scale renomeado para Enterprise no UI). Cobrança Stripe (mensal/anual cartão internacional) ou Asaas (PIX/Cartão BR).",
    keyRules: [
      "Trial de 7 dias é gratuito; cartão pode ser exigido conforme política.",
      "Consumo é em 'Oportunidades' (unidade de billing).",
      "Cancelamento é registrado em subscription_cancellations.",
      "Grandfathering: usuários antigos mantêm preço antigo.",
    ],
    commonFlows: [
      "Mudar de plano: Conta → Assinatura → escolher novo plano → checkout.",
      "Cancelar: Conta → Assinatura → Cancelar (formulário de feedback).",
      "Ver fatura: Conta → Assinatura → Faturas.",
    ],
    troubleshooting: [
      "Cobrança duplicada: pode ser intent + invoice; conferir no portal.",
      "Plano não atualiza após pagar: aguardar 1-2 min (webhook) ou refresh.",
      "Trial expirado e app travado: usar checkout para ativar plano pago.",
    ],
    relatedRoutes: ["/conta/assinatura", "/checkout"],
  },

  // -------------------------------------------------- Conta / dados
  account: {
    description: "Dados da conta, perfil, equipe, integrações Google.",
    keyRules: [
      "Auth é Supabase nativo (email/senha + Google).",
      "Reset de senha exige email confirmado.",
      "Google Drive/Calendar/Sheets exigem OAuth próprio dentro de Conta.",
    ],
    commonFlows: [
      "Trocar email/senha: Conta → Perfil.",
      "Conectar Google: Conta → Integrações → Google.",
    ],
    troubleshooting: [
      "Não recebo email: checar spam; checar se email está validado.",
      "Google desconectou: refazer OAuth em Integrações.",
    ],
    relatedRoutes: ["/conta"],
  },
};

// Mapeia categoria da triagem -> chave do knowledge
const CATEGORY_TO_KNOWLEDGE: Record<string, string[]> = {
  campanhas: ["campaigns", "whatsapp"],
  conexoes: ["whatsapp", "warming"],
  aquecimento: ["warming", "whatsapp"],
  crm: ["crm"],
  ia_agents: ["aiAgents", "chat"],
  chat: ["chat", "aiAgents"],
  flows: ["flows"],
  oportunidades: ["opportunities", "crm"],
  conta: ["account", "billing"],
  financeiro: ["billing"],
  cancelamento: ["billing"],
};

export function getKnowledgeForCategory(categoryId?: string | null): string {
  const keys = (categoryId && CATEGORY_TO_KNOWLEDGE[categoryId]) || [];
  if (!keys.length) return "";
  const blocks = keys
    .map((k) => {
      const m = WIAN_KNOWLEDGE[k];
      if (!m) return "";
      return [
        `### ${k.toUpperCase()}`,
        m.description,
        `Regras-chave:\n- ${m.keyRules.join("\n- ")}`,
        `Fluxos comuns:\n- ${m.commonFlows.join("\n- ")}`,
        `Troubleshooting:\n- ${m.troubleshooting.join("\n- ")}`,
        m.relatedRoutes.length ? `Rotas: ${m.relatedRoutes.join(", ")}` : "",
      ].filter(Boolean).join("\n");
    })
    .filter(Boolean);
  return blocks.join("\n\n");
}

// Snapshot completo (curto) — usado quando user pergunta algo genérico fora da triagem
export function getFullKnowledgeSummary(): string {
  return Object.entries(WIAN_KNOWLEDGE)
    .map(([k, m]) => `### ${k.toUpperCase()}\n${m.description}\nRegras: ${m.keyRules.slice(0, 2).join(" | ")}`)
    .join("\n\n");
}
