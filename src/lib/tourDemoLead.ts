// Synthetic demo lead used during the guided tour so the user can see
// a fully populated diagnosis and approach message without touching real data.
export function buildTourDemoLead() {
  return {
    id: "__tour_demo_lead__",
    company_name: "Studio Glow Estética & Spa",
    phone: "5511987654321",
    category: "Clínica de Estética",
    city: "São Paulo, SP",
    website: "https://studioglow.com.br",
    google_maps_link: "https://maps.google.com",
    address: "Av. Paulista, 1500 - São Paulo, SP",
    rating: 4.7,
    review_count: 184,
    ai_score: 87,
    opportunity_level: "alta",
    closing_probability: "78%",
    ai_diagnosis:
      "Studio Glow possui forte presença digital e excelente reputação online (4.7 estrelas, 184 avaliações). A clínica demonstra alto potencial de conversão por já investir em marketing, ter equipe estruturada e atender público de classe média/alta. Principal oportunidade: ausência de automação no atendimento via WhatsApp.",
    ai_recommended_action:
      "Abordar com foco em automação de WhatsApp para reduzir tempo de resposta e aumentar conversão de leads em agendamentos.",
    ai_approach_message:
      "Olá! Vi o trabalho do Studio Glow no Google e fiquei impressionado com as 184 avaliações 5 estrelas — claramente vocês entregam um serviço excepcional.\n\nNotei que a clínica tem alta procura e imagino que responder rápido a cada lead no WhatsApp deve ser um desafio diário. Trabalho com clínicas de estética implementando automação de WhatsApp com IA que responde em segundos, qualifica e marca o horário no Google Calendar — sem perder o tom humano da equipe.\n\nClínicas parecidas com a sua aumentaram em 38% o agendamento de novos clientes em 60 dias.\n\nFaz sentido eu te mostrar em 10 minutos como funcionaria no Studio Glow?",
    social_media: { instagram: "@studioglow" },
    phone_numbers: ["+55 11 98765-4321"],
    enrichment_data: {
      score_breakdown: {
        estrutura_digital: 22,
        reputacao: 24,
        acessibilidade: 18,
        potencial_venda: 13,
      },
      pontos_fortes: [
        "Excelente reputação online (4.7 estrelas)",
        "Site profissional com SSL e agendamento",
        "Forte presença no Instagram",
        "Localização premium (Av. Paulista)",
      ],
      pontos_fracos: [
        "Resposta lenta em horários de pico",
        "Sem automação no WhatsApp",
        "Não captura leads do site",
      ],
      justificativa_score:
        "Score alto pela combinação de reputação consolidada, infraestrutura digital madura e claro potencial de aumento de conversão via automação de atendimento.",
    },
    created_at: new Date().toISOString(),
    origin: "oportunidades",
    first_message_sent: false,
    whatsapp_number_id: null,
  } as any;
}
