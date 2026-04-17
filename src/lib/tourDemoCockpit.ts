// Synthetic demo data for the guided tour cockpit step.
// Values are intentionally aspirational to communicate the platform's potential.
import { subDays, format } from "date-fns";

export function buildTourDemoCockpit() {
  const today = new Date();

  // Build 30 days of leads-by-day with a clear upward trend
  const leadsByDay = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i);
    // Growth curve: ~30 leads early, ~120 leads at the end
    const base = 30 + Math.round((i / 29) * 90);
    const noise = Math.round(Math.sin(i * 0.6) * 12);
    return { date: format(date, "yyyy-MM-dd"), count: Math.max(10, base + noise) };
  });

  // Cumulative by month (last 6 months) ending at ~2,400 leads accumulated
  const cumulativeByMonth = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    const total = Math.round(280 + i * 420 + Math.random() * 80);
    return {
      month: format(date, "MM/yy"),
      total,
    };
  });
  // Make it strictly increasing
  let running = 0;
  cumulativeByMonth.forEach((m, i) => {
    running += [320, 480, 410, 560, 620, 740][i] || 500;
    m.total = running;
  });

  return {
    // Hero
    financialImpact: 152340, // R$ 152,3k em oportunidades geradas
    financialChange: 38.4,
    leadsGerados: 1840,
    conversasAtivas: 412,
    oportunidadesQuentes: 130,
    cumulativeByMonth,
    leadsByDay,
    estimatedSales: 47,
    averageTicket: 6900,
    opportunitySales: 32,
    scoreSales: 15,
    periodDays: 30,

    // Executive KPIs
    receitaPotencial: 325000, // R$ 325k em receita potencial
    receitaPotencialGrowth: 42.7,
    leadsQuentesHoje: 130,
    leadsQuentesOntem: 108,
    healthStatus: "Operação Saudável",
    healthDetail: "Score médio 642 · 28% leads quentes · gargalo controlado",
    aiMinutesSaved: 52 * 60, // 52h

    // Funnel
    leadsProspected: 1840,
    messagesSent: 1420,
    totalResponses: 386,
    opportunitiesGenerated: 47,

    // Forecast
    scoreBuckets: [
      { label: "Frio (0-200)", count: 380, estimatedSales: 1, revenue: 6900 },
      { label: "Baixo (201-400)", count: 520, estimatedSales: 3, revenue: 20700 },
      { label: "Médio (401-600)", count: 460, estimatedSales: 8, revenue: 55200 },
      { label: "Alto (601-800)", count: 350, estimatedSales: 18, revenue: 124200 },
      { label: "Quente (801-1000)", count: 130, estimatedSales: 17, revenue: 117300 },
    ],
  };
}

// Extra fake leads to display in Gestão when the user's list is empty.
// Wrapped in the same shape used by OpportunitiesManagement.
export function buildTourFillerLeads() {
  const samples = [
    {
      company_name: "Estética Bella Pelle",
      category: "Clínica de Estética",
      city: "Rio de Janeiro, RJ",
      rating: 4.8,
      review_count: 212,
      ai_score: 91,
      opportunity_level: "alta",
      closing_probability: "82%",
      ai_diagnosis: "Clínica premium com forte presença digital, alta procura e equipe estruturada. Maior gargalo está na velocidade de resposta no WhatsApp.",
    },
    {
      company_name: "DentalCare Premium",
      category: "Clínica Odontológica",
      city: "Belo Horizonte, MG",
      rating: 4.6,
      review_count: 156,
      ai_score: 84,
      opportunity_level: "alta",
      closing_probability: "74%",
      ai_diagnosis: "Operação consolidada com pacientes recorrentes. Oportunidade clara em automação de pré-atendimento e remarcação de consultas.",
    },
    {
      company_name: "FitLife Academia",
      category: "Academia",
      city: "Curitiba, PR",
      rating: 4.5,
      review_count: 98,
      ai_score: 76,
      opportunity_level: "media",
      closing_probability: "61%",
      ai_diagnosis: "Academia em crescimento com bom engajamento nas redes. Falta estrutura para qualificar e marcar avaliações dos novos contatos.",
    },
    {
      company_name: "Glow Beauty Spa",
      category: "Spa & Bem-estar",
      city: "Porto Alegre, RS",
      rating: 4.7,
      review_count: 134,
      ai_score: 79,
      opportunity_level: "alta",
      closing_probability: "68%",
      ai_diagnosis: "Marca com excelente reputação local. Demanda alta no fim de semana sem estrutura para responder fora do horário comercial.",
    },
    {
      company_name: "Studio Pilates Vitalis",
      category: "Estúdio de Pilates",
      city: "Florianópolis, SC",
      rating: 4.9,
      review_count: 87,
      ai_score: 73,
      opportunity_level: "media",
      closing_probability: "57%",
      ai_diagnosis: "Atendimento personalizado com fila de espera. Pode capturar mais leads automatizando agendamentos e listas de interesse.",
    },
  ];

  return samples.map((s, i) => ({
    id: `__tour_filler_${i}__`,
    phone: `5511${900000000 + i * 1234567}`,
    website: null,
    google_maps_link: null,
    address: null,
    ai_recommended_action: "Abordagem com foco em automação de WhatsApp e captura de leads.",
    ai_approach_message: null,
    social_media: null,
    phone_numbers: [`+55 11 9${8000 + i}-${1000 + i}`],
    enrichment_data: null,
    created_at: new Date(Date.now() - (i + 1) * 3600 * 1000).toISOString(),
    origin: "oportunidades",
    first_message_sent: false,
    whatsapp_number_id: null,
    ...s,
  })) as any[];
}
