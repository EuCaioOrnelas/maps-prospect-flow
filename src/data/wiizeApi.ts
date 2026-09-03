/**
 * Constantes reais do produto Wiize API.
 * 1 Wiize Token = R$ 0,01 (fonte de verdade também no banco: wiize_api_pricing).
 */

export const WIIZE_TOKEN_PRICE = 0.01;

export const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const tokensForAmount = (amount: number) => Math.round(amount / WIIZE_TOKEN_PRICE);
export const brlForTokens = (tokens: number) => tokens * WIIZE_TOKEN_PRICE;

export const MIN_TOPUP_BRL = 20;
export const MAX_TOPUP_BRL = 5000;

export const creditPackages = [
  { amount: 20, label: "Para testar", highlight: false },
  { amount: 50, label: "Mais popular", highlight: true },
  { amount: 200, label: "Para produção", highlight: false },
];

export type PeriodKey = "today" | "7d" | "30d" | "90d";

export const periodOptions: { key: PeriodKey; label: string; days: number }[] = [
  { key: "today", label: "Hoje", days: 1 },
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "90d", label: "90 dias", days: 90 },
];

export type ApiStatus = "available" | "soon";

export interface ApiCatalogItem {
  id: string;
  slug: string;
  name: string;
  status: ApiStatus;
  description: string;
  endpoints: number;
  tagline: string;
}

export const apiCatalog: ApiCatalogItem[] = [
  {
    id: "prospecting",
    slug: "prospecting",
    name: "Prospecting Intelligence API",
    status: "available",
    description: "Encontre empresas, analise leads e gere abordagens comerciais com IA.",
    tagline: "Inteligência de prospecção para o seu sistema",
    endpoints: 3,
  },
  {
    id: "engagement",
    slug: "engagement",
    name: "Engagement Intelligence API",
    status: "soon",
    description: "Entenda sinais de intenção, engajamento e comportamento comercial.",
    tagline: "Sinais de intenção em tempo real",
    endpoints: 0,
  },
  {
    id: "wian",
    slug: "wian",
    name: "Wian API",
    status: "soon",
    description: "Inteligência comercial autônoma para sistemas e agentes.",
    tagline: "Agentes comerciais autônomos",
    endpoints: 0,
  },
];

export const endpointLabels: Record<string, string> = {
  "/v1/prospecting/search": "Busca de empresas",
  "/v1/prospecting/analyze": "Análise e diagnóstico",
  "/v1/prospecting/approach": "Geração de abordagem",
};
