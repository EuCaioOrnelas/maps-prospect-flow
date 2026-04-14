import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanyService {
  id: string;
  user_id: string;
  name: string;
  average_ticket: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanyServices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["company-services", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("company_services")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as CompanyService[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const averageTicket = services.length > 0
    ? services.reduce((sum, s) => sum + Number(s.average_ticket), 0) / services.length
    : 0;

  const upsertServices = useMutation({
    mutationFn: async (newServices: { name: string; average_ticket: number; description: string }[]) => {
      if (!user) throw new Error("Not authenticated");

      // Delete existing services
      await supabase
        .from("company_services")
        .delete()
        .eq("user_id", user.id);

      if (newServices.length === 0) return;

      // Insert new ones
      const { error } = await supabase
        .from("company_services")
        .insert(
          newServices.map((s) => ({
            user_id: user.id,
            name: s.name,
            average_ticket: s.average_ticket,
            description: s.description || null,
          }))
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-services"] });
    },
  });

  return { services, averageTicket, isLoading, upsertServices };
}
