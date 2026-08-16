import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type SaleType = "one_time" | "recurring";
export type SaleStatus = "active" | "expiring" | "expired" | "cancelled" | "renewed";

export interface Sale {
  id: string;
  lead_id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  value: number;
  sale_type: SaleType;
  payment_method: string | null;
  contract_type: string;
  contract_months: number;
  start_date: string;
  expiration_date: string | null;
  status: SaleStatus;
  renewed_at: string | null;
  renewed_from_deal_id: string | null;
  renewal_count: number | null;
  notice_30d_sent_at: string | null;
  notice_15d_sent_at: string | null;
  notice_7d_sent_at: string | null;
  receipt_url: string | null;
  contract_url: string | null;
  closed_at: string;
  notes: string | null;
  responsible_user_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  lead?: {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    phone: string;
    responsible_user_id?: string | null;
  } | null;
}

export interface SaleInput {
  lead_id: string;
  title: string;
  description?: string;
  value: number;
  sale_type: SaleType;
  contract_months?: number | null;
  payment_method?: string | null;
  start_date?: string;
  receipt_url?: string | null;
  contract_url?: string | null;
  notes?: string | null;
  responsible_user_id?: string | null;
}

export const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Event bus local: qualquer instância do hook avisa as outras que houve mudança. */
const SALES_EVENT = "wiize:sales-changed";
const notifySalesChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SALES_EVENT));
};

/** Calcula os KPIs de vendas para uma lista qualquer (permite aplicar filtros antes). */
export const computeSalesMetrics = (sales: Sale[]) => {
  const today = todayISO();
  const totalRevenue = sales.reduce((acc, s) => {
    if (s.sale_type === "one_time") return acc + Number(s.value || 0);
    return acc + Number(s.value || 0) * Number(s.contract_months || 1);
  }, 0);

  const isLive = (s: Sale) =>
    (s.status === "active" || s.status === "expiring") && (!s.expiration_date || s.expiration_date >= today);

  const mrr = sales
    .filter((s) => s.sale_type === "recurring" && isLive(s))
    .reduce((acc, s) => acc + Number(s.value || 0), 0);

  const activeSales = sales.filter(isLive).length;

  const projected12mo = sales
    .filter((s) => s.sale_type === "recurring" && isLive(s))
    .reduce((acc, s) => {
      if (!s.expiration_date) return acc + Number(s.value || 0) * 12;
      const monthsLeft = Math.max(
        0,
        Math.min(
          12,
          Math.ceil(
            (new Date(s.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
          )
        )
      );
      return acc + Number(s.value || 0) * monthsLeft;
    }, 0);

  const expiringSoon = sales
    .filter((s) => {
      if ((s.status !== "active" && s.status !== "expiring") || !s.expiration_date) return false;
      const days = (new Date(s.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 30;
    })
    .sort((a, b) => (a.expiration_date! < b.expiration_date! ? -1 : 1));

  const nextExpiration = expiringSoon[0]?.expiration_date ?? null;

  return { totalRevenue, mrr, activeSales, projected12mo, expiringSoon, nextExpiration };
};


export const useSales = (leadId?: string) => {
  const { user, accountOwnerId } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelIdRef = useRef(crypto.randomUUID());

  const fetchSales = useCallback(async () => {
    if (!user || !accountOwnerId) return;
    setIsLoading(true);
    let query = supabase
      .from("lead_deals")
      .select(`*, lead:leads(id, company_name, contact_name, phone, responsible_user_id)`)
      .eq("owner_user_id", accountOwnerId)
      .order("created_at", { ascending: false });

    if (leadId) query = query.eq("lead_id", leadId);

    const { data, error } = await query;
    if (error) {
      console.error("[useSales] fetch error:", error);
      setSales([]);
    } else {
      setSales((data as unknown as Sale[]) || []);
    }
    setIsLoading(false);
  }, [user, accountOwnerId, leadId]);

  useEffect(() => {
    if (user) fetchSales();
  }, [user, fetchSales]);

  useEffect(() => {
    if (!user || !accountOwnerId) return;
    const channel = supabase
      .channel(`sales-changes-${accountOwnerId}-${leadId || "all"}-${channelIdRef.current}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_deals", filter: `owner_user_id=eq.${accountOwnerId}` },
        () => fetchSales()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, accountOwnerId, leadId, fetchSales]);

  const createSale = useCallback(
    async (input: SaleInput) => {
      if (!user || !accountOwnerId) throw new Error("not_authenticated");
      const contractMonths = input.sale_type === "recurring" ? input.contract_months ?? 1 : 1;
      const { data, error } = await supabase
        .from("lead_deals")
        .insert({
          user_id: user.id,
          owner_user_id: accountOwnerId,
          lead_id: input.lead_id,
          title: input.title,
          description: input.description ?? null,
          value: input.value,
          sale_type: input.sale_type,
          contract_type: input.sale_type === "recurring" ? String(contractMonths) : "one_time",
          contract_months: contractMonths,
          payment_method: input.payment_method ?? null,
          start_date: input.start_date ?? todayISO(),
          receipt_url: input.receipt_url ?? null,
          contract_url: input.contract_url ?? null,
          notes: input.notes ?? null,
          responsible_user_id: input.responsible_user_id ?? null,
          closed_at: new Date().toISOString(),
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      await fetchSales();
      return data as unknown as Sale;
    },
    [user, accountOwnerId, fetchSales]
  );

  const updateSale = useCallback(
    async (id: string, updates: Partial<SaleInput & { status: SaleStatus }>) => {
      if (!user || !accountOwnerId) throw new Error("not_authenticated");
      const { error } = await supabase
        .from("lead_deals")
        .update(updates)
        .eq("id", id)
        .eq("owner_user_id", accountOwnerId);
      if (error) throw error;
      await fetchSales();
    },
    [user, accountOwnerId, fetchSales]
  );

  const deleteSale = useCallback(
    async (id: string) => {
      if (!user || !accountOwnerId) throw new Error("not_authenticated");
      const { error } = await supabase.from("lead_deals").delete().eq("id", id).eq("owner_user_id", accountOwnerId);
      if (error) throw error;
      await fetchSales();
    },
    [user, accountOwnerId, fetchSales]
  );

  /** Renova um contrato: cria o novo contrato e encerra o anterior como vencido. */
  const renewSale = useCallback(
    async (
      sale: Sale,
      input: {
        value: number;
        contract_months: number;
        start_date: string;
        payment_method?: string | null;
        notes?: string | null;
      }
    ) => {
      if (!user || !accountOwnerId) throw new Error("not_authenticated");
      const months = Math.max(1, Number(input.contract_months) || 1);
      const { data, error } = await supabase
        .from("lead_deals")
        .insert({
          user_id: user.id,
          owner_user_id: accountOwnerId,
          lead_id: sale.lead_id,
          title: sale.title,
          description: sale.description ?? null,
          value: input.value,
          sale_type: "recurring",
          contract_type: String(months),
          contract_months: months,
          payment_method: input.payment_method ?? sale.payment_method ?? null,
          start_date: input.start_date || todayISO(),
          notes: input.notes ?? null,
          responsible_user_id: sale.responsible_user_id ?? null,
          closed_at: new Date().toISOString(),
          status: "active",
          renewed_from_deal_id: sale.id,
          renewal_count: (sale.renewal_count ?? 0) + 1,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: closeError } = await supabase
        .from("lead_deals")
        .update({ status: "expired", renewed_at: new Date().toISOString() })
        .eq("id", sale.id)
        .eq("owner_user_id", accountOwnerId);
      if (closeError) throw closeError;

      await fetchSales();
      return data as unknown as Sale;
    },
    [user, accountOwnerId, fetchSales]
  );

  const uploadAttachment = useCallback(
    async (saleId: string, file: File, kind: "receipt" | "contract") => {
      if (!user || !accountOwnerId) throw new Error("not_authenticated");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${accountOwnerId}/${saleId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("sales-attachments").upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      return path;
    },
    [user, accountOwnerId]
  );

  const getAttachmentUrl = useCallback(async (path: string) => {
    const { data } = await supabase.storage.from("sales-attachments").createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  }, []);

  // ============ Métricas ============
  const metrics = useMemo(() => computeSalesMetrics(sales), [sales]);


  return {
    sales,
    isLoading,
    fetchSales,
    createSale,
    updateSale,
    deleteSale,
    renewSale,
    uploadAttachment,
    getAttachmentUrl,
    metrics,
  };
};
