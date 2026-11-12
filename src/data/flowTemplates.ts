/**
 * Pre-built WhatsApp flow templates with hardcoded nodes and edges.
 * These bypass the AI generation and create flows instantly.
 * 
 * RULES:
 * - Every path MUST end in either a "handoff" or "end" node
 * - All button outputs MUST be connected
 * - All messages MUST have body_text content
 * - All buttons MUST have body_text and buttons array
 * - All handoffs MUST have handoff_message
 * - All waits MUST have wait_time and wait_unit
 * - All conditions MUST have condition_type
 */

export interface TemplateNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, any>;
  x: number;
  y: number;
}

export interface TemplateEdge {
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface FlowTemplate {
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

const templates: Record<string, FlowTemplate> = {
  vendas: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 👋 Que bom ter você aqui. Somos especialistas em soluções para o seu negócio. Posso te ajudar a encontrar o plano ideal?" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Interesse", config: { body_text: "O que você procura?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Ver planos" }, { id: "btn_1", title: "Falar com vendas" }, { id: "btn_2", title: "Não tenho interesse" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Apresentação", config: { body_text: "Temos os seguintes planos:\n\n📌 *Básico* — R$97/mês\n📌 *Profissional* — R$197/mês\n📌 *Empresarial* — R$397/mês\n\nTodos com 7 dias de teste grátis!" }, x: 840, y: 50 },
      { id: "n5", type: "buttons", label: "Qual plano?", config: { body_text: "Qual plano te interessa mais?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Básico" }, { id: "btn_1", title: "Profissional" }, { id: "btn_2", title: "Empresarial" }] }, x: 1120, y: 50 },
      { id: "n6", type: "message", label: "Link pagamento", config: { body_text: "Ótima escolha! 🎉 Segue o link para começar seu teste grátis de 7 dias:\n\n🔗 [link de pagamento]\n\nQualquer dúvida, estou aqui!" }, x: 1400, y: 50 },
      { id: "n7", type: "handoff", label: "Vendas humano", config: { handoff_message: "Vou te transferir para um consultor de vendas. Aguarde um momento! 😊" }, x: 840, y: 200 },
      { id: "n8", type: "message", label: "Sem interesse", config: { body_text: "Sem problemas! Se mudar de ideia, estamos aqui. Tenha um ótimo dia! 🙏" }, x: 840, y: 380 },
      { id: "n9", type: "end", label: "Fim", config: {}, x: 1120, y: 380 },
      { id: "n10", type: "wait", label: "Follow-up", config: { wait_time: 24, wait_unit: "hours" }, x: 1680, y: 50 },
      { id: "n11", type: "message", label: "Lembrete", config: { body_text: "Oi! Vi que você demonstrou interesse no nosso plano. Posso te ajudar com alguma dúvida? 😊" }, x: 1960, y: 50 },
      { id: "n12", type: "handoff", label: "Consultor", config: { handoff_message: "Vou te conectar com um consultor para te ajudar com os próximos passos! 🚀" }, x: 2240, y: 50 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n7", sourceHandle: "btn_1" },
      { source: "n3", target: "n8", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n6", sourceHandle: "btn_1" },
      { source: "n5", target: "n6", sourceHandle: "btn_2" },
      { source: "n6", target: "n10" },
      { source: "n8", target: "n9" },
      { source: "n10", target: "n11" },
      { source: "n11", target: "n12" },
    ],
  },

  suporte: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 🛠️ Bem-vindo ao nosso suporte. Vou te ajudar a resolver sua questão rapidamente." }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Tipo problema", config: { body_text: "Qual o tipo do seu problema?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Problema técnico" }, { id: "btn_1", title: "Dúvida sobre plano" }, { id: "btn_2", title: "Falar com atendente" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "FAQ técnico", config: { body_text: "Para problemas técnicos, tente:\n\n1️⃣ Limpar cache do navegador\n2️⃣ Verificar conexão de internet\n3️⃣ Atualizar o aplicativo\n\nIsso resolveu?" }, x: 840, y: 0 },
      { id: "n5", type: "buttons", label: "Resolveu?", config: { body_text: "O problema foi resolvido?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, resolveu!" }, { id: "btn_1", title: "Não resolveu" }] }, x: 1120, y: 0 },
      { id: "n6", type: "message", label: "Resolvido", config: { body_text: "Ótimo! 🎉 Fico feliz em ajudar. Se precisar de algo mais, é só chamar!" }, x: 1400, y: -100 },
      { id: "n7", type: "handoff", label: "Escalonar", config: { handoff_message: "Vou transferir para um especialista que vai resolver isso. Aguarde! 🙏" }, x: 1400, y: 100 },
      { id: "n8", type: "message", label: "Info plano", config: { body_text: "Sobre nossos planos:\n\n📌 Básico — recursos essenciais\n📌 Pro — recursos avançados\n📌 Enterprise — tudo ilimitado\n\nQuer saber mais detalhes ou falar com alguém?" }, x: 840, y: 200 },
      { id: "n9", type: "buttons", label: "Ação plano", config: { body_text: "Como posso te ajudar?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Quero assinar" }, { id: "btn_1", title: "Falar com alguém" }] }, x: 1120, y: 200 },
      { id: "n10", type: "handoff", label: "Vendas", config: { handoff_message: "Transferindo para nosso time de vendas para te ajudar com a assinatura! 💳" }, x: 1400, y: 200 },
      { id: "n11", type: "handoff", label: "Atendente", config: { handoff_message: "Transferindo para um atendente humano. Em breve alguém vai te ajudar! 😊" }, x: 840, y: 400 },
      { id: "n12", type: "end", label: "Fim", config: {}, x: 1680, y: -100 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n8", sourceHandle: "btn_1" },
      { source: "n3", target: "n11", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n7", sourceHandle: "btn_1" },
      { source: "n6", target: "n12" },
      { source: "n8", target: "n9" },
      { source: "n9", target: "n10", sourceHandle: "btn_0" },
      { source: "n9", target: "n10", sourceHandle: "btn_1" },
    ],
  },

  captacao: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Abordagem", config: { body_text: "Olá! 👋 Vi que você pode se beneficiar das nossas soluções. Posso fazer algumas perguntas rápidas para entender melhor sua necessidade?" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Aceita?", config: { body_text: "Topa bater um papo rápido?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, vamos lá!" }, { id: "btn_1", title: "Agora não" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Pergunta 1", config: { body_text: "Qual é o seu segmento de atuação?" }, x: 840, y: 100 },
      { id: "n5", type: "condition", label: "Respondeu?", config: { condition_type: "responded" }, x: 1120, y: 100 },
      { id: "n6", type: "message", label: "Pergunta 2", config: { body_text: "Quantas pessoas tem na sua equipe?" }, x: 1400, y: 0 },
      { id: "n7", type: "message", label: "Agendar", config: { body_text: "Perfeito! Com base nas suas respostas, acho que podemos te ajudar muito. Que tal agendar uma reunião de 15 min com nosso especialista?\n\n📅 Acesse: [link de agendamento]" }, x: 1680, y: 0 },
      { id: "n8", type: "handoff", label: "Especialista", config: { handoff_message: "Vou te conectar com nosso especialista para dar continuidade! 🚀" }, x: 1960, y: 0 },
      { id: "n9", type: "wait", label: "Aguardar 2h", config: { wait_time: 2, wait_unit: "hours" }, x: 1400, y: 200 },
      { id: "n10", type: "message", label: "Follow-up", config: { body_text: "Oi! Ainda está por aí? Se tiver um tempinho, adoraria entender melhor sua necessidade 😊" }, x: 1680, y: 200 },
      { id: "n11", type: "handoff", label: "Consultor", config: { handoff_message: "Vou te conectar com um consultor para te ajudar pessoalmente! 😊" }, x: 1960, y: 200 },
      { id: "n12", type: "message", label: "Sem interesse", config: { body_text: "Tudo bem! Se mudar de ideia, estou à disposição. Tenha um ótimo dia! 🙏" }, x: 840, y: 350 },
      { id: "n13", type: "end", label: "Fim", config: {}, x: 1120, y: 350 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n12", sourceHandle: "btn_1" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "yes" },
      { source: "n5", target: "n9", sourceHandle: "no" },
      { source: "n6", target: "n7" },
      { source: "n7", target: "n8" },
      { source: "n9", target: "n10" },
      { source: "n10", target: "n11" },
      { source: "n12", target: "n13" },
    ],
  },

  proposta: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Proposta", config: { body_text: "Olá! 📄 Conforme combinamos, segue sua proposta comercial personalizada:\n\n🔗 [link da proposta]\n\nFique à vontade para analisar com calma!" }, x: 280, y: 200 },
      { id: "n3", type: "wait", label: "Aguardar 4h", config: { wait_time: 4, wait_unit: "hours" }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Follow-up 1", config: { body_text: "Oi! Conseguiu dar uma olhada na proposta? Tem alguma dúvida que eu possa esclarecer? 😊" }, x: 840, y: 200 },
      { id: "n5", type: "buttons", label: "Decisão", config: { body_text: "O que achou?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Quero fechar!" }, { id: "btn_1", title: "Tenho dúvidas" }, { id: "btn_2", title: "Não tenho interesse" }] }, x: 1120, y: 200 },
      { id: "n6", type: "message", label: "Fechamento", config: { body_text: "Excelente decisão! 🎉 Segue o link para finalizar:\n\n🔗 [link de pagamento]\n\nBem-vindo(a) ao time!" }, x: 1400, y: 50 },
      { id: "n7", type: "handoff", label: "Tirar dúvidas", config: { handoff_message: "Vou te conectar com nosso consultor para esclarecer todas as dúvidas! 🙏" }, x: 1400, y: 200 },
      { id: "n8", type: "message", label: "Sem interesse", config: { body_text: "Entendo! Obrigado pelo seu tempo. Se mudar de ideia, a proposta segue válida por 7 dias. 🙏" }, x: 1400, y: 380 },
      { id: "n9", type: "end", label: "Fim fechamento", config: {}, x: 1680, y: 50 },
      { id: "n10", type: "end", label: "Fim recusa", config: {}, x: 1680, y: 380 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n7", sourceHandle: "btn_1" },
      { source: "n5", target: "n8", sourceHandle: "btn_2" },
      { source: "n6", target: "n9" },
      { source: "n8", target: "n10" },
    ],
  },

  atendimento: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 250 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 👋 Bem-vindo ao nosso atendimento. Como posso te ajudar hoje?" }, x: 280, y: 250 },
      { id: "n3", type: "buttons", label: "Menu principal", config: { body_text: "Selecione uma opção:", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "💰 Vendas" }, { id: "btn_1", title: "🛠️ Suporte" }, { id: "btn_2", title: "❓ Dúvidas" }] }, x: 560, y: 250 },
      { id: "n4", type: "message", label: "Vendas", config: { body_text: "Ótimo! Vou te apresentar nossas soluções. Nossos planos começam a partir de R$97/mês com teste grátis de 7 dias! 🚀\n\nQuer conhecer os detalhes?" }, x: 840, y: 50 },
      { id: "n5", type: "handoff", label: "Consultor vendas", config: { handoff_message: "Vou te transferir para nosso consultor de vendas! 😊" }, x: 1120, y: 50 },
      { id: "n6", type: "message", label: "Suporte", config: { body_text: "Entendi! Vou te ajudar a resolver. Pode descrever o problema que está enfrentando? 🔧" }, x: 840, y: 250 },
      { id: "n7", type: "handoff", label: "Suporte técnico", config: { handoff_message: "Transferindo para o suporte técnico. Aguarde! 🛠️" }, x: 1120, y: 250 },
      { id: "n8", type: "message", label: "Dúvidas", config: { body_text: "Claro! Nossas perguntas frequentes:\n\n1️⃣ Como funciona o teste grátis? — 7 dias sem custo\n2️⃣ Posso cancelar a qualquer momento? — Sim!\n3️⃣ Quais formas de pagamento? — Cartão, Pix e boleto\n\nAlguma outra dúvida?" }, x: 840, y: 450 },
      { id: "n9", type: "buttons", label: "Mais dúvidas?", config: { body_text: "Isso esclareceu sua dúvida?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, obrigado!" }, { id: "btn_1", title: "Falar com alguém" }] }, x: 1120, y: 450 },
      { id: "n10", type: "message", label: "Encerrar", config: { body_text: "Perfeito! Se precisar de mais alguma coisa, é só chamar. Tenha um ótimo dia! 😊" }, x: 1400, y: 380 },
      { id: "n11", type: "end", label: "Fim", config: {}, x: 1680, y: 380 },
      { id: "n12", type: "handoff", label: "Atendente", config: { handoff_message: "Vou te conectar com um atendente para esclarecer suas dúvidas! 😊" }, x: 1400, y: 520 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n6", sourceHandle: "btn_1" },
      { source: "n3", target: "n8", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
      { source: "n6", target: "n7" },
      { source: "n8", target: "n9" },
      { source: "n9", target: "n10", sourceHandle: "btn_0" },
      { source: "n9", target: "n12", sourceHandle: "btn_1" },
      { source: "n10", target: "n11" },
    ],
  },

  campanha: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Engajamento", config: { body_text: "Oi! 🎉 Vi que você respondeu nossa mensagem. Que bom! Posso te contar mais sobre essa oferta especial?" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Interesse", config: { body_text: "Quer saber mais?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, me conte!" }, { id: "btn_1", title: "Não, obrigado" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Oferta", config: { body_text: "🔥 *Oferta exclusiva* para quem respondeu:\n\n✅ 30% de desconto no primeiro mês\n✅ Bônus: consultoria gratuita\n✅ Válida por 48h\n\nQuer aproveitar?" }, x: 840, y: 100 },
      { id: "n5", type: "buttons", label: "Converter", config: { body_text: "O que acha?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Quero aproveitar!" }, { id: "btn_1", title: "Preciso pensar" }] }, x: 1120, y: 100 },
      { id: "n6", type: "message", label: "Link", config: { body_text: "Perfeito! 🎉 Use o link abaixo com o cupom automático:\n\n🔗 [link]\n\nO desconto já está aplicado!" }, x: 1400, y: 0 },
      { id: "n7", type: "end", label: "Fim compra", config: {}, x: 1680, y: 0 },
      { id: "n8", type: "wait", label: "Aguardar 24h", config: { wait_time: 24, wait_unit: "hours" }, x: 1400, y: 200 },
      { id: "n9", type: "message", label: "Urgência", config: { body_text: "⏰ Só lembrando que a oferta de 30% expira em poucas horas! Não perca essa oportunidade 😊\n\n🔗 [link]" }, x: 1680, y: 200 },
      { id: "n10", type: "end", label: "Fim lembrete", config: {}, x: 1960, y: 200 },
      { id: "n11", type: "message", label: "Obrigado", config: { body_text: "Sem problemas! Se mudar de ideia, me chama. Tenha um ótimo dia! 🙏" }, x: 840, y: 350 },
      { id: "n12", type: "end", label: "Fim recusa", config: {}, x: 1120, y: 350 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n11", sourceHandle: "btn_1" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n8", sourceHandle: "btn_1" },
      { source: "n6", target: "n7" },
      { source: "n8", target: "n9" },
      { source: "n9", target: "n10" },
      { source: "n11", target: "n12" },
    ],
  },

  academia: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 💪 Bem-vindo à nossa academia! Pronto para transformar sua saúde?" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Opções", config: { body_text: "Como posso te ajudar?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Ver planos" }, { id: "btn_1", title: "Aula experimental" }, { id: "btn_2", title: "Horários" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Planos", config: { body_text: "🏋️ Nossos planos:\n\n📌 *Mensal* — R$89/mês\n📌 *Trimestral* — R$69/mês\n📌 *Anual* — R$49/mês\n\nTodos incluem musculação + aulas coletivas!" }, x: 840, y: 0 },
      { id: "n5", type: "buttons", label: "Matricular?", config: { body_text: "Quer fazer a matrícula?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, quero!" }, { id: "btn_1", title: "Tenho dúvidas" }] }, x: 1120, y: 0 },
      { id: "n6", type: "handoff", label: "Matrícula", config: { handoff_message: "Vou te conectar com nossa recepção para finalizar a matrícula! 🏋️" }, x: 1400, y: -80 },
      { id: "n7", type: "handoff", label: "Dúvidas", config: { handoff_message: "Vou te conectar com um consultor para tirar todas as dúvidas! 😊" }, x: 1400, y: 80 },
      { id: "n8", type: "message", label: "Experimental", config: { body_text: "Ótimo! 🎉 Agende sua aula experimental grátis:\n\n📅 Seg a Sex: 6h às 22h\n📅 Sáb: 8h às 14h\n\nQual horário prefere?" }, x: 840, y: 200 },
      { id: "n9", type: "handoff", label: "Agendar aula", config: { handoff_message: "Vou te conectar com a recepção para confirmar sua aula experimental! 🎉" }, x: 1120, y: 200 },
      { id: "n10", type: "message", label: "Horários", config: { body_text: "⏰ Nossos horários:\n\n🕕 Seg a Sex: 6h às 22h\n🕗 Sáb: 8h às 14h\n🚫 Dom: fechado\n\nAulas coletivas em horários fixos! Quer agendar uma visita?" }, x: 840, y: 400 },
      { id: "n11", type: "buttons", label: "Visitar?", config: { body_text: "Quer visitar a academia?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, quero visitar" }, { id: "btn_1", title: "Não, obrigado" }] }, x: 1120, y: 400 },
      { id: "n12", type: "handoff", label: "Agendar visita", config: { handoff_message: "Vou te conectar com a recepção para agendar sua visita! 🏋️" }, x: 1400, y: 340 },
      { id: "n13", type: "message", label: "Despedida", config: { body_text: "Sem problemas! Se precisar, é só nos chamar. Bons treinos! 💪" }, x: 1400, y: 460 },
      { id: "n14", type: "end", label: "Fim", config: {}, x: 1680, y: 460 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n8", sourceHandle: "btn_1" },
      { source: "n3", target: "n10", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n7", sourceHandle: "btn_1" },
      { source: "n8", target: "n9" },
      { source: "n10", target: "n11" },
      { source: "n11", target: "n12", sourceHandle: "btn_0" },
      { source: "n11", target: "n13", sourceHandle: "btn_1" },
      { source: "n13", target: "n14" },
    ],
  },

  imobiliaria: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 🏠 Bem-vindo à nossa imobiliária. Vou te ajudar a encontrar o imóvel ideal!" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Tipo imóvel", config: { body_text: "Que tipo de imóvel você procura?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Apartamento" }, { id: "btn_1", title: "Casa" }, { id: "btn_2", title: "Comercial" }] }, x: 560, y: 200 },
      { id: "n4", type: "buttons", label: "Finalidade", config: { body_text: "Para compra ou aluguel?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Comprar" }, { id: "btn_1", title: "Alugar" }] }, x: 840, y: 200 },
      { id: "n5", type: "message", label: "Região", config: { body_text: "Qual região ou bairro de preferência? E qual a faixa de valor?" }, x: 1120, y: 200 },
      { id: "n6", type: "message", label: "Agendamento", config: { body_text: "Perfeito! Temos opções que combinam com o que procura! 🏡\n\nVou agendar uma visita para você conhecer pessoalmente. Qual o melhor dia e horário?" }, x: 1400, y: 200 },
      { id: "n7", type: "handoff", label: "Corretor", config: { handoff_message: "Vou te conectar com um corretor especialista na região! 😊" }, x: 1680, y: 200 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n4", sourceHandle: "btn_1" },
      { source: "n3", target: "n4", sourceHandle: "btn_2" },
      { source: "n4", target: "n5", sourceHandle: "btn_0" },
      { source: "n4", target: "n5", sourceHandle: "btn_1" },
      { source: "n5", target: "n6" },
      { source: "n6", target: "n7" },
    ],
  },

  clinica: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 🏥 Bem-vindo à nossa clínica. Como posso te ajudar?" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Opção", config: { body_text: "Selecione uma opção:", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Agendar consulta" }, { id: "btn_1", title: "Resultados exames" }, { id: "btn_2", title: "Falar com atendente" }] }, x: 560, y: 200 },
      { id: "n4", type: "buttons", label: "Especialidade", config: { body_text: "Qual especialidade você precisa?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Clínico geral" }, { id: "btn_1", title: "Dermatologia" }, { id: "btn_2", title: "Outra" }] }, x: 840, y: 0 },
      { id: "n5", type: "message", label: "Disponibilidade", config: { body_text: "Temos horários disponíveis esta semana! 📅\n\nPara agendar, preciso de:\n• Seu nome completo\n• Convênio (se tiver)\n• Preferência de horário" }, x: 1120, y: 0 },
      { id: "n6", type: "handoff", label: "Recepção agend.", config: { handoff_message: "Transferindo para nossa recepção para confirmar o agendamento! 📋" }, x: 1400, y: 0 },
      { id: "n7", type: "message", label: "Exames", config: { body_text: "Para consultar resultados de exames, preciso do:\n\n• Seu nome completo\n• CPF\n• Data aproximada do exame\n\nPor favor, envie esses dados." }, x: 840, y: 200 },
      { id: "n8", type: "handoff", label: "Recepção exames", config: { handoff_message: "Transferindo para nossa recepção para localizar seus resultados! 🔍" }, x: 1120, y: 200 },
      { id: "n9", type: "handoff", label: "Atendente", config: { handoff_message: "Transferindo para um atendente. Em breve alguém vai te ajudar! 😊" }, x: 840, y: 400 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n7", sourceHandle: "btn_1" },
      { source: "n3", target: "n9", sourceHandle: "btn_2" },
      { source: "n4", target: "n5", sourceHandle: "btn_0" },
      { source: "n4", target: "n5", sourceHandle: "btn_1" },
      { source: "n4", target: "n5", sourceHandle: "btn_2" },
      { source: "n5", target: "n6" },
      { source: "n7", target: "n8" },
    ],
  },

  escola: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 🎓 Bem-vindo! Temos os melhores cursos para impulsionar sua carreira!" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Área", config: { body_text: "Qual área te interessa?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Tecnologia" }, { id: "btn_1", title: "Marketing" }, { id: "btn_2", title: "Gestão" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Cursos", config: { body_text: "Temos ótimas opções nessa área! 📚\n\nTodos os cursos incluem:\n✅ Certificado reconhecido\n✅ Acesso vitalício\n✅ Suporte do professor\n\nQuer conhecer os detalhes?" }, x: 840, y: 200 },
      { id: "n5", type: "buttons", label: "Matrícula", config: { body_text: "Quer se matricular?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, quero!" }, { id: "btn_1", title: "Mais informações" }] }, x: 1120, y: 200 },
      { id: "n6", type: "message", label: "Link matrícula", config: { body_text: "Excelente escolha! 🎉\n\n📝 Faça sua matrícula aqui: [link]\n\nQualquer dúvida, estou à disposição!" }, x: 1400, y: 100 },
      { id: "n7", type: "end", label: "Fim matrícula", config: {}, x: 1680, y: 100 },
      { id: "n8", type: "handoff", label: "Orientador", config: { handoff_message: "Vou te conectar com um orientador para tirar todas as dúvidas! 📖" }, x: 1400, y: 300 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n4", sourceHandle: "btn_1" },
      { source: "n3", target: "n4", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n8", sourceHandle: "btn_1" },
      { source: "n6", target: "n7" },
    ],
  },

  restaurante: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 🍽️ Bem-vindo ao nosso restaurante! Veja nosso cardápio e peça sem sair de casa!" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Cardápio", config: { body_text: "O que você gostaria?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "🍕 Pratos" }, { id: "btn_1", title: "🍹 Bebidas" }, { id: "btn_2", title: "🍰 Sobremesas" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Pratos", config: { body_text: "🍕 *Nossos pratos:*\n\n1. Frango grelhado — R$32\n2. Lasanha — R$38\n3. Salmão — R$45\n4. Salada Caesar — R$28\n\nDigite o número do prato!" }, x: 840, y: 50 },
      { id: "n5", type: "message", label: "Bebidas", config: { body_text: "🍹 *Bebidas:*\n\n1. Suco natural — R$10\n2. Refrigerante — R$8\n3. Água — R$5\n4. Cerveja — R$12\n\nDigite o número!" }, x: 840, y: 200 },
      { id: "n6", type: "message", label: "Sobremesas", config: { body_text: "🍰 *Sobremesas:*\n\n1. Pudim — R$15\n2. Brownie — R$18\n3. Açaí — R$20\n\nDigite o número!" }, x: 840, y: 380 },
      { id: "n7", type: "message", label: "Confirmar", config: { body_text: "Ótima escolha! 📝 Para confirmar seu pedido, preciso do:\n\n📍 Endereço de entrega\n💳 Forma de pagamento (Pix/Cartão/Dinheiro)" }, x: 1120, y: 200 },
      { id: "n8", type: "handoff", label: "Atendente", config: { handoff_message: "Pedido recebido! Um atendente vai confirmar os detalhes. 🛵" }, x: 1400, y: 200 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n5", sourceHandle: "btn_1" },
      { source: "n3", target: "n6", sourceHandle: "btn_2" },
      { source: "n4", target: "n7" },
      { source: "n5", target: "n7" },
      { source: "n6", target: "n7" },
      { source: "n7", target: "n8" },
    ],
  },

  automotivo: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 🚗 Bem-vindo à nossa concessionária! Encontre o veículo perfeito para você!" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Interesse", config: { body_text: "O que procura?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Carros novos" }, { id: "btn_1", title: "Seminovos" }, { id: "btn_2", title: "Financiamento" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Novos", config: { body_text: "🚘 *Destaques novos:*\n\n• SUV Sport — a partir de R$89.990\n• Sedan Premium — a partir de R$72.990\n• Hatch City — a partir de R$59.990\n\nQuer agendar um test drive?" }, x: 840, y: 0 },
      { id: "n5", type: "buttons", label: "Test drive?", config: { body_text: "Quer agendar um test drive?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, agendar!" }, { id: "btn_1", title: "Só informações" }] }, x: 1120, y: 0 },
      { id: "n6", type: "handoff", label: "Agendar test", config: { handoff_message: "Vou te conectar com um vendedor para agendar seu test drive! 🚗" }, x: 1400, y: -80 },
      { id: "n7", type: "handoff", label: "Info vendedor", config: { handoff_message: "Vou te conectar com um vendedor para te passar mais detalhes! 📋" }, x: 1400, y: 80 },
      { id: "n8", type: "message", label: "Seminovos", config: { body_text: "🔑 Temos +50 seminovos com garantia de fábrica!\n\nTodos revisados e com laudo cautelar. Quer que eu filtre por faixa de preço?" }, x: 840, y: 200 },
      { id: "n9", type: "handoff", label: "Vendedor semi", config: { handoff_message: "Vou te conectar com nosso especialista em seminovos! 🔑" }, x: 1120, y: 200 },
      { id: "n10", type: "message", label: "Financiamento", config: { body_text: "💳 Simulação de financiamento:\n\n• Entrada a partir de 20%\n• Parcelas em até 60x\n• Taxa a partir de 0.99% a.m.\n\nQuer simular com um valor específico?" }, x: 840, y: 400 },
      { id: "n11", type: "handoff", label: "Financeiro", config: { handoff_message: "Vou te conectar com nosso consultor financeiro para a simulação! 💳" }, x: 1120, y: 400 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n8", sourceHandle: "btn_1" },
      { source: "n3", target: "n10", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n7", sourceHandle: "btn_1" },
      { source: "n8", target: "n9" },
      { source: "n10", target: "n11" },
    ],
  },

  fu_abordagem: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Abordagem", "config": {"body_text": "Olá, {nome}! Tudo bem? 👋 Aqui é da [sua empresa]. Ajudamos empresas como a sua a [benefício principal]. Faz sentido conversarmos 5 minutinhos?"}, "x": 280, "y": 200}, {"id": "n3", "type": "condition", "label": "Respondeu em 24h?", "config": {"condition_type": "no_response", "timeout_minutes": 1440}, "x": 560, "y": 200}, {"id": "n4", "type": "handoff", "label": "Respondeu", "config": {"handoff_message": "Que ótimo ter seu retorno! Um especialista vai continuar a conversa com você agora. 😊"}, "x": 840, "y": 50}, {"id": "n5", "type": "message", "label": "Follow-up 1", "config": {"body_text": "Oi, {nome}! Passando só para saber se conseguiu ver minha mensagem anterior. Posso te mostrar em poucos minutos como funciona?"}, "x": 840, "y": 250}, {"id": "n6", "type": "condition", "label": "Respondeu em 48h?", "config": {"condition_type": "no_response", "timeout_minutes": 2880}, "x": 1120, "y": 250}, {"id": "n7", "type": "handoff", "label": "Respondeu FU1", "config": {"handoff_message": "Perfeito! Vou te passar para um especialista agora mesmo. 🚀"}, "x": 1400, "y": 120}, {"id": "n8", "type": "message", "label": "Follow-up 2", "config": {"body_text": "{nome}, sei que a rotina é corrida. Separei um exemplo rápido de como ajudamos empresas do seu segmento a [resultado]. Quer que eu te envie?"}, "x": 1400, "y": 320}, {"id": "n9", "type": "condition", "label": "Respondeu em 72h?", "config": {"condition_type": "no_response", "timeout_minutes": 4320}, "x": 1680, "y": 320}, {"id": "n10", "type": "handoff", "label": "Respondeu FU2", "config": {"handoff_message": "Show! Um especialista vai te atender agora. 😊"}, "x": 1960, "y": 200}, {"id": "n11", "type": "message", "label": "Despedida", "config": {"body_text": "Não quero ser inconveniente, então essa é minha última mensagem. Se em algum momento fizer sentido, é só responder aqui. Sucesso! 🙏"}, "x": 1960, "y": 420}, {"id": "n12", "type": "end", "label": "Fim", "config": {}, "x": 2240, "y": 420}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}, {"source": "n3", "target": "n4", "sourceHandle": "yes"}, {"source": "n3", "target": "n5", "sourceHandle": "no"}, {"source": "n5", "target": "n6"}, {"source": "n6", "target": "n7", "sourceHandle": "yes"}, {"source": "n6", "target": "n8", "sourceHandle": "no"}, {"source": "n8", "target": "n9"}, {"source": "n9", "target": "n10", "sourceHandle": "yes"}, {"source": "n9", "target": "n11", "sourceHandle": "no"}, {"source": "n11", "target": "n12"}]},
  fu_proposta: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Mensagem inicial", "config": {"body_text": "Olá, {nome}! 📄 Segue a proposta que conversamos: [link da proposta]. Qualquer dúvida, estou por aqui!"}, "x": 280, "y": 200}, {"id": "n3", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 1440}, "x": 560, "y": 200}, {"id": "n4", "type": "handoff", "label": "Respondeu", "config": {"handoff_message": "Ótimo! Um consultor vai continuar o atendimento agora. 😊"}, "x": 840, "y": 50}, {"id": "n5", "type": "message", "label": "Follow-up 1", "config": {"body_text": "Oi, {nome}! Conseguiu analisar a proposta? Posso esclarecer algum ponto?"}, "x": 840, "y": 250}, {"id": "n6", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 2880}, "x": 1120, "y": 250}, {"id": "n7", "type": "handoff", "label": "Respondeu FU", "config": {"handoff_message": "Ótimo! Um consultor vai continuar o atendimento agora. 😊"}, "x": 1400, "y": 120}, {"id": "n8", "type": "message", "label": "Follow-up final", "config": {"body_text": "{nome}, a condição da proposta é válida até [data]. Quer que eu reserve para você?"}, "x": 1400, "y": 320}, {"id": "n9", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 2880}, "x": 1680, "y": 320}, {"id": "n10", "type": "handoff", "label": "Respondeu final", "config": {"handoff_message": "Ótimo! Um consultor vai continuar o atendimento agora. 😊"}, "x": 1960, "y": 200}, {"id": "n11", "type": "message", "label": "Encerramento", "config": {"body_text": "Vou encerrar esse contato por aqui, mas a proposta continua disponível. Quando quiser retomar, é só responder. 🙏"}, "x": 1960, "y": 420}, {"id": "n12", "type": "end", "label": "Fim", "config": {}, "x": 2240, "y": 420}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}, {"source": "n3", "target": "n4", "sourceHandle": "yes"}, {"source": "n3", "target": "n5", "sourceHandle": "no"}, {"source": "n5", "target": "n6"}, {"source": "n6", "target": "n7", "sourceHandle": "yes"}, {"source": "n6", "target": "n8", "sourceHandle": "no"}, {"source": "n8", "target": "n9"}, {"source": "n9", "target": "n10", "sourceHandle": "yes"}, {"source": "n9", "target": "n11", "sourceHandle": "no"}, {"source": "n11", "target": "n12"}]},
  fu_reativacao: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Mensagem inicial", "config": {"body_text": "Oi, {nome}! Faz um tempo que não conversamos 😊 Temos novidades que podem te interessar. Posso te contar?"}, "x": 280, "y": 200}, {"id": "n3", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 2880}, "x": 560, "y": 200}, {"id": "n4", "type": "handoff", "label": "Respondeu", "config": {"handoff_message": "Que bom te ver de volta! Um atendente vai te ajudar agora. 🎉"}, "x": 840, "y": 50}, {"id": "n5", "type": "message", "label": "Follow-up 1", "config": {"body_text": "{nome}, preparamos uma condição especial para clientes que voltam. Quer saber mais?"}, "x": 840, "y": 250}, {"id": "n6", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 4320}, "x": 1120, "y": 250}, {"id": "n7", "type": "handoff", "label": "Respondeu FU", "config": {"handoff_message": "Que bom te ver de volta! Um atendente vai te ajudar agora. 🎉"}, "x": 1400, "y": 120}, {"id": "n8", "type": "message", "label": "Follow-up final", "config": {"body_text": "Última chamada: a condição especial vale até [data]. Posso te enviar os detalhes?"}, "x": 1400, "y": 320}, {"id": "n9", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 4320}, "x": 1680, "y": 320}, {"id": "n10", "type": "handoff", "label": "Respondeu final", "config": {"handoff_message": "Que bom te ver de volta! Um atendente vai te ajudar agora. 🎉"}, "x": 1960, "y": 200}, {"id": "n11", "type": "message", "label": "Encerramento", "config": {"body_text": "Tudo bem! Fico à disposição sempre que precisar. Até breve! 👋"}, "x": 1960, "y": 420}, {"id": "n12", "type": "end", "label": "Fim", "config": {}, "x": 2240, "y": 420}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}, {"source": "n3", "target": "n4", "sourceHandle": "yes"}, {"source": "n3", "target": "n5", "sourceHandle": "no"}, {"source": "n5", "target": "n6"}, {"source": "n6", "target": "n7", "sourceHandle": "yes"}, {"source": "n6", "target": "n8", "sourceHandle": "no"}, {"source": "n8", "target": "n9"}, {"source": "n9", "target": "n10", "sourceHandle": "yes"}, {"source": "n9", "target": "n11", "sourceHandle": "no"}, {"source": "n11", "target": "n12"}]},
  fu_pos_reuniao: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Mensagem inicial", "config": {"body_text": "Olá, {nome}! Obrigado pela reunião de hoje 🙌 Segue o resumo e os próximos passos: [resumo]. Ficou alguma dúvida?"}, "x": 280, "y": 200}, {"id": "n3", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 1440}, "x": 560, "y": 200}, {"id": "n4", "type": "handoff", "label": "Respondeu", "config": {"handoff_message": "Perfeito! Vou te passar para o responsável continuar. 🚀"}, "x": 840, "y": 50}, {"id": "n5", "type": "message", "label": "Follow-up 1", "config": {"body_text": "Oi, {nome}! Conseguiu alinhar internamente os próximos passos? Posso ajudar em algo?"}, "x": 840, "y": 250}, {"id": "n6", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 2880}, "x": 1120, "y": 250}, {"id": "n7", "type": "handoff", "label": "Respondeu FU", "config": {"handoff_message": "Perfeito! Vou te passar para o responsável continuar. 🚀"}, "x": 1400, "y": 120}, {"id": "n8", "type": "message", "label": "Follow-up final", "config": {"body_text": "{nome}, para não perdermos o timing, podemos marcar uma conversa rápida esta semana?"}, "x": 1400, "y": 320}, {"id": "n9", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 2880}, "x": 1680, "y": 320}, {"id": "n10", "type": "handoff", "label": "Respondeu final", "config": {"handoff_message": "Perfeito! Vou te passar para o responsável continuar. 🚀"}, "x": 1960, "y": 200}, {"id": "n11", "type": "message", "label": "Encerramento", "config": {"body_text": "Vou pausar por aqui. Quando quiser retomar, é só me chamar. Sucesso! 🙏"}, "x": 1960, "y": 420}, {"id": "n12", "type": "end", "label": "Fim", "config": {}, "x": 2240, "y": 420}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}, {"source": "n3", "target": "n4", "sourceHandle": "yes"}, {"source": "n3", "target": "n5", "sourceHandle": "no"}, {"source": "n5", "target": "n6"}, {"source": "n6", "target": "n7", "sourceHandle": "yes"}, {"source": "n6", "target": "n8", "sourceHandle": "no"}, {"source": "n8", "target": "n9"}, {"source": "n9", "target": "n10", "sourceHandle": "yes"}, {"source": "n9", "target": "n11", "sourceHandle": "no"}, {"source": "n11", "target": "n12"}]},
  fu_carrinho: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Mensagem inicial", "config": {"body_text": "Oi, {nome}! Vi que você começou seu pedido mas não finalizou. Posso te ajudar com alguma dúvida? 🛒"}, "x": 280, "y": 200}, {"id": "n3", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 120}, "x": 560, "y": 200}, {"id": "n4", "type": "handoff", "label": "Respondeu", "config": {"handoff_message": "Ótimo! Um atendente vai te ajudar a finalizar agora. 😊"}, "x": 840, "y": 50}, {"id": "n5", "type": "message", "label": "Follow-up 1", "config": {"body_text": "{nome}, seu pedido continua salvo: [link]. Quer ajuda para finalizar?"}, "x": 840, "y": 250}, {"id": "n6", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 1440}, "x": 1120, "y": 250}, {"id": "n7", "type": "handoff", "label": "Respondeu FU", "config": {"handoff_message": "Ótimo! Um atendente vai te ajudar a finalizar agora. 😊"}, "x": 1400, "y": 120}, {"id": "n8", "type": "message", "label": "Follow-up final", "config": {"body_text": "Liberamos um cupom especial para você finalizar hoje: [CUPOM] 🎁"}, "x": 1400, "y": 320}, {"id": "n9", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 1440}, "x": 1680, "y": 320}, {"id": "n10", "type": "handoff", "label": "Respondeu final", "config": {"handoff_message": "Ótimo! Um atendente vai te ajudar a finalizar agora. 😊"}, "x": 1960, "y": 200}, {"id": "n11", "type": "message", "label": "Encerramento", "config": {"body_text": "Tudo bem! Seu pedido fica salvo caso queira voltar. Até mais! 👋"}, "x": 1960, "y": 420}, {"id": "n12", "type": "end", "label": "Fim", "config": {}, "x": 2240, "y": 420}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}, {"source": "n3", "target": "n4", "sourceHandle": "yes"}, {"source": "n3", "target": "n5", "sourceHandle": "no"}, {"source": "n5", "target": "n6"}, {"source": "n6", "target": "n7", "sourceHandle": "yes"}, {"source": "n6", "target": "n8", "sourceHandle": "no"}, {"source": "n8", "target": "n9"}, {"source": "n9", "target": "n10", "sourceHandle": "yes"}, {"source": "n9", "target": "n11", "sourceHandle": "no"}, {"source": "n11", "target": "n12"}]},
  seg_auto: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Boas-vindas", "config": {"body_text": "Olá! 🚗 Vamos fazer sua cotação de seguro auto. São perguntas rápidas!"}, "x": 280, "y": 200}, {"id": "d0", "type": "data_collect", "label": "Nome", "config": {"collect_type": "name", "variable_name": "nome", "prompt_message": "Qual seu nome completo?", "custom_description": "Nome"}, "x": 560, "y": 200}, {"id": "d1", "type": "data_collect", "label": "CPF", "config": {"collect_type": "cpf", "variable_name": "cpf", "prompt_message": "Informe seu CPF:", "custom_description": "CPF"}, "x": 840, "y": 200}, {"id": "d2", "type": "data_collect", "label": "Data de nascimento", "config": {"collect_type": "custom", "variable_name": "nascimento", "prompt_message": "Qual sua data de nascimento?", "custom_description": "Data de nascimento"}, "x": 1120, "y": 200}, {"id": "d3", "type": "data_collect", "label": "CEP pernoite", "config": {"collect_type": "custom", "variable_name": "cep", "prompt_message": "Qual o CEP onde o veículo dorme?", "custom_description": "CEP pernoite"}, "x": 1400, "y": 200}, {"id": "d4", "type": "data_collect", "label": "Veículo", "config": {"collect_type": "custom", "variable_name": "veiculo", "prompt_message": "Qual a marca, modelo e ano do veículo?", "custom_description": "Veículo"}, "x": 1680, "y": 200}, {"id": "d5", "type": "data_collect", "label": "Placa", "config": {"collect_type": "custom", "variable_name": "placa", "prompt_message": "Qual a placa do veículo?", "custom_description": "Placa"}, "x": 1960, "y": 200}, {"id": "d6", "type": "data_collect", "label": "Uso", "config": {"collect_type": "custom", "variable_name": "uso_veiculo", "prompt_message": "O veículo é para uso particular, trabalho ou aplicativo?", "custom_description": "Uso"}, "x": 2240, "y": 200}, {"id": "d7", "type": "data_collect", "label": "Seguro atual", "config": {"collect_type": "custom", "variable_name": "seguro_atual", "prompt_message": "Possui seguro hoje? Se sim, qual seguradora e bônus?", "custom_description": "Seguro atual"}, "x": 2520, "y": 200}, {"id": "d8", "type": "data_collect", "label": "E-mail", "config": {"collect_type": "email", "variable_name": "email", "prompt_message": "Qual seu melhor e-mail para enviar a cotação?", "custom_description": "E-mail"}, "x": 2800, "y": 200}, {"id": "r1", "type": "message", "label": "Resumo", "config": {"body_text": "Perfeito, {nome}! ✅ Recebemos seus dados e já estamos cotando nas melhores seguradoras."}, "x": 3080, "y": 200}, {"id": "r2", "type": "handoff", "label": "Corretor", "config": {"handoff_message": "Um corretor vai te enviar as opções em instantes! 📋"}, "x": 3360, "y": 200}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "d0"}, {"source": "d0", "target": "d1"}, {"source": "d1", "target": "d2"}, {"source": "d2", "target": "d3"}, {"source": "d3", "target": "d4"}, {"source": "d4", "target": "d5"}, {"source": "d5", "target": "d6"}, {"source": "d6", "target": "d7"}, {"source": "d7", "target": "d8"}, {"source": "d8", "target": "r1"}, {"source": "r1", "target": "r2"}]},
  seg_residencial: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Boas-vindas", "config": {"body_text": "Olá! 🏠 Vamos cotar seu seguro residencial."}, "x": 280, "y": 200}, {"id": "d0", "type": "data_collect", "label": "Nome", "config": {"collect_type": "name", "variable_name": "nome", "prompt_message": "Qual seu nome completo?", "custom_description": "Nome"}, "x": 560, "y": 200}, {"id": "d1", "type": "data_collect", "label": "CPF", "config": {"collect_type": "cpf", "variable_name": "cpf", "prompt_message": "Informe seu CPF:", "custom_description": "CPF"}, "x": 840, "y": 200}, {"id": "d2", "type": "data_collect", "label": "Endereço", "config": {"collect_type": "address", "variable_name": "endereco", "prompt_message": "Qual o endereço completo do imóvel?", "custom_description": "Endereço"}, "x": 1120, "y": 200}, {"id": "d3", "type": "data_collect", "label": "Tipo", "config": {"collect_type": "custom", "variable_name": "tipo_imovel", "prompt_message": "É casa ou apartamento? Próprio ou alugado?", "custom_description": "Tipo"}, "x": 1400, "y": 200}, {"id": "d4", "type": "data_collect", "label": "Valor", "config": {"collect_type": "custom", "variable_name": "valor_imovel", "prompt_message": "Qual o valor aproximado do imóvel?", "custom_description": "Valor"}, "x": 1680, "y": 200}, {"id": "d5", "type": "data_collect", "label": "Coberturas", "config": {"collect_type": "custom", "variable_name": "coberturas", "prompt_message": "Deseja coberturas extras? (roubo, danos elétricos, vendaval…)", "custom_description": "Coberturas"}, "x": 1960, "y": 200}, {"id": "d6", "type": "data_collect", "label": "E-mail", "config": {"collect_type": "email", "variable_name": "email", "prompt_message": "Qual seu e-mail para receber a cotação?", "custom_description": "E-mail"}, "x": 2240, "y": 200}, {"id": "r1", "type": "message", "label": "Resumo", "config": {"body_text": "Obrigado, {nome}! ✅ Já estamos preparando sua cotação."}, "x": 2520, "y": 200}, {"id": "r2", "type": "handoff", "label": "Corretor", "config": {"handoff_message": "Um corretor vai te enviar as melhores opções em breve! 🏠"}, "x": 2800, "y": 200}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "d0"}, {"source": "d0", "target": "d1"}, {"source": "d1", "target": "d2"}, {"source": "d2", "target": "d3"}, {"source": "d3", "target": "d4"}, {"source": "d4", "target": "d5"}, {"source": "d5", "target": "d6"}, {"source": "d6", "target": "r1"}, {"source": "r1", "target": "r2"}]},
  seg_vida: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Boas-vindas", "config": {"body_text": "Olá! ❤️ Vamos cotar seu seguro de vida."}, "x": 280, "y": 200}, {"id": "d0", "type": "data_collect", "label": "Nome", "config": {"collect_type": "name", "variable_name": "nome", "prompt_message": "Qual seu nome completo?", "custom_description": "Nome"}, "x": 560, "y": 200}, {"id": "d1", "type": "data_collect", "label": "Nascimento", "config": {"collect_type": "custom", "variable_name": "nascimento", "prompt_message": "Qual sua data de nascimento?", "custom_description": "Nascimento"}, "x": 840, "y": 200}, {"id": "d2", "type": "data_collect", "label": "Profissão", "config": {"collect_type": "custom", "variable_name": "profissao", "prompt_message": "Qual sua profissão?", "custom_description": "Profissão"}, "x": 1120, "y": 200}, {"id": "d3", "type": "data_collect", "label": "Fumante", "config": {"collect_type": "custom", "variable_name": "fumante", "prompt_message": "Você é fumante? (Sim/Não)", "custom_description": "Fumante"}, "x": 1400, "y": 200}, {"id": "d4", "type": "data_collect", "label": "Capital", "config": {"collect_type": "custom", "variable_name": "capital", "prompt_message": "Qual valor de indenização deseja? (ex: R$ 200 mil)", "custom_description": "Capital"}, "x": 1680, "y": 200}, {"id": "d5", "type": "data_collect", "label": "Beneficiários", "config": {"collect_type": "custom", "variable_name": "beneficiarios", "prompt_message": "Quantos beneficiários deseja incluir?", "custom_description": "Beneficiários"}, "x": 1960, "y": 200}, {"id": "d6", "type": "data_collect", "label": "E-mail", "config": {"collect_type": "email", "variable_name": "email", "prompt_message": "Qual seu e-mail?", "custom_description": "E-mail"}, "x": 2240, "y": 200}, {"id": "r1", "type": "message", "label": "Resumo", "config": {"body_text": "Perfeito, {nome}! ✅ Sua cotação está em andamento."}, "x": 2520, "y": 200}, {"id": "r2", "type": "handoff", "label": "Corretor", "config": {"handoff_message": "Um especialista vai te apresentar as opções em instantes! ❤️"}, "x": 2800, "y": 200}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "d0"}, {"source": "d0", "target": "d1"}, {"source": "d1", "target": "d2"}, {"source": "d2", "target": "d3"}, {"source": "d3", "target": "d4"}, {"source": "d4", "target": "d5"}, {"source": "d5", "target": "d6"}, {"source": "d6", "target": "r1"}, {"source": "r1", "target": "r2"}]},
  seg_empresarial: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Boas-vindas", "config": {"body_text": "Olá! 🏢 Vamos cotar o seguro da sua empresa."}, "x": 280, "y": 200}, {"id": "d0", "type": "data_collect", "label": "Responsável", "config": {"collect_type": "name", "variable_name": "nome", "prompt_message": "Qual seu nome?", "custom_description": "Responsável"}, "x": 560, "y": 200}, {"id": "d1", "type": "data_collect", "label": "CNPJ", "config": {"collect_type": "custom", "variable_name": "cnpj", "prompt_message": "Qual o CNPJ da empresa?", "custom_description": "CNPJ"}, "x": 840, "y": 200}, {"id": "d2", "type": "data_collect", "label": "Atividade", "config": {"collect_type": "custom", "variable_name": "atividade", "prompt_message": "Qual o ramo de atividade?", "custom_description": "Atividade"}, "x": 1120, "y": 200}, {"id": "d3", "type": "data_collect", "label": "Endereço", "config": {"collect_type": "address", "variable_name": "endereco", "prompt_message": "Qual o endereço do estabelecimento?", "custom_description": "Endereço"}, "x": 1400, "y": 200}, {"id": "d4", "type": "data_collect", "label": "Funcionários", "config": {"collect_type": "custom", "variable_name": "funcionarios", "prompt_message": "Quantos funcionários a empresa tem?", "custom_description": "Funcionários"}, "x": 1680, "y": 200}, {"id": "d5", "type": "data_collect", "label": "Tipo de seguro", "config": {"collect_type": "custom", "variable_name": "tipo_seguro", "prompt_message": "Qual seguro procura? (patrimonial, frota, RC, saúde, vida em grupo)", "custom_description": "Tipo de seguro"}, "x": 1960, "y": 200}, {"id": "d6", "type": "data_collect", "label": "E-mail", "config": {"collect_type": "email", "variable_name": "email", "prompt_message": "Qual o e-mail para receber a proposta?", "custom_description": "E-mail"}, "x": 2240, "y": 200}, {"id": "r1", "type": "message", "label": "Resumo", "config": {"body_text": "Obrigado, {nome}! ✅ Vamos montar a melhor proposta para sua empresa."}, "x": 2520, "y": 200}, {"id": "r2", "type": "handoff", "label": "Corretor", "config": {"handoff_message": "Um corretor empresarial vai continuar o atendimento! 🏢"}, "x": 2800, "y": 200}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "d0"}, {"source": "d0", "target": "d1"}, {"source": "d1", "target": "d2"}, {"source": "d2", "target": "d3"}, {"source": "d3", "target": "d4"}, {"source": "d4", "target": "d5"}, {"source": "d5", "target": "d6"}, {"source": "d6", "target": "r1"}, {"source": "r1", "target": "r2"}]},
  seg_sinistro: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Acolhimento", "config": {"body_text": "Sentimos muito pelo ocorrido. 🙏 Vamos registrar seu aviso de sinistro com agilidade."}, "x": 280, "y": 200}, {"id": "n3", "type": "buttons", "label": "Urgência", "config": {"body_text": "Há feridos ou risco imediato no local?", "interaction_type": "reply_buttons", "buttons": [{"id": "btn_0", "title": "Sim, emergência"}, {"id": "btn_1", "title": "Não"}]}, "x": 560, "y": 200}, {"id": "n4", "type": "message", "label": "Emergência", "config": {"body_text": "🚨 Ligue AGORA para 192 (SAMU) ou 193 (Bombeiros). Assistência 24h da seguradora: [telefone]. Um atendente vai te acompanhar."}, "x": 840, "y": 40}, {"id": "n5", "type": "handoff", "label": "Plantão", "config": {"handoff_message": "Nosso plantão de sinistros vai te atender imediatamente."}, "x": 1120, "y": 40}, {"id": "d1", "type": "data_collect", "label": "Nome", "config": {"collect_type": "name", "variable_name": "nome", "prompt_message": "Qual o nome do segurado?", "custom_description": "Nome"}, "x": 840, "y": 260}, {"id": "d2", "type": "data_collect", "label": "CPF", "config": {"collect_type": "cpf", "variable_name": "cpf", "prompt_message": "Informe o CPF do segurado:", "custom_description": "CPF"}, "x": 1120, "y": 260}, {"id": "d3", "type": "buttons", "label": "Tipo", "config": {"body_text": "Qual o tipo de sinistro?", "interaction_type": "reply_buttons", "buttons": [{"id": "btn_0", "title": "Auto / Colisão"}, {"id": "btn_1", "title": "Roubo / Furto"}, {"id": "btn_2", "title": "Residencial / Outros"}]}, "x": 1400, "y": 260}, {"id": "d4", "type": "data_collect", "label": "Data e local", "config": {"collect_type": "custom", "variable_name": "data_local", "prompt_message": "Quando e onde aconteceu? (data, hora e endereço)", "custom_description": "Data e local"}, "x": 1680, "y": 260}, {"id": "d5", "type": "data_collect", "label": "Descrição", "config": {"collect_type": "custom", "variable_name": "descricao", "prompt_message": "Descreva brevemente o que aconteceu:", "custom_description": "Descrição"}, "x": 1960, "y": 260}, {"id": "d6", "type": "data_collect", "label": "Boletim", "config": {"collect_type": "custom", "variable_name": "boletim", "prompt_message": "Já fez boletim de ocorrência? Se sim, informe o número:", "custom_description": "Boletim"}, "x": 2240, "y": 260}, {"id": "d7", "type": "message", "label": "Documentos", "config": {"body_text": "📎 Envie aqui fotos do ocorrido, CNH/documento e o B.O., se houver."}, "x": 2520, "y": 260}, {"id": "d8", "type": "message", "label": "Protocolo", "config": {"body_text": "✅ Aviso de sinistro registrado, {nome}! Nossa equipe vai analisar e te orientar nos próximos passos."}, "x": 2800, "y": 260}, {"id": "d9", "type": "handoff", "label": "Analista sinistro", "config": {"handoff_message": "Um analista de sinistros vai assumir seu atendimento agora. 🙏"}, "x": 3080, "y": 260}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}, {"source": "n3", "target": "n4", "sourceHandle": "btn_0"}, {"source": "n3", "target": "d1", "sourceHandle": "btn_1"}, {"source": "n4", "target": "n5"}, {"source": "d1", "target": "d2"}, {"source": "d2", "target": "d3"}, {"source": "d3", "target": "d4", "sourceHandle": "btn_0"}, {"source": "d3", "target": "d4", "sourceHandle": "btn_1"}, {"source": "d3", "target": "d4", "sourceHandle": "btn_2"}, {"source": "d4", "target": "d5"}, {"source": "d5", "target": "d6"}, {"source": "d6", "target": "d7"}, {"source": "d7", "target": "d8"}, {"source": "d8", "target": "d9"}]},
  seg_atendimento: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 250}, {"id": "n2", "type": "message", "label": "Boas-vindas", "config": {"body_text": "Olá! 👋 Bem-vindo à [Corretora]. Como podemos ajudar?"}, "x": 280, "y": 250}, {"id": "n3", "type": "buttons", "label": "Menu", "config": {"body_text": "Escolha uma opção:", "interaction_type": "reply_buttons", "buttons": [{"id": "btn_0", "title": "Fazer cotação"}, {"id": "btn_1", "title": "Já sou cliente"}, {"id": "btn_2", "title": "Sinistro"}]}, "x": 560, "y": 250}, {"id": "n4", "type": "buttons", "label": "Tipo cotação", "config": {"body_text": "Qual seguro deseja cotar?", "interaction_type": "reply_buttons", "buttons": [{"id": "btn_0", "title": "Auto"}, {"id": "btn_1", "title": "Residencial"}, {"id": "btn_2", "title": "Vida / Outros"}]}, "x": 840, "y": 50}, {"id": "n5", "type": "handoff", "label": "Cotação", "config": {"handoff_message": "Um corretor vai fazer sua cotação agora! 📋"}, "x": 1120, "y": 50}, {"id": "n6", "type": "buttons", "label": "Cliente", "config": {"body_text": "Como podemos ajudar?", "interaction_type": "reply_buttons", "buttons": [{"id": "btn_0", "title": "2ª via / boleto"}, {"id": "btn_1", "title": "Alterar apólice"}, {"id": "btn_2", "title": "Outro assunto"}]}, "x": 840, "y": 250}, {"id": "n7", "type": "message", "label": "2ª via", "config": {"body_text": "Para 2ª via, acesse [link] ou informe seu CPF que enviamos aqui. 😊"}, "x": 1120, "y": 180}, {"id": "n8", "type": "data_collect", "label": "CPF", "config": {"collect_type": "cpf", "variable_name": "cpf", "prompt_message": "Informe seu CPF:", "custom_description": "CPF"}, "x": 1400, "y": 180}, {"id": "n9", "type": "handoff", "label": "Atendente", "config": {"handoff_message": "Um atendente vai te ajudar agora! 😊"}, "x": 1680, "y": 250}, {"id": "n10", "type": "handoff", "label": "Sinistro", "config": {"handoff_message": "Vamos te passar para o setor de sinistros imediatamente. 🙏"}, "x": 840, "y": 450}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}, {"source": "n3", "target": "n4", "sourceHandle": "btn_0"}, {"source": "n3", "target": "n6", "sourceHandle": "btn_1"}, {"source": "n3", "target": "n10", "sourceHandle": "btn_2"}, {"source": "n4", "target": "n5", "sourceHandle": "btn_0"}, {"source": "n4", "target": "n5", "sourceHandle": "btn_1"}, {"source": "n4", "target": "n5", "sourceHandle": "btn_2"}, {"source": "n6", "target": "n7", "sourceHandle": "btn_0"}, {"source": "n6", "target": "n9", "sourceHandle": "btn_1"}, {"source": "n6", "target": "n9", "sourceHandle": "btn_2"}, {"source": "n7", "target": "n8"}, {"source": "n8", "target": "n9"}]},
  seg_renovacao: {"nodes": [{"id": "n1", "type": "entry", "label": "Entrada", "config": {}, "x": 0, "y": 200}, {"id": "n2", "type": "message", "label": "Mensagem inicial", "config": {"body_text": "Olá, {nome}! 🔔 Seu seguro vence em [data]. Quer que a gente cote a renovação com as melhores condições?"}, "x": 280, "y": 200}, {"id": "n3", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 1440}, "x": 560, "y": 200}, {"id": "n4", "type": "handoff", "label": "Respondeu", "config": {"handoff_message": "Ótimo! Um corretor vai cuidar da sua renovação agora. ✅"}, "x": 840, "y": 50}, {"id": "n5", "type": "message", "label": "Follow-up 1", "config": {"body_text": "{nome}, faltam poucos dias para o vencimento do seu seguro. Não fique descoberto! Posso renovar para você?"}, "x": 840, "y": 250}, {"id": "n6", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 2880}, "x": 1120, "y": 250}, {"id": "n7", "type": "handoff", "label": "Respondeu FU", "config": {"handoff_message": "Ótimo! Um corretor vai cuidar da sua renovação agora. ✅"}, "x": 1400, "y": 120}, {"id": "n8", "type": "message", "label": "Follow-up final", "config": {"body_text": "⚠️ {nome}, seu seguro vence em breve. Responda aqui para garantirmos sua renovação sem perder o bônus."}, "x": 1400, "y": 320}, {"id": "n9", "type": "condition", "label": "Respondeu?", "config": {"condition_type": "no_response", "timeout_minutes": 2880}, "x": 1680, "y": 320}, {"id": "n10", "type": "handoff", "label": "Respondeu final", "config": {"handoff_message": "Ótimo! Um corretor vai cuidar da sua renovação agora. ✅"}, "x": 1960, "y": 200}, {"id": "n11", "type": "message", "label": "Encerramento", "config": {"body_text": "Tudo bem! Se precisar, é só nos chamar. Fique seguro! 🙏"}, "x": 1960, "y": 420}, {"id": "n12", "type": "end", "label": "Fim", "config": {}, "x": 2240, "y": 420}], "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}, {"source": "n3", "target": "n4", "sourceHandle": "yes"}, {"source": "n3", "target": "n5", "sourceHandle": "no"}, {"source": "n5", "target": "n6"}, {"source": "n6", "target": "n7", "sourceHandle": "yes"}, {"source": "n6", "target": "n8", "sourceHandle": "no"}, {"source": "n8", "target": "n9"}, {"source": "n9", "target": "n10", "sourceHandle": "yes"}, {"source": "n9", "target": "n11", "sourceHandle": "no"}, {"source": "n11", "target": "n12"}]},
};

export function getFlowTemplate(templateId: string): FlowTemplate | null {
  return templates[templateId] || null;
}
