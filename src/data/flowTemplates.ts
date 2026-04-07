/**
 * Pre-built WhatsApp flow templates with hardcoded nodes and edges.
 * These bypass the AI generation and create flows instantly.
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
      { id: "n12", type: "end", label: "Fim vendas", config: {}, x: 2240, y: 50 },
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
      { id: "n4", type: "message", label: "FAQ técnico", config: { body_text: "Para problemas técnicos, tente:\n\n1️⃣ Limpar cache do navegador\n2️⃣ Verificar conexão de internet\n3️⃣ Atualizar o aplicativo\n\nIsso resolveu?" }, x: 840, y: 50 },
      { id: "n5", type: "buttons", label: "Resolveu?", config: { body_text: "O problema foi resolvido?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Sim, resolveu!" }, { id: "btn_1", title: "Não resolveu" }] }, x: 1120, y: 50 },
      { id: "n6", type: "message", label: "Resolvido", config: { body_text: "Ótimo! 🎉 Fico feliz em ajudar. Se precisar de algo mais, é só chamar!" }, x: 1400, y: -50 },
      { id: "n7", type: "handoff", label: "Escalonar", config: { handoff_message: "Vou transferir para um especialista que vai resolver isso. Aguarde! 🙏" }, x: 1400, y: 150 },
      { id: "n8", type: "message", label: "Info plano", config: { body_text: "Sobre nossos planos:\n\n📌 Básico — recursos essenciais\n📌 Pro — recursos avançados\n📌 Enterprise — tudo ilimitado\n\nQuer mais detalhes de algum?" }, x: 840, y: 200 },
      { id: "n9", type: "handoff", label: "Atendente", config: { handoff_message: "Transferindo para um atendente humano. Em breve alguém vai te ajudar! 😊" }, x: 840, y: 380 },
      { id: "n10", type: "end", label: "Fim", config: {}, x: 1680, y: 50 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n8", sourceHandle: "btn_1" },
      { source: "n3", target: "n9", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n7", sourceHandle: "btn_1" },
      { source: "n6", target: "n10" },
      { source: "n7", target: "n10" },
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
      { id: "n8", type: "end", label: "Fim", config: {}, x: 1960, y: 0 },
      { id: "n9", type: "wait", label: "Aguardar", config: { wait_time: 2, wait_unit: "hours" }, x: 1400, y: 200 },
      { id: "n10", type: "message", label: "Follow-up", config: { body_text: "Oi! Ainda está por aí? Se tiver um tempinho, adoraria entender melhor sua necessidade 😊" }, x: 1680, y: 200 },
      { id: "n11", type: "message", label: "Sem interesse", config: { body_text: "Tudo bem! Se mudar de ideia, estou à disposição. Tenha um ótimo dia! 🙏" }, x: 840, y: 350 },
      { id: "n12", type: "end", label: "Fim 2", config: {}, x: 1120, y: 350 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n11", sourceHandle: "btn_1" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "yes" },
      { source: "n5", target: "n9", sourceHandle: "no" },
      { source: "n6", target: "n7" },
      { source: "n7", target: "n8" },
      { source: "n9", target: "n10" },
      { source: "n11", target: "n12" },
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
      { id: "n9", type: "end", label: "Fim", config: {}, x: 1680, y: 200 },
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
      { source: "n8", target: "n9" },
    ],
  },

  atendimento: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 250 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 👋 Bem-vindo ao nosso atendimento. Como posso te ajudar hoje?" }, x: 280, y: 250 },
      { id: "n3", type: "buttons", label: "Menu principal", config: { body_text: "Selecione uma opção:", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "💰 Vendas" }, { id: "btn_1", title: "🛠️ Suporte" }, { id: "btn_2", title: "❓ Dúvidas" }] }, x: 560, y: 250 },
      { id: "n4", type: "message", label: "Vendas", config: { body_text: "Ótimo! Vou te apresentar nossas soluções. Nossos planos começam a partir de R$97/mês com teste grátis de 7 dias! 🚀\n\nQuer conhecer os detalhes?" }, x: 840, y: 50 },
      { id: "n5", type: "message", label: "Suporte", config: { body_text: "Entendi! Vou te ajudar a resolver. Pode descrever o problema que está enfrentando? 🔧" }, x: 840, y: 250 },
      { id: "n6", type: "message", label: "Dúvidas", config: { body_text: "Claro! Nossas perguntas frequentes:\n\n1️⃣ Como funciona o teste grátis?\n2️⃣ Posso cancelar a qualquer momento?\n3️⃣ Quais formas de pagamento?\n\nTodas as respostas são SIM! 😄" }, x: 840, y: 450 },
      { id: "n7", type: "handoff", label: "Consultor vendas", config: { handoff_message: "Vou te transferir para nosso consultor de vendas! 😊" }, x: 1120, y: 50 },
      { id: "n8", type: "handoff", label: "Suporte técnico", config: { handoff_message: "Transferindo para o suporte técnico. Aguarde! 🛠️" }, x: 1120, y: 250 },
      { id: "n9", type: "end", label: "Fim", config: {}, x: 1120, y: 450 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n5", sourceHandle: "btn_1" },
      { source: "n3", target: "n6", sourceHandle: "btn_2" },
      { source: "n4", target: "n7" },
      { source: "n5", target: "n8" },
      { source: "n6", target: "n9" },
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
      { id: "n7", type: "wait", label: "Aguardar 24h", config: { wait_time: 24, wait_unit: "hours" }, x: 1400, y: 200 },
      { id: "n8", type: "message", label: "Urgência", config: { body_text: "⏰ Só lembrando que a oferta de 30% expira em poucas horas! Não perca essa oportunidade 😊" }, x: 1680, y: 200 },
      { id: "n9", type: "message", label: "Obrigado", config: { body_text: "Sem problemas! Se mudar de ideia, me chama. Tenha um ótimo dia! 🙏" }, x: 840, y: 350 },
      { id: "n10", type: "end", label: "Fim", config: {}, x: 1960, y: 100 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n9", sourceHandle: "btn_1" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n7", sourceHandle: "btn_1" },
      { source: "n6", target: "n10" },
      { source: "n7", target: "n8" },
      { source: "n8", target: "n10" },
    ],
  },

  academia: {
    nodes: [
      { id: "n1", type: "entry", label: "Entrada", config: {}, x: 0, y: 200 },
      { id: "n2", type: "message", label: "Boas-vindas", config: { body_text: "Olá! 💪 Bem-vindo à nossa academia! Pronto para transformar sua saúde?" }, x: 280, y: 200 },
      { id: "n3", type: "buttons", label: "Opções", config: { body_text: "Como posso te ajudar?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Ver planos" }, { id: "btn_1", title: "Aula experimental" }, { id: "btn_2", title: "Horários" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Planos", config: { body_text: "🏋️ Nossos planos:\n\n📌 *Mensal* — R$89/mês\n📌 *Trimestral* — R$69/mês\n📌 *Anual* — R$49/mês\n\nTodos incluem musculação + aulas coletivas!" }, x: 840, y: 50 },
      { id: "n5", type: "message", label: "Experimental", config: { body_text: "Ótimo! 🎉 Agende sua aula experimental grátis:\n\n📅 Seg a Sex: 6h às 22h\n📅 Sáb: 8h às 14h\n\nQual horário prefere?" }, x: 840, y: 200 },
      { id: "n6", type: "message", label: "Horários", config: { body_text: "⏰ Nossos horários:\n\n🕕 Seg a Sex: 6h às 22h\n🕗 Sáb: 8h às 14h\n🚫 Dom: fechado\n\nAulas coletivas em horários fixos!" }, x: 840, y: 380 },
      { id: "n7", type: "handoff", label: "Matrícula", config: { handoff_message: "Vou te conectar com nossa recepção para finalizar a matrícula! 🏋️" }, x: 1120, y: 50 },
      { id: "n8", type: "end", label: "Fim", config: {}, x: 1120, y: 300 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n5", sourceHandle: "btn_1" },
      { source: "n3", target: "n6", sourceHandle: "btn_2" },
      { source: "n4", target: "n7" },
      { source: "n5", target: "n8" },
      { source: "n6", target: "n8" },
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
      { id: "n3", type: "buttons", label: "Especialidade", config: { body_text: "Qual especialidade você precisa?", interaction_type: "reply_buttons", buttons: [{ id: "btn_0", title: "Clínico geral" }, { id: "btn_1", title: "Dermatologia" }, { id: "btn_2", title: "Outra" }] }, x: 560, y: 200 },
      { id: "n4", type: "message", label: "Disponibilidade", config: { body_text: "Temos horários disponíveis esta semana! 📅\n\nPara agendar, preciso de:\n• Seu nome completo\n• Convênio (se tiver)\n• Preferência de horário" }, x: 840, y: 200 },
      { id: "n5", type: "handoff", label: "Recepção", config: { handoff_message: "Transferindo para nossa recepção para confirmar o agendamento! 📋" }, x: 1120, y: 200 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n4", sourceHandle: "btn_1" },
      { source: "n3", target: "n4", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
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
      { id: "n7", type: "handoff", label: "Orientador", config: { handoff_message: "Vou te conectar com um orientador para tirar todas as dúvidas! 📖" }, x: 1400, y: 300 },
    ],
    edges: [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
      { source: "n3", target: "n4", sourceHandle: "btn_0" },
      { source: "n3", target: "n4", sourceHandle: "btn_1" },
      { source: "n3", target: "n4", sourceHandle: "btn_2" },
      { source: "n4", target: "n5" },
      { source: "n5", target: "n6", sourceHandle: "btn_0" },
      { source: "n5", target: "n7", sourceHandle: "btn_1" },
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
      { id: "n4", type: "message", label: "Novos", config: { body_text: "🚘 *Destaques novos:*\n\n• SUV Sport — a partir de R$89.990\n• Sedan Premium — a partir de R$72.990\n• Hatch City — a partir de R$59.990\n\nQuer agendar um test drive?" }, x: 840, y: 50 },
      { id: "n5", type: "message", label: "Seminovos", config: { body_text: "🔑 Temos +50 seminovos com garantia de fábrica!\n\nTodos revisados e com laudo cautelar. Quer que eu filtre por faixa de preço?" }, x: 840, y: 200 },
      { id: "n6", type: "message", label: "Financiamento", config: { body_text: "💳 Simulação de financiamento:\n\n• Entrada a partir de 20%\n• Parcelas em até 60x\n• Taxa a partir de 0.99% a.m.\n\nQuer simular com um valor específico?" }, x: 840, y: 380 },
      { id: "n7", type: "handoff", label: "Vendedor", config: { handoff_message: "Vou te conectar com um vendedor especialista! 🚗" }, x: 1120, y: 200 },
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
    ],
  },
};

export function getFlowTemplate(templateId: string): FlowTemplate | null {
  return templates[templateId] || null;
}
