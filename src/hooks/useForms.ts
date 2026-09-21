import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FormField {
  id?: string;
  field_type: string;
  label: string;
  name: string;
  placeholder?: string | null;
  required: boolean;
  position: number;
  is_active: boolean;
  options: any;
}

export interface FormRecord {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  title: string;
  description: string | null;
  button_text: string;
  success_message: string;
  status: string;
  config: any;
  crm_enabled: boolean;
  crm_stage_id: string | null;
  crm_responsibles: string[];
  notify_enabled: boolean;
  notify_user_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface TrackedLink {
  id: string;
  name: string;
  slug: string;
  destination_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  status: string;
  created_at: string;
}

export interface FormStats {
  views: number;
  submissions: number;
  lastSubmission: string | null;
}

async function callAdmin(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("forms-admin", { body: payload });
  if (error) {
    // Ler o corpo real do erro HTTP
    let message = error.message;
    const ctx: any = (error as any).context;
    try {
      const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      if (body?.message || body?.error) message = body.message || body.error;
    } catch { /* ignore */ }
    throw new Error(message || "Não foi possível concluir a ação.");
  }
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as any;
}

export interface PeriodRange {
  from: string | null;
  to: string | null;
}

export function useForms() {
  const { user, accountOwnerId } = useAuth();
  const ownerId = accountOwnerId || user?.id || null;
  const [range, setRange] = useState<PeriodRange>({ from: null, to: null });

  const [forms, setForms] = useState<FormRecord[]>([]);
  const [links, setLinks] = useState<TrackedLink[]>([]);
  const [statsByForm, setStatsByForm] = useState<Record<string, FormStats>>({});
  const [clicksByLink, setClicksByLink] = useState<Record<string, { clicks: number; unique: number; last: string | null }>>({});
  const [leadsByLink, setLeadsByLink] = useState<Record<string, number>>({});
  const [limits, setLimits] = useState<{ forms: number; links: number }>({ forms: 1, links: 1 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const [{ data: formRows }, { data: linkRows }, limitsRes, analyticsRes] = await Promise.all([
        supabase.from("forms").select("*").eq("owner_user_id", ownerId).order("created_at", { ascending: false }),
        supabase.from("tracked_links").select("*").eq("owner_user_id", ownerId).order("created_at", { ascending: false }),
        callAdmin({ action: "limits" }).catch(() => null),
        callAdmin({ action: "analytics_summary" }).catch(() => null),
      ]);
      setForms((formRows as any) || []);
      setLinks((linkRows as any) || []);
      if (limitsRes?.limits) setLimits(limitsRes.limits);

      const stats: Record<string, FormStats> = {};
      for (const f of (formRows as any) || []) stats[f.id] = { views: 0, submissions: 0, lastSubmission: null };
      for (const [formId, summary] of Object.entries((analyticsRes as any)?.forms || {})) {
        if (!stats[formId]) continue;
        stats[formId] = summary as FormStats;
      }
      setStatsByForm(stats);

      const linkStats: Record<string, { clicks: number; unique: number; last: string | null }> = {};
      const leadsPerLink: Record<string, number> = {};
      for (const link of (linkRows as any) || []) {
        const summary = (analyticsRes as any)?.links?.[link.id];
        linkStats[link.id] = summary
          ? { clicks: summary.clicks, unique: summary.unique, last: summary.last }
          : { clicks: 0, unique: 0, last: null };
        leadsPerLink[link.id] = summary?.leads || 0;
      }
      setClicksByLink(linkStats);
      setLeadsByLink(leadsPerLink);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => { refresh(); }, [refresh]);

  const totals = {
    forms: forms.length,
    links: links.length,
    submissions: Object.values(statsByForm).reduce((a, s) => a + s.submissions, 0),
    views: Object.values(statsByForm).reduce((a, s) => a + s.views, 0),
  };

  return {
    loading,
    forms,
    links,
    statsByForm,
    clicksByLink,
    leadsByLink,
    limits,
    totals,
    refresh,
    callAdmin,
  };
}
