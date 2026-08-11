import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  buildFromAddress,
  isValidEmail,
  renderRenewalEmail,
  type RenewalSettings,
} from "../_shared/renewal-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fmtMoney = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const APP_URL = "https://wiize.com.br";

type NoticeType = "30_days" | "15_days" | "7_days" | "custom_4_6_months";

const NOTICE_COLUMN: Record<NoticeType, string | null> = {
  "30_days": "notice_30d_sent_at",
  "15_days": "notice_15d_sent_at",
  "7_days": "notice_7d_sent_at",
  // Faixa 4–6 meses: regra de negócio ainda NÃO definida oficialmente.
  // Usa a coluna de 7 dias como marcador de "aviso único" enquanto a regra não existir.
  custom_4_6_months: "notice_7d_sent_at",
};

/**
 * Regras de aviso por duração de contrato.
 * - até 3 meses: 1 aviso, 7 dias antes (muda status para "expiring")
 * - acima de 6 meses: 30 dias (muda status) e 15 dias (não muda status)
 * - 4 a 6 meses: REGRA NÃO DEFINIDA PELO NEGÓCIO.
 *   Fica desligada por padrão e só dispara se a conta preencher
 *   `notice_days_4_6_months` nas configurações. TODO: definir regra oficial.
 */
function pickNotice(
  months: number,
  daysLeft: number,
  custom4to6: number | null,
): { type: NoticeType; changesStatus: boolean } | null {
  if (months <= 3) {
    if (daysLeft <= 7) return { type: "7_days", changesStatus: true };
    return null;
  }
  if (months > 6) {
    if (daysLeft <= 15) return { type: "15_days", changesStatus: false };
    if (daysLeft <= 30) return { type: "30_days", changesStatus: true };
    return null;
  }
  // 4 a 6 meses
  if (custom4to6 && custom4to6 > 0 && daysLeft <= custom4to6) {
    return { type: "custom_4_6_months", changesStatus: true };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const summary = { processed: 0, expired: 0, notices: 0, emails: 0, skipped: 0, errors: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // ── 1) Contratos vencidos viram "expired" (independe do aviso estar ativo) ──
    const todayISO = today.toISOString().slice(0, 10);
    const { data: overdue } = await admin
      .from("lead_deals")
      .select("id")
      .eq("sale_type", "recurring")
      .in("status", ["active", "expiring"])
      .not("expiration_date", "is", null)
      .lt("expiration_date", todayISO);

    if (overdue?.length) {
      await admin
        .from("lead_deals")
        .update({ status: "expired" })
        .in("id", overdue.map((d) => d.id));
      summary.expired = overdue.length;
    }

    // ── 2) Contas com aviso de renovação ATIVADO ──────────────────────────────
    const { data: accounts } = await admin.from("crm_renewal_settings").select("*").eq("enabled", true);
    if (!accounts?.length) return json({ success: true, ...summary, reason: "no_enabled_accounts" });

    for (const settings of accounts as (RenewalSettings & { owner_user_id: string })[]) {
      const ownerId = settings.owner_user_id;

      const { data: deals, error: dealsErr } = await admin
        .from("lead_deals")
        .select(
          "id, lead_id, title, value, contract_months, sale_type, start_date, expiration_date, status, responsible_user_id, renewed_at, notice_30d_sent_at, notice_15d_sent_at, notice_7d_sent_at, lead:leads(id, company_name, contact_name, email)",
        )
        .eq("owner_user_id", ownerId)
        .eq("sale_type", "recurring")
        .in("status", ["active", "expiring"])
        .is("renewed_at", null)
        .not("expiration_date", "is", null);

      if (dealsErr) {
        console.error("[crm-renewal-processor] deals error", dealsErr);
        summary.errors++;
        continue;
      }

      // E-mail do owner (fallback interno)
      const { data: ownerProfile } = await admin.from("profiles").select("email, name").eq("id", ownerId).maybeSingle();

      for (const deal of deals || []) {
        summary.processed++;
        const exp = new Date(`${deal.expiration_date}T00:00:00`);
        const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
        if (daysLeft < 0) continue;

        const months = Number(deal.contract_months || 0);
        if (!months) continue;

        const notice = pickNotice(months, daysLeft, settings.notice_days_4_6_months ?? null);
        if (!notice) continue;

        const column = NOTICE_COLUMN[notice.type]!;
        if ((deal as any)[column]) continue; // idempotência por contrato + tipo de aviso

        // Destinatários: cliente + responsável interno (responsável do lead/venda, senão owner)
        const recipients: { email: string; role: string }[] = [];
        const clientEmail = (deal as any).lead?.email as string | null;
        if (isValidEmail(clientEmail)) {
          recipients.push({ email: clientEmail!.trim().toLowerCase(), role: "client" });
        } else {
          await admin.from("crm_renewal_notice_logs").insert({
            owner_user_id: ownerId,
            deal_id: deal.id,
            lead_id: deal.lead_id,
            notice_type: notice.type,
            recipient_email: null,
            recipient_role: "client",
            status: "skipped",
            error_message: "Cliente sem e-mail válido cadastrado",
          });
          summary.skipped++;
        }

        let internalEmail: string | null = null;
        let internalRole = "owner";
        if (deal.responsible_user_id) {
          const { data: resp } = await admin
            .from("profiles")
            .select("email")
            .eq("id", deal.responsible_user_id)
            .maybeSingle();
          if (isValidEmail(resp?.email)) {
            internalEmail = resp!.email!.trim().toLowerCase();
            internalRole = "responsible";
          }
        }
        if (!internalEmail && isValidEmail(ownerProfile?.email)) {
          internalEmail = ownerProfile!.email!.trim().toLowerCase();
          internalRole = "owner";
        }
        if (internalEmail && !recipients.some((r) => r.email === internalEmail)) {
          recipients.push({ email: internalEmail, role: internalRole });
        }
        if (!internalEmail) {
          await admin.from("crm_renewal_notice_logs").insert({
            owner_user_id: ownerId,
            deal_id: deal.id,
            lead_id: deal.lead_id,
            notice_type: notice.type,
            recipient_email: null,
            recipient_role: "internal",
            status: "skipped",
            error_message: "Nenhum destinatário interno com e-mail válido (responsável e owner sem e-mail)",
          });
          summary.skipped++;
        }

        // Status muda mesmo que não haja destinatário — o comercial precisa enxergar na tabela
        if (notice.changesStatus && deal.status !== "expiring") {
          await admin.from("lead_deals").update({ status: "expiring" }).eq("id", deal.id);
        }

        if (!recipients.length) {
          await admin.from("lead_deals").update({ [column]: new Date().toISOString() }).eq("id", deal.id);
          continue;
        }

        const { subject, html } = renderRenewalEmail(settings, {
          clientName: (deal as any).lead?.contact_name || "Cliente",
          companyName: (deal as any).lead?.company_name || "",
          responsibleName: ownerProfile?.name || "Equipe comercial",
          expirationDate: exp.toLocaleDateString("pt-BR"),
          daysLeft,
          contractValue: fmtMoney(Number(deal.value || 0)),
          contractTotal: fmtMoney(Number(deal.value || 0) * months),
          contractMonths: months,
          saleTitle: deal.title || "Contrato",
          ctaUrl: `${APP_URL}/crm/vendas`,
        });

        for (const r of recipients) {
          // Trava extra de idempotência (execuções concorrentes)
          const { data: already } = await admin
            .from("crm_renewal_notice_logs")
            .select("id")
            .eq("deal_id", deal.id)
            .eq("notice_type", notice.type)
            .eq("recipient_email", r.email)
            .eq("status", "sent")
            .maybeSingle();
          if (already) continue;

          let ok = false;
          let providerId: string | null = null;
          let errorMsg: string | null = null;

          if (!RESEND_API_KEY) {
            errorMsg = "RESEND_API_KEY ausente";
          } else {
            try {
              const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ from: buildFromAddress(settings), to: [r.email], subject, html }),
              });
              const data = await res.json().catch(() => ({}));
              ok = res.ok;
              providerId = data?.id ?? null;
              if (!ok) errorMsg = JSON.stringify(data).slice(0, 500);
            } catch (e) {
              errorMsg = (e as Error).message;
            }
          }

          const { error: logErr } = await admin.from("crm_renewal_notice_logs").insert({
            owner_user_id: ownerId,
            deal_id: deal.id,
            lead_id: deal.lead_id,
            notice_type: notice.type,
            recipient_email: r.email,
            recipient_role: r.role,
            status: ok ? "sent" : "failed",
            error_message: errorMsg,
            provider_message_id: providerId,
            sent_at: ok ? new Date().toISOString() : null,
          });
          if (logErr) console.error("[crm-renewal-processor] log error", logErr);

          if (ok) summary.emails++;
          else summary.errors++;
        }

        await admin.from("lead_deals").update({ [column]: new Date().toISOString() }).eq("id", deal.id);
        summary.notices++;
      }
    }

    return json({ success: true, ...summary });
  } catch (e) {
    console.error("[crm-renewal-processor]", e);
    return json({ error: (e as Error).message, ...summary }, 500);
  }
});
