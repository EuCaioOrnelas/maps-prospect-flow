/**
 * Catalog of feature modules that can be granted/revoked per custom subscription.
 * Each entry maps a logical feature key to:
 *  - label (for admin UI)
 *  - routes (for route gating in App.tsx / FeatureGate)
 *  - sidebar item ids (optional, used to hide nav entries)
 */

export type FeatureKey =
  | "dashboard"
  | "sdr_inteligente"
  | "oportunidades"
  | "crm"
  | "chat"
  | "campaigns"
  | "agents"
  | "flows"
  | "reports"
  | "consultoria";


export interface FeatureDef {
  key: FeatureKey;
  label: string;
  description: string;
  routes: string[]; // path prefixes — any pathname starting with one of these is gated by this feature
}

export const FEATURE_CATALOG: FeatureDef[] = [
  {
    key: "dashboard",
    label: "Cockpit / Dashboard",
    description: "Visão geral, métricas executivas e radar de oportunidades.",
    routes: ["/dashboard"],
  },
  {
    // Precisa vir ANTES de "oportunidades" — a rota /oportunidades/sdr é mais específica.
    key: "sdr_inteligente",
    label: "SDR Inteligente (exclusivo Growth IA)",
    description:
      "Agente SDR autônomo que conversa, qualifica, quebra objeções e agenda reuniões no WhatsApp.",
    routes: ["/oportunidades/sdr"],
  },
  {
    key: "oportunidades",
    label: "Oportunidades (Prospecção)",
    description: "Geração de leads via busca inteligente e diagnóstico IA.",
    routes: ["/prospeccao", "/oportunidades", "/reports/prospeccao"],
  },

  {
    key: "crm",
    label: "CRM (Gestão de Leads)",
    description: "Kanban, scoring e gestão de pipeline de vendas.",
    routes: ["/crm"],
  },
  {
    key: "chat",
    label: "Chat WhatsApp",
    description: "Caixa de entrada unificada de conversas WhatsApp.",
    routes: ["/chat"],
  },
  {
    key: "campaigns",
    label: "Campanhas WhatsApp",
    description: "Disparos em massa via Meta Cloud API.",
    routes: ["/meta-campaigns", "/meta-api-guide"],
  },
  {
    key: "agents",
    label: "Agentes IA",
    description: "Agentes de IA para atendimento e qualificação automática.",
    routes: ["/agents"],
  },
  {
    key: "flows",
    label: "Fluxos / Automações",
    description: "Criação de fluxos automáticos com gatilhos e ações.",
    routes: ["/fluxos"],
  },
  {
    key: "reports",
    label: "Relatórios",
    description: "Relatórios de campanhas e agentes.",
    routes: ["/agents/reports"],
  },
  {
    key: "consultoria",
    label: "Consultoria",
    description: "Acesso à área de consultoria especializada.",
    routes: ["/consultoria"],
  },
];

export const FEATURE_KEYS = FEATURE_CATALOG.map((f) => f.key);

/**
 * Given a pathname, return the feature key that gates it (if any).
 */
export function getFeatureForPath(pathname: string): FeatureKey | null {
  for (const f of FEATURE_CATALOG) {
    if (f.routes.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
      return f.key;
    }
  }
  return null;
}

/**
 * Decide if a profile has access to a feature.
 * Rules:
 *  - Non-custom users (is_custom_subscription !== true) → full access.
 *  - Custom users with NULL/empty permissions → full access.
 *  - Custom users with array → must include the feature key.
 */
export function profileHasFeature(
  profile: { is_custom_subscription?: boolean | null; custom_feature_permissions?: any } | null | undefined,
  feature: FeatureKey
): boolean {
  if (!profile) return true; // unknown profile → don't block UI eagerly
  if (!profile.is_custom_subscription) return true;
  const perms = profile.custom_feature_permissions;
  if (!perms || !Array.isArray(perms) || perms.length === 0) return true;
  return perms.includes(feature);
}
