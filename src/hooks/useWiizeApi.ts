import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { periodOptions, type PeriodKey } from "@/data/wiizeApi";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export interface ApiWallet {
  id: string;
  user_id: string;
  balance_tokens: number;
  reserved_tokens: number;
  lifetime_credited_tokens: number;
  lifetime_spent_tokens: number;
  status: string;
  auto_topup_enabled: boolean;
  auto_topup_amount_brl: number;
  auto_topup_threshold_tokens: number;
  auto_topup_monthly_limit_brl: number;
  low_balance_threshold_tokens: number;
}

export function useApiWallet() {
  return useQuery({
    queryKey: ["wiize-api", "wallet"],
    queryFn: async (): Promise<ApiWallet | null> => {
      const uid = await currentUserId();
      if (!uid) return null;
      await supabase.rpc("wiize_api_ensure_wallet", { _user_id: uid });
      const { data, error } = await supabase
        .from("wiize_api_wallets")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ApiWallet;
    },
    staleTime: 15_000,
  });
}

export interface ApiRequestRow {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  tokens_charged: number;
  duration_ms: number | null;
  error_code: string | null;
  environment: string;
  created_at: string;
}

export function useApiRequests(period: PeriodKey) {
  const days = periodOptions.find((p) => p.key === period)?.days ?? 30;
  return useQuery({
    queryKey: ["wiize-api", "requests", period],
    queryFn: async (): Promise<ApiRequestRow[]> => {
      const uid = await currentUserId();
      if (!uid) return [];
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("wiize_api_requests")
        .select("id, endpoint, method, status_code, tokens_charged, duration_ms, error_code, environment, created_at")
        .eq("user_id", uid)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as ApiRequestRow[];
    },
    staleTime: 15_000,
  });
}

export interface ApiTransaction {
  id: string;
  type: string;
  tokens: number;
  amount_brl: number;
  description: string | null;
  balance_after: number;
  created_at: string;
}

export function useApiTransactions() {
  return useQuery({
    queryKey: ["wiize-api", "transactions"],
    queryFn: async (): Promise<ApiTransaction[]> => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("wiize_api_wallet_transactions")
        .select("id, type, tokens, amount_brl, description, balance_after, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ApiTransaction[];
    },
    staleTime: 15_000,
  });
}

export interface ApiTopup {
  id: string;
  amount_brl: number;
  tokens: number;
  status: string;
  method: string;
  pix_payload: string | null;
  pix_qr_image: string | null;
  expires_at: string;
  created_at: string;
}

export function useApiTopups() {
  return useQuery({
    queryKey: ["wiize-api", "topups"],
    queryFn: async (): Promise<ApiTopup[]> => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("wiize_api_topups")
        .select("id, amount_brl, tokens, status, method, pix_payload, pix_qr_image, expires_at, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as ApiTopup[];
    },
    staleTime: 10_000,
  });
}

export function useApiPricing() {
  return useQuery({
    queryKey: ["wiize-api", "pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wiize_api_pricing")
        .select("operation, label, tokens, active")
        .eq("active", true)
        .order("tokens");
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });
}

export interface ApiKeyRow {
  id: string;
  name: string;
  environment: string;
  prefix: string;
  last_four: string | null;
  permissions: string[];
  status: string;
  last_used_at: string | null;
  revoked_at?: string | null;
  created_at: string;
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["wiize-api", "keys"],
    queryFn: async (): Promise<ApiKeyRow[]> => {
      const { data, error } = await supabase.functions.invoke("wiize-api-keys", { body: { action: "list" } });
      if (error) throw error;
      return (data?.keys || []) as ApiKeyRow[];
    },
    staleTime: 10_000,
  });
}

export function useApiKeyMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["wiize-api", "keys"] });

  const create = useMutation({
    mutationFn: async (input: { name: string; environment: "live" | "test"; permissions: string[] }) => {
      const { data, error } = await supabase.functions.invoke("wiize-api-keys", {
        body: { action: "create", ...input },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { key: ApiKeyRow; secret: string };
    },
    onSuccess: invalidate,
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("wiize-api-keys", { body: { action: "revoke", id } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: invalidate,
  });

  const rotate = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("wiize-api-keys", { body: { action: "rotate", id } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { key: ApiKeyRow; secret: string };
    },
    onSuccess: invalidate,
  });

  return { create, revoke, rotate };
}

export function useCreateTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount_brl: number) => {
      const { data, error } = await supabase.functions.invoke("wiize-api-topup", {
        body: { action: "create", amount_brl },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data.topup as ApiTopup;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wiize-api", "topups"] }),
  });
}

export async function checkTopupStatus(id: string) {
  const { data, error } = await supabase.functions.invoke("wiize-api-topup", { body: { action: "status", id } });
  if (error) throw new Error(error.message);
  return String(data?.status || "pending");
}

/** Série diária de tokens/requisições a partir das requisições reais. */
export function buildDailySeries(rows: ApiRequestRow[], days: number) {
  const map = new Map<string, { date: string; tokens: number; requests: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    map.set(key, {
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      tokens: 0,
      requests: 0,
    });
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    const entry = map.get(key);
    if (entry) {
      entry.tokens += r.tokens_charged || 0;
      entry.requests += 1;
    }
  }
  return Array.from(map.values());
}
