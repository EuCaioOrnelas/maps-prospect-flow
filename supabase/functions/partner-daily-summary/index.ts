// Cron diário: envia um único e-mail por parceiro com o resumo do dia
// (leads novos, novos clientes, renovações, comissões liberadas e saldo).
// Roda às 21h BRT (00h UTC). Pula parceiros sem nenhuma movimentação no dia.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PartnerRow {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
}

function startOfBrDay(now: Date): Date {
  // 00:00 BRT = 03:00 UTC do mesmo dia (BRT = UTC-3, sem horário de verão)
  const brNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const y = brNow.getUTCFullYear();
  const m = brNow.getUTCMonth();
  const d = brNow.getUTCDate();
  return new Date(Date.UTC(y, m, d, 3, 0, 0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const testEmail = url.searchParams.get("test_email");
    const testPartnerId = url.searchParams.get("partner_id");

    const now = new Date();
    const startUtc = startOfBrDay(now);
    const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
    const dateLabel = new Date(startUtc.getTime() + 3 * 60 * 60 * 1000)
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    // Buscar parceiros ativos
    let q = supabase.from("partners").select("id, email, full_name, status").eq("status", "active");
    if (testPartnerId) q = supabase.from("partners").select("id, email, full_name, status").eq("id", testPartnerId);
    const { data: partners, error: partnersErr } = await q;
    if (partnersErr) throw partnersErr;

    let sent = 0;
    let skipped = 0;

    for (let i = 0; i < (partners || []).length; i++) {
      const partner = (partners as PartnerRow[])[i];
      if (i > 0) await new Promise((r) => setTimeout(r, 600));

      const [leadsRes, salesRes, releasedRes, balanceRes] = await Promise.all([
        supabase
          .from("partner_leads")
          .select("email, name, created_at")
          .eq("partner_id", partner.id)
          .gte("created_at", startUtc.toISOString())
          .lt("created_at", endUtc.toISOString()),
        supabase
          .from("partner_sales")
          .select("amount_cents, is_recurring, paid_at")
          .eq("partner_id", partner.id)
          .gte("paid_at", startUtc.toISOString())
          .lt("paid_at", endUtc.toISOString()),
        supabase
          .from("partner_commissions")
          .select("commission_amount_cents, available_at, status")
          .eq("partner_id", partner.id)
          .eq("status", "available")
          .gte("available_at", startUtc.toISOString())
          .lt("available_at", endUtc.toISOString()),
        supabase.rpc("compute_partner_balance", { p_partner_id: partner.id }),
      ]);

      const leadsList = leadsRes.data || [];
      const sales = salesRes.data || [];
      const released = releasedRes.data || [];
      const balance = (balanceRes.data as { available_cents?: number } | null) || {};

      const newClients = sales.filter((s: any) => !s.is_recurring);
      const renewals = sales.filter((s: any) => !!s.is_recurring);

      const leadsCount = leadsList.length;
      const newClientsCount = newClients.length;
      const newClientsCents = newClients.reduce((a: number, s: any) => a + (s.amount_cents || 0), 0);
      const renewalsCount = renewals.length;
      const renewalsCents = renewals.reduce((a: number, s: any) => a + (s.amount_cents || 0), 0);
      const releasedCount = released.length;
      const releasedCents = released.reduce((a: number, c: any) => a + (c.commission_amount_cents || 0), 0);

      const hasActivity = leadsCount + newClientsCount + renewalsCount + releasedCount > 0;
      if (!hasActivity && !testEmail) {
        skipped++;
        continue;
      }

      const firstName = (partner.full_name || "").split(" ")[0] || "Parceiro";
      const toEmail = testEmail || partner.email;

      try {
        await supabase.functions.invoke("send-partner-email", {
          body: {
            type: "partner_daily_summary",
            to: toEmail,
            data: {
              first_name: firstName,
              date_label: dateLabel,
              leads_count: leadsCount,
              leads_list: leadsList.map((l: any) => ({ email: l.email, name: l.name })),
              new_clients_count: newClientsCount,
              new_clients_cents: newClientsCents,
              renewals_count: renewalsCount,
              renewals_cents: renewalsCents,
              released_count: releasedCount,
              released_cents: releasedCents,
              available_balance_cents: balance.available_cents || 0,
            },
          },
        });
        sent++;
      } catch (e) {
        console.error(`[partner-daily-summary] erro para ${partner.email}:`, e);
      }

      if (testEmail) break;
    }

    return new Response(
      JSON.stringify({ sent, skipped, total: partners?.length || 0, date: dateLabel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[partner-daily-summary] erro:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
