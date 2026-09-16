import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tabelas novas ainda não refletidas nos tipos gerados do banco.
const db = supabase as any;

export const CAMPAIGN_KEY = "trial_wiize";

export type CampaignStatus = "draft" | "active" | "paused" | "disabled";

export interface LifecycleCampaign {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  from_name: string;
  from_email: string;
  activated_at: string | null;
  paused_at: string | null;
}

export interface LifecycleStep {
  id: string;
  campaign_id: string;
  key: string;
  day_offset: number;
  name: string;
  subject: string;
  preheader: string;
  content: string;
  audience: string;
  is_active: boolean;
}

export interface LifecycleDelivery {
  id: string;
  step_id: string;
  user_id: string | null;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  unsubscribed_at: string | null;
  error_message: string | null;
}

export interface StepMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  converted: number;
  failed: number;
}

const emptyMetrics = (): StepMetrics => ({
  sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, converted: 0, failed: 0,
});

export function useLifecycleCampaign() {
  const [campaign, setCampaign] = useState<LifecycleCampaign | null>(null);
  const [steps, setSteps] = useState<LifecycleStep[]>([]);
  const [deliveries, setDeliveries] = useState<LifecycleDelivery[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: camp, error: campaignError } = await db
      .from("lifecycle_campaigns")
      .select("*")
      .eq("key", CAMPAIGN_KEY)
      .maybeSingle();

    if (campaignError) {
      setCampaign(null);
      setSteps([]);
      setDeliveries([]);
      setEnrollments([]);
      setError("Não foi possível carregar os dados do fluxo.");
      setLoading(false);
      return;
    }

    if (!camp) {
      setCampaign(null);
      setSteps([]);
      setLoading(false);
      return;
    }
    setCampaign(camp);

    const [stepResult, deliveryResult, enrollmentResult] = await Promise.all([
      db.from("lifecycle_campaign_steps").select("*").eq("campaign_id", camp.id).order("day_offset"),
      db
        .from("lifecycle_email_deliveries")
        .select("id, step_id, user_id, recipient_email, status, sent_at, delivered_at, opened_at, clicked_at, bounced_at, complained_at, unsubscribed_at, error_message")
        .eq("campaign_id", camp.id)
        .eq("is_test", false)
        .limit(5000),
      db.from("lifecycle_enrollments").select("*").eq("campaign_id", camp.id).limit(5000),
    ]);

    const requestError = stepResult.error || deliveryResult.error || enrollmentResult.error;
    if (requestError) {
      setError("Parte dos dados não pôde ser carregada. Tente atualizar.");
    }
    setSteps(stepResult.data || []);
    setDeliveries(deliveryResult.data || []);
    setEnrollments(enrollmentResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const convertedUserIds = useMemo(
    () => new Set((enrollments || []).filter((e) => e.exit_reason === "converted").map((e) => e.user_id)),
    [enrollments],
  );

  const metricsByStep = useMemo(() => {
    const map = new Map<string, StepMetrics>();
    for (const step of steps) map.set(step.id, emptyMetrics());
    for (const d of deliveries) {
      const m = map.get(d.step_id);
      if (!m) continue;
      if (d.status === "failed") m.failed++;
      if (d.sent_at) m.sent++;
      if (d.delivered_at) m.delivered++;
      if (d.opened_at) m.opened++;
      if (d.clicked_at) m.clicked++;
      if (d.bounced_at) m.bounced++;
      if (d.unsubscribed_at) m.unsubscribed++;
      if (d.user_id && convertedUserIds.has(d.user_id)) m.converted++;
    }
    return map;
  }, [steps, deliveries, convertedUserIds]);

  const totals = useMemo(() => {
    const base = emptyMetrics();
    for (const m of metricsByStep.values()) {
      base.sent += m.sent;
      base.delivered += m.delivered;
      base.opened += m.opened;
      base.clicked += m.clicked;
      base.bounced += m.bounced;
      base.unsubscribed += m.unsubscribed;
      base.failed += m.failed;
    }
    return {
      ...base,
      inFlow: enrollments.filter((e) => e.status === "active").length,
      converted: convertedUserIds.size,
      enrolled: enrollments.length,
    };
  }, [metricsByStep, enrollments, convertedUserIds]);

  const setStatus = useCallback(
    async (status: CampaignStatus) => {
      if (!campaign) return;
      const patch: Record<string, unknown> = { status };
      if (status === "active") patch.activated_at = campaign.activated_at || new Date().toISOString();
      if (status === "paused") patch.paused_at = new Date().toISOString();
      const { error: updateError } = await db.from("lifecycle_campaigns").update(patch).eq("id", campaign.id);
      if (updateError) {
        toast.error("Não foi possível alterar o status da campanha");
        return;
      }
      toast.success(status === "active" ? "Campanha ativada" : status === "paused" ? "Campanha pausada" : "Campanha desativada");
      await load();
    },
    [campaign, load],
  );

  const saveStep = useCallback(
    async (stepId: string, patch: Partial<LifecycleStep>) => {
      const { error: updateError } = await db.from("lifecycle_campaign_steps").update(patch).eq("id", stepId);
      if (updateError) throw updateError;
      await load();
    },
    [load],
  );

  return { campaign, steps, deliveries, enrollments, metricsByStep, totals, loading, error, load, setStatus, saveStep };
}

export function rate(part: number, total: number): string {
  if (!total) return "—";
  return `${((part / total) * 100).toFixed(1).replace(".", ",")}%`;
}
