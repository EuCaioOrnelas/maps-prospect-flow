import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Wiize Central Intelligence — leitura da inteligencia consolidada.
 * Nenhum score e recalculado aqui: o motor (`intel-engine`) e a fonte de verdade.
 */
export interface LeadIntelligence {
  id: string;
  phone_e164: string;
  crm_lead_id: string | null;
  company_name: string | null;
  niche: string | null;
  city: string | null;
  region: string | null;
  fit_score: number;
  engagement_score: number;
  intent_score: number;
  quality_score: number;
  momentum_value: number;
  momentum_state: string;
  risk_score: number;
  opportunity_score: number;
  pattern_match_score: number;
  pattern_matched_key: string | null;
  loss_pattern_match_score: number;
  behaviors: string[];
  compound_signals: string[];
  stage: string;
  next_best_action: string;
  priority: string;
  is_hot: boolean;
  hot_reason: string | null;
  factors: { label: string; impact: number }[];
  risk_factors: { key: string; label: string; weight: number }[];
  diagnosis_summary: string | null;
  computed_at: string;
}

export const NEXT_ACTION_LABELS: Record<string, string> = {
  FIRST_CONTACT: "Iniciar primeiro contato",
  RESPOND_NOW: "Responder agora",
  FOLLOW_UP: "Fazer follow-up",

  REACTIVATE: "Reativar contato",
  HANDLE_OBJECTION: "Tratar objeção",
  SEND_PROPOSAL: "Enviar proposta",
  REQUEST_PAYMENT: "Fechar pagamento",
  QUALIFY: "Qualificar",
  NURTURE: "Nutrir",
  WAIT: "Aguardar",
  DO_NOT_PRIORITIZE: "Não priorizar",
};

export const PRIORITY_LABELS: Record<string, string> = {
  P0: "Crítica",
  P1: "Muito alta",
  P2: "Alta",
  P3: "Média",
  P4: "Baixa",
};

export const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Descoberta",
  QUALIFICATION: "Qualificação",
  CONSIDERATION: "Consideração",
  NEGOTIATION: "Negociação",
  CLOSING: "Fechamento",
  READY_TO_BUY: "Pronto para comprar",
  DISQUALIFIED: "Desqualificado",
};

export const BEHAVIOR_LABELS: Record<string, string> = {
  FAST_RESPONDER: "Responde rápido",
  SLOW_RESPONDER: "Responde devagar",
  HIGH_FREQUENCY: "Muito ativo",
  LOW_FREQUENCY: "Pouco ativo",
  PRICE_SENSITIVE: "Sensível a preço",
  URGENT: "Com urgência",
  HESITANT: "Indeciso",
  RESEARCHER: "Pesquisando",
  DECISION_MAKER: "Decisor",
  NEGOTIATOR: "Negociador",
  READY_TO_BUY: "Pronto para comprar",
  GHOSTING: "Sumiu",
  REACTIVATED: "Reativado",
};

export const MOMENTUM_LABELS: Record<string, string> = {
  STRONGLY_RISING: "Subindo forte",
  RISING: "Subindo",
  STABLE: "Estável",
  DECLINING: "Caindo",
  STRONGLY_DECLINING: "Caindo forte",
};

const key8 = (phone: string) => (phone || "").replace(/\D/g, "").slice(-8);

export function useLeadIntelligence() {
  const { user, accountOwnerId } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["intel-lead-profiles", accountOwnerId],
    queryFn: async () => {
      if (!accountOwnerId) return [] as LeadIntelligence[];
      const { data, error } = await supabase
        .from("intel_lead_profiles")
        .select("*")
        .eq("owner_user_id", accountOwnerId)
        .order("opportunity_score", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LeadIntelligence[];
    },
    enabled: !!user && !!accountOwnerId,
    staleTime: 60_000,
  });

  const profiles = data || [];

  const byPhone = new Map<string, LeadIntelligence>();
  const byLeadId = new Map<string, LeadIntelligence>();
  for (const p of profiles) {
    byPhone.set(key8(p.phone_e164), p);
    if (p.crm_lead_id) byLeadId.set(p.crm_lead_id, p);
  }

  return {
    profiles,
    isLoading,
    refetch,
    getByPhone: (phone: string) => byPhone.get(key8(phone)),
    getByLeadId: (id: string) => byLeadId.get(id),
    hot: profiles.filter((p) => p.is_hot),
  };
}

/** Perfil de um unico lead (usado no detalhe do lead e no chat). */
export function useLeadIntelligenceProfile(phone?: string | null) {
  const { accountOwnerId } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["intel-lead-profile", accountOwnerId, key8(phone || "")],
    queryFn: async () => {
      if (!accountOwnerId || !phone) return null;
      const target = key8(phone);

      // Busca direta pelo sufixo do telefone (evita baixar todos os perfis da conta)
      const { data, error } = await supabase
        .from("intel_lead_profiles")
        .select("*")
        .eq("owner_user_id", accountOwnerId)
        .ilike("phone_e164", `%${target}`)
        .limit(1);
      if (error) throw error;
      const found = (data || [])[0];
      if (found) return found as unknown as LeadIntelligence;

      // Sem perfil ainda: pede ao motor central (nao cria calculo novo, apenas processa este contato)
      try {
        await supabase.functions.invoke("intel-engine", {
          body: { action: "compute_profile", phone_e164: phone },
        });
      } catch {
        return null;
      }

      const { data: after } = await supabase
        .from("intel_lead_profiles")
        .select("*")
        .eq("owner_user_id", accountOwnerId)
        .ilike("phone_e164", `%${target}`)
        .limit(1);

      // Mantem o card do funil em sincronia com o valor recem calculado
      queryClient.invalidateQueries({ queryKey: ["intel-lead-profiles", accountOwnerId] });

      return ((after || [])[0] || null) as unknown as LeadIntelligence | null;
    },
    enabled: !!accountOwnerId && !!phone,
    staleTime: 30_000,
  });
}

/** Padroes historicos da conta (conversao, perda, sumico). */
export function useConversionPatterns() {
  const { accountOwnerId } = useAuth();
  return useQuery({
    queryKey: ["intel-patterns", accountOwnerId],
    queryFn: async () => {
      if (!accountOwnerId) return [];
      const { data, error } = await supabase
        .from("intel_patterns")
        .select("*")
        .eq("owner_user_id", accountOwnerId)
        .order("rate", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!accountOwnerId,
    staleTime: 300_000,
  });
}

/** Dispara o aprendizado com o historico de vendas e leads perdidos da conta. */
export async function trainIntelligenceFromHistory() {
  const { data, error } = await supabase.functions.invoke("intel-engine", {
    body: { action: "backfill_outcomes" },
  });
  if (error) throw error;
  return data;
}

/** Registra o desfecho de um lead para alimentar os padroes historicos. */
export async function recordIntelligenceOutcome(payload: {
  outcome: "CONVERTED" | "LOST" | "NO_CONVERSION";
  crm_lead_id?: string | null;
  deal_id?: string | null;
  phone_e164?: string | null;
  ticket?: number | null;
  days_to_close?: number | null;
}) {
  try {
    await supabase.functions.invoke("intel-engine", {
      body: { action: "record_outcome", ...payload },
    });
  } catch (err) {
    console.debug("intel outcome error", err);
  }
}
