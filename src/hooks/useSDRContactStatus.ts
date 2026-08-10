import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SDRState =
  | "no_agent"
  | "active"
  | "queued"
  | "paused"
  | "handoff"
  | "closed"
  | "opted_out";

export type SDRContactStatus = {
  state: SDRState;
  agentId: string | null;
  agentName: string | null;
  sessionId: string | null;
  nextAt: string | null;
  closedReason: string | null;
};

const CLOSED_STATES = ["closed", "abandoned"];

/**
 * Diz se o SDR Inteligente está atendendo este contato (e por quê não, quando for o caso).
 */
export function useSDRContactStatus(phone: string | null | undefined, accountOwnerId: string | null | undefined) {
  const [status, setStatus] = useState<SDRContactStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!phone || !accountOwnerId) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      const digits = String(phone).replace(/\D/g, "");
      const tail = digits.slice(-8);

      const { data: agents } = await supabase
        .from("sdr_agents")
        .select("id, name, status")
        .eq("owner_user_id", accountOwnerId)
        .eq("status", "active");

      if (!agents?.length) {
        setStatus({ state: "no_agent", agentId: null, agentName: null, sessionId: null, nextAt: null, closedReason: null });
        return;
      }

      const agentIds = agents.map((a) => a.id);
      const { data: sessions } = await supabase
        .from("sdr_sessions")
        .select("id, agent_id, status, next_followup_at, followup_reason, closed_reason, created_at")
        .in("agent_id", agentIds)
        .ilike("phone", `%${tail}`)
        .order("created_at", { ascending: false })
        .limit(1);

      const session = sessions?.[0] ?? null;
      const agent = agents.find((a) => a.id === (session?.agent_id ?? agentIds[0]))!;

      if (!session) {
        setStatus({ state: "active", agentId: agent.id, agentName: agent.name, sessionId: null, nextAt: null, closedReason: null });
        return;
      }

      let state: SDRState = "active";
      if (session.status === "paused") state = "paused";
      else if (session.status === "opted_out") state = "opted_out";
      else if (session.status === "handoff") state = "handoff";
      else if (CLOSED_STATES.includes(String(session.status))) state = "closed";
      else if (session.followup_reason === "outside_business_hours" && session.next_followup_at) state = "queued";

      setStatus({
        state,
        agentId: agent.id,
        agentName: agent.name,
        sessionId: session.id,
        nextAt: session.next_followup_at ?? null,
        closedReason: session.closed_reason ?? null,
      });
    } finally {
      setLoading(false);
    }
  }, [phone, accountOwnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const setPaused = useCallback(
    async (paused: boolean) => {
      if (!status || !accountOwnerId || !phone) return;
      setSaving(true);
      try {
        if (status.sessionId) {
          await supabase
            .from("sdr_sessions")
            .update(
              paused
                ? { status: "paused", next_followup_at: null, closed_reason: "manual_pause" }
                : { status: "active", closed_reason: null },
            )
            .eq("id", status.sessionId);
        } else if (paused && status.agentId) {
          await supabase.from("sdr_sessions").insert({
            agent_id: status.agentId,
            owner_user_id: accountOwnerId,
            phone: String(phone).replace(/\D/g, ""),
            status: "paused",
            closed_reason: "manual_pause",
          });
        }
        await load();
      } finally {
        setSaving(false);
      }
    },
    [status, accountOwnerId, phone, load],
  );

  return { status, loading, saving, setPaused, reload: load };
}
