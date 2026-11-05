import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SdrProduct } from "@/lib/sdrSales";

export type SdrProductInput = Partial<Omit<SdrProduct, "id" | "owner_user_id" | "user_id" | "created_at" | "updated_at">> & {
  name: string;
};

export function useSdrProducts() {
  const { user, accountOwnerId } = useAuth();
  const [products, setProducts] = useState<SdrProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountOwnerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sdr_products" as any)
      .select("*")
      .eq("owner_user_id", accountOwnerId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[useSdrProducts]", error);
      toast.error("Não foi possível carregar o catálogo.");
    }
    setProducts((data as unknown as SdrProduct[]) ?? []);
    setLoading(false);
  }, [accountOwnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (input: SdrProductInput, id?: string) => {
    if (!user || !accountOwnerId) return false;
    const payload = {
      ...input,
      name: input.name.trim(),
      owner_user_id: accountOwnerId,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };
    const q = id
      ? supabase.from("sdr_products" as any).update(payload).eq("id", id)
      : supabase.from("sdr_products" as any).insert(payload);
    const { error } = await q;
    if (error) {
      console.error("[useSdrProducts] save", error);
      toast.error(error.message || "Não foi possível salvar o produto.");
      return false;
    }
    toast.success(id ? "Produto atualizado." : "Produto cadastrado.");
    await load();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("sdr_products" as any).delete().eq("id", id);
    if (error) {
      console.error("[useSdrProducts] delete", error);
      toast.error("Não foi possível excluir o produto.");
      return false;
    }
    toast.success("Produto excluído.");
    await load();
    return true;
  };

  const toggleActive = async (product: SdrProduct) => {
    const { error } = await supabase
      .from("sdr_products" as any)
      .update({ active: !product.active, updated_at: new Date().toISOString() })
      .eq("id", product.id);
    if (error) {
      toast.error("Não foi possível alterar o status.");
      return;
    }
    await load();
  };

  /** Importa os serviços cadastrados no perfil da empresa para o catálogo. */
  const importFromCompanyServices = async () => {
    if (!user || !accountOwnerId) return 0;
    const { data: services } = await supabase
      .from("company_services")
      .select("name, average_ticket, description")
      .eq("owner_user_id", accountOwnerId);
    const existing = new Set(products.map((p) => p.name.trim().toLowerCase()));
    const toInsert = (services ?? [])
      .filter((s: any) => s?.name && !existing.has(String(s.name).trim().toLowerCase()))
      .map((s: any) => ({
        owner_user_id: accountOwnerId,
        user_id: user.id,
        name: String(s.name).trim(),
        description: s.description || null,
        price_type: s.average_ticket ? "fixed" : "custom",
        price_value: s.average_ticket ? Number(s.average_ticket) : null,
      }));
    if (!toInsert.length) return 0;
    const { error } = await supabase.from("sdr_products" as any).insert(toInsert);
    if (error) {
      console.error("[useSdrProducts] import", error);
      toast.error("Não foi possível importar os serviços.");
      return 0;
    }
    await load();
    return toInsert.length;
  };

  return { products, loading, reload: load, save, remove, toggleActive, importFromCompanyServices };
}
