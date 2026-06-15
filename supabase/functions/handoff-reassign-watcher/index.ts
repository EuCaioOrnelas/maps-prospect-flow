// Handoff Reassign Watcher
// Runs periodically (cron) to:
// 1) Reassign queued handoff_assignments when a candidate becomes available
// 2) Expire assignments past their max_wait_seconds

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function memberIsAvailableNow(av: any): boolean {
  if (!av || av.status !== "online") return false;
  try {
    const tz = av.timezone || "America/Sao_Paulo";
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const wd = parts.find((p) => p.type === "weekday")?.value || "";
    const hh = parts.find((p) => p.type === "hour")?.value || "00";
    const mm = parts.find((p) => p.type === "minute")?.value || "00";
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = map[wd] ?? 0;
    if (!Array.isArray(av.work_days) || !av.work_days.includes(dow)) return false;
    const cur = parseInt(hh, 10) * 60 + parseInt(mm, 10);
    const [sh, sm] = String(av.work_start || "08:00").split(":").map(Number);
    const [eh, em] = String(av.work_end || "18:00").split(":").map(Number);
    return cur >= sh * 60 + sm && cur <= eh * 60 + em;
  } catch { return av.status === "online"; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let reassigned = 0;
  let expired = 0;

  try {
    // 1) Expirar
    const nowIso = new Date().toISOString();
    const { data: toExpire } = await supabase
      .from("handoff_assignments")
      .select("id, account_owner_id, no_agents_actions, redirect_flow_id, execution_id")
      .eq("status", "queued")
      .not("expires_at", "is", null)
      .lt("expires_at", nowIso);

    for (const a of toExpire || []) {
      await supabase.from("handoff_assignments").update({
        status: "expired", closed_at: nowIso,
      }).eq("id", a.id);
      await supabase.from("handoff_audit_log").insert({
        assignment_id: a.id,
        account_owner_id: a.account_owner_id,
        event_type: "expired",
      });
      if (a.execution_id) {
        await supabase.from("wa_flow_executions").update({
          status: "completed", completed_at: nowIso,
        }).eq("id", a.execution_id);
      }
      expired++;
    }

    // 2) Reassign de filas com auto_reassign_when_online
    const { data: queued } = await supabase
      .from("handoff_assignments")
      .select("*")
      .eq("status", "queued")
      .contains("no_agents_actions", ["auto_reassign_when_online"]);

    for (const a of queued || []) {
      const memberIds = (a.team_member_ids || []) as string[];
      if (memberIds.length === 0) continue;
      const { data: avs } = await supabase
        .from("member_availability").select("*").in("user_id", memberIds);
      const byUser = new Map((avs || []).map((x: any) => [x.user_id, x]));
      const eligible = memberIds.filter((id) => memberIsAvailableNow(byUser.get(id)));
      if (eligible.length === 0) continue;

      // round-robin simples baseado em assigned_at do node
      const { data: hist } = await supabase
        .from("handoff_assignments")
        .select("assigned_member_id, assigned_at")
        .eq("account_owner_id", a.account_owner_id)
        .eq("node_id", a.node_id)
        .in("assigned_member_id", eligible)
        .order("assigned_at", { ascending: false })
        .limit(100);
      const last = new Map<string, string>();
      for (const r of hist || []) if (!last.has(r.assigned_member_id)) last.set(r.assigned_member_id, r.assigned_at);
      const sorted = [...eligible].sort((x, y) => {
        const lx = last.get(x); const ly = last.get(y);
        if (!lx && ly) return -1;
        if (lx && !ly) return 1;
        if (!lx && !ly) return x.localeCompare(y);
        return new Date(lx!).getTime() - new Date(ly!).getTime();
      });
      const chosen = sorted[0];

      await supabase.from("handoff_assignments").update({
        status: "assigned",
        assigned_member_id: chosen,
        assigned_at: nowIso,
      }).eq("id", a.id);

      await supabase.from("handoff_audit_log").insert({
        assignment_id: a.id,
        account_owner_id: a.account_owner_id,
        event_type: "reassigned",
        member_id: chosen,
      });

      // Atribuir a conversa
      if (a.lead_phone) {
        // Precisa do user_id "real" da conta para localizar a conversa.
        // assignment não guarda user_id; usar account_owner_id como user_id.
        await supabase.from("chat_conversations")
          .update({ responsible_user_id: chosen })
          .eq("user_id", a.account_owner_id)
          .eq("contact_phone", a.lead_phone);
      }

      reassigned++;
    }

    return new Response(JSON.stringify({ ok: true, reassigned, expired }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[handoff-reassign-watcher] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
