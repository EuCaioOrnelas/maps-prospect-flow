/**
 * Dados MOCKADOS centralizados do Wiize API.
 * Nenhuma chamada real, nenhuma cobrança real, nenhuma geração real de chaves.
 * Substituir por dados reais quando o backend do produto for implementado.
 */

export const WIIZE_TOKEN_PRICE = 0.15; // R$ por Wiize Token

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const tokensForAmount = (amount: number) => amount / WIIZE_TOKEN_PRICE;

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

export const mockApiCatalog: ApiCatalogItem[] = [
  {
    id: "prospecting",
    slug: "prospecting",
    name: "Prospecting Intelligence API",
    status: "available",
    description:
      "Encontre empresas, analise leads e gere diagnósticos comerciais com IA.",
    tagline: "Inteligência de prospecção para o seu sistema",
    endpoints: 4,
  },
  {
    id: "engagement",
    slug: "engagement",
    name: "Engagement Intelligence API",
    status: "soon",
    description:
      "Entenda sinais de intenção, engajamento e comportamento comercial.",
    tagline: "Sinais de intenção em tempo real",
    endpoints: 0,
  },
  {
    id: "wian",
    slug: "wian",
    name: "Wian API",
    status: "soon",
    description:
      "Inteligência comercial autônoma para sistemas e agentes.",
    tagline: "Agentes comerciais autônomos",
    endpoints: 0,
  },
];

export interface MockBalance {
  balance: number;
  tokensAvailable: number;
  tokensUsedPeriod: number;
  costPeriod: number;
  requestsPeriod: number;
  apisUsed: number;
}

export const mockBalance: MockBalance = {
  balance: 127.5,
  tokensAvailable: 850,
  tokensUsedPeriod: 12430,
  costPeriod: 1864.5,
  requestsPeriod: 3187,
  apisUsed: 1,
};

export type PeriodKey = "today" | "7d" | "30d" | "90d";

export const periodOptions: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

export interface UsagePoint {
  date: string;
  tokens: number;
  requests: number;
}

const buildSeries = (days: number, base: number): UsagePoint[] =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const wave = Math.sin(i / 2.2) * base * 0.28;
    const tokens = Math.max(20, Math.round(base + wave + ((i * 37) % 90)));
    return {
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      tokens,
      requests: Math.round(tokens / 3.9),
    };
  });

export const mockUsageSeries: Record<PeriodKey, UsagePoint[]> = {
  today: buildSeries(1, 410),
  "7d": buildSeries(7, 380),
  "30d": buildSeries(30, 415),
  "90d": buildSeries(90, 430),
};

export const mockUsageByApi = [
  { name: "Prospecting Intelligence API", value: 100 },
];

export interface ActivityItem {
  id: string;
  title: string;
  tokens: number;
  when: string;
  endpoint: string;
}

export const mockRecentActivity: ActivityItem[] = [
  { id: "a1", title: "Análise de empresa", endpoint: "/v1/prospecting/analyze", tokens: 120, when: "há 4 minutos" },
  { id: "a2", title: "Diagnóstico comercial", endpoint: "/v1/prospecting/diagnose", tokens: 250, when: "há 12 minutos" },
  { id: "a3", title: "Geração de abordagem", endpoint: "/v1/prospecting/approach", tokens: 180, when: "há 30 minutos" },
  { id: "a4", title: "Busca de empresas", endpoint: "/v1/prospecting/companies", tokens: 90, when: "há 1 hora" },
  { id: "a5", title: "Análise de empresa", endpoint: "/v1/prospecting/analyze", tokens: 120, when: "há 2 horas" },
];

export interface MockApiKey {
  id: string;
  api: string;
  apiSlug: string;
  name: string;
  environment: "production" | "test";
  maskedKey: string;
  revealedKey: string;
  status: "active" | "revoked";
  createdAt: string;
  lastUsed: string | null;
}

export const mockApiKeys: MockApiKey[] = [
  {
    id: "k1",
    api: "Prospecting Intelligence API",
    apiSlug: "prospecting",
    name: "Minha aplicação",
    environment: "production",
    maskedKey: "wk_live_••••••••••••••••",
    revealedKey: "wk_live_MOCK_0000_apenas_interface",
    status: "active",
    createdAt: "03/09/2026",
    lastUsed: null,
  },
];

export interface UsageRow {
  id: string;
  date: string;
  api: string;
  endpoint: string;
  tokens: number;
  cost: number;
  status: string;
}

export const mockUsageRows: UsageRow[] = [
  { id: "u1", date: "03/09/2026 09:41", api: "Prospecting Intelligence", endpoint: "/analyze", tokens: 120, cost: 18.0, status: "200 OK" },
  { id: "u2", date: "03/09/2026 09:12", api: "Prospecting Intelligence", endpoint: "/diagnose", tokens: 250, cost: 37.5, status: "200 OK" },
  { id: "u3", date: "03/09/2026 08:55", api: "Prospecting Intelligence", endpoint: "/approach", tokens: 180, cost: 27.0, status: "200 OK" },
  { id: "u4", date: "02/09/2026 18:20", api: "Prospecting Intelligence", endpoint: "/companies", tokens: 90, cost: 13.5, status: "200 OK" },
  { id: "u5", date: "02/09/2026 17:02", api: "Prospecting Intelligence", endpoint: "/analyze", tokens: 0, cost: 0, status: "429 Rate limit" },
  { id: "u6", date: "02/09/2026 16:44", api: "Prospecting Intelligence", endpoint: "/diagnose", tokens: 250, cost: 37.5, status: "200 OK" },
  { id: "u7", date: "01/09/2026 11:30", api: "Prospecting Intelligence", endpoint: "/approach", tokens: 0, cost: 0, status: "401 Unauthorized" },
];

export interface Transaction {
  id: string;
  date: string;
  description: string;
  method: "Cartão" | "PIX";
  amount: number;
  status: "Pago" | "Pendente" | "Falhou";
}

export const mockTransactions: Transaction[] = [
  { id: "t1", date: "02/09/2026", description: "Adição de saldo", method: "Cartão", amount: 100, status: "Pago" },
  { id: "t2", date: "24/08/2026", description: "Recarga automática", method: "Cartão", amount: 50, status: "Pago" },
  { id: "t3", date: "12/08/2026", description: "Adição de saldo", method: "PIX", amount: 30, status: "Pago" },
];

export interface PaymentCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

export const mockCards: PaymentCard[] = [
  { id: "c1", brand: "Visa", last4: "4242", expiry: "12/29", isDefault: true },
];

export const mockCreditPackages = [
  { amount: 30, label: "Para começar", highlight: false },
  { amount: 50, label: "Mais popular", highlight: true },
  { amount: 100, label: "Para maior utilização", highlight: false },
];

export const mockAutoReload = {
  enabled: true,
  threshold: 30,
  amount: 50,
  method: "Visa •••• 4242",
};

export interface SessionItem {
  id: string;
  device: string;
  location: string;
  lastAccess: string;
  current: boolean;
}

export const mockSessions: SessionItem[] = [
  { id: "s1", device: "Chrome — Windows", location: "São Paulo, BR", lastAccess: "Agora", current: true },
  { id: "s2", device: "Safari — iPhone", location: "São Paulo, BR", lastAccess: "há 2 dias", current: false },
];

export interface SecurityEvent {
  id: string;
  event: string;
  detail: string;
  when: string;
}

export const mockSecurityActivity: SecurityEvent[] = [
  { id: "e1", event: "Login realizado", detail: "Chrome — Windows", when: "Agora" },
  { id: "e2", event: "API Key criada", detail: "Minha aplicação (production)", when: "há 3 horas" },
  { id: "e3", event: "2FA ativado", detail: "Aplicativo autenticador", when: "há 2 dias" },
  { id: "e4", event: "Senha alterada", detail: "Via painel de segurança", when: "há 9 dias" },
];
