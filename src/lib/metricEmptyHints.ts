/**
 * Frases curtas (1 linha) que explicam quando cada indicador será preenchido.
 * Centralizado para manter os textos específicos e sem repetição.
 */
export const METRIC_EMPTY_HINTS: Record<string, string> = {
  // Meta — visão geral
  "Leads totais": "Preenchido ao importar ou prospectar leads.",
  "Mensagens enviadas": "Será atualizado no primeiro disparo.",
  "Taxa de entrega": "Calculada após as primeiras entregas.",
  "Conversas iniciadas": "Aparece quando um lead abrir conversa.",
  "Leads respondidos": "Depende da primeira resposta recebida.",
  "Taxa de resposta": "Disponível após respostas dos leads.",
  "Conversas reabertas": "Contabiliza retornos após 24h.",
  Oportunidades: "Disponível após gerar oportunidades.",
  "Custo Meta": "Preenchido quando houver cobrança da Meta.",
  "Custo Meta total": "Preenchido quando houver cobrança da Meta.",
  "Custo / mensagem": "Calculado após o primeiro envio.",
  "Custo / resposta": "Depende de custo e respostas registradas.",
  "Custo / oportunidade": "Exige custos e oportunidades no período.",
  "Pipeline estimado": "Preenchido ao informar valores nos leads.",
  "ROI projetado": "Requer pipeline e custo no período.",
  Receita: "Será preenchido após as primeiras vendas.",
  Conversão: "Disponível após gerar oportunidades.",
  Mensagens: "Será atualizado automaticamente.",
};

export function getMetricEmptyHint(label: string, fallback = "Será atualizado automaticamente.") {
  return METRIC_EMPTY_HINTS[label] ?? fallback;
}
