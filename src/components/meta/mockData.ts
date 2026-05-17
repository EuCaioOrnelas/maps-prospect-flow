// Mock-only dataset for Meta Platforms module.
// TODO: replace with real edge function calls integrated to existing Meta Cloud infra.

export const dailyCost = Array.from({ length: 30 }).map((_, i) => ({
  day: `D${i + 1}`,
  cost: Math.round(40 + Math.random() * 80 + Math.sin(i / 3) * 25),
  messages: Math.round(180 + Math.random() * 220),
  responses: Math.round(40 + Math.random() * 90),
}));

export const funnelData = [
  { stage: "Captados", value: 4200 },
  { stage: "Analisados", value: 3100 },
  { stage: "Enviados", value: 2400 },
  { stage: "Respondidos", value: 720 },
  { stage: "Reuniões", value: 168 },
  { stage: "Propostas", value: 92 },
  { stage: "Fechamentos", value: 31 },
];

export const heatmap = Array.from({ length: 7 }).map((_, day) =>
  Array.from({ length: 14 }).map((_, h) => ({
    day,
    hour: h + 7,
    value: Math.round(Math.random() * 80 + (h > 1 && h < 6 ? 40 : 0)),
  }))
);

export const templateCategories = [
  { name: "Marketing", value: 38, color: "hsl(var(--primary))" },
  { name: "Utilitário", value: 24, color: "hsl(262 60% 60%)" },
  { name: "Reabertura", value: 18, color: "hsl(38 92% 50%)" },
  { name: "Follow-up", value: 20, color: "hsl(346 77% 60%)" },
];

export const campaignsPerformance = [
  { id: "1", name: "Frio Odonto Q1", sent: 1240, replies: 312, cost: 624.5, opps: 28, roi: 4.2, status: "active" },
  { id: "2", name: "Frio Estética Q1", sent: 980, replies: 198, cost: 489.0, opps: 19, roi: 3.1, status: "active" },
  { id: "3", name: "Reengajamento Geral", sent: 540, replies: 184, cost: 270.0, opps: 22, roi: 5.6, status: "paused" },
  { id: "4", name: "Black Friday", sent: 2100, replies: 412, cost: 1102.0, opps: 41, roi: 2.8, status: "archived" },
];

export const insights = [
  {
    tone: "positive" as const,
    title: "Janela 9h–11h tem maior taxa de resposta",
    description: "Mensagens enviadas neste horário convertem 38% mais do que a média geral do período.",
  },
  {
    tone: "tip" as const,
    title: "Templates curtos = menor custo por oportunidade",
    description: "Templates abaixo de 180 caracteres geram CPO 22% menor que os longos.",
  },
  {
    tone: "neutral" as const,
    title: "Segmento odontológico responde 3x mais",
    description: "Leads do nicho odontológico têm taxa de resposta de 31%, contra 10% da média.",
  },
  {
    tone: "warning" as const,
    title: "Campanha 'Black Friday' com ROI baixo",
    description: "Custo elevado (R$ 1.102) e ROI 2.8x. Considere ajustar template ou pausar.",
  },
];

export const numbers = [
  {
    id: "n1",
    name: "Comercial Principal",
    phone: "+55 11 99999-1111",
    status: "connected" as const,
    quality: "HIGH" as const,
    tier: "TIER_1K",
    daily: 950,
    limit: 1000,
    verified: true,
  },
  {
    id: "n2",
    name: "Suporte & Pós-venda",
    phone: "+55 11 99999-2222",
    status: "connected" as const,
    quality: "MEDIUM" as const,
    tier: "TIER_10K",
    daily: 4200,
    limit: 10000,
    verified: true,
  },
  {
    id: "n3",
    name: "Reativação",
    phone: "+55 11 99999-3333",
    status: "warning" as const,
    quality: "LOW" as const,
    tier: "TIER_1K",
    daily: 880,
    limit: 1000,
    verified: false,
  },
];

export const templates = [
  { id: "t1", name: "abertura_frio_v3", internal: "abertura fria", metaCat: "MARKETING", lang: "pt_BR", status: "approved", score: 92 },
  { id: "t2", name: "followup_2_dias", internal: "follow-up", metaCat: "UTILITY", lang: "pt_BR", status: "approved", score: 88 },
  { id: "t3", name: "reabertura_24h", internal: "reabertura", metaCat: "MARKETING", lang: "pt_BR", status: "approved", score: 95 },
  { id: "t4", name: "confirma_reuniao", internal: "confirmação", metaCat: "UTILITY", lang: "pt_BR", status: "approved", score: 99 },
  { id: "t5", name: "lembrete_proposta", internal: "proposta", metaCat: "MARKETING", lang: "pt_BR", status: "pending", score: 0 },
  { id: "t6", name: "recuperacao_lead", internal: "recuperação", metaCat: "MARKETING", lang: "pt_BR", status: "rejected", score: 0 },
];

