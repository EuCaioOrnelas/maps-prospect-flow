import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderId } from "@/lib/aiProviders";

export type UserCredential = { provider: ProviderId; api_key: string | null; is_active: boolean };

export function useUserAICredentials() {
  return useQuery({
    queryKey: ["user_ai_credentials"],
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: async (): Promise<UserCredential[]> => {
      const { data, error } = await supabase
        .from("user_ai_credentials")
        .select("provider,api_key,is_active");
      if (error) throw error;
      return (data ?? []) as UserCredential[];
    },
  });
}

export function usePrimaryProvider(): ProviderId | null {
  const { data } = useUserAICredentials();
  const active = (data ?? []).filter((c) => c.is_active && c.api_key);
  return (active[0]?.provider as ProviderId) ?? null;
}
