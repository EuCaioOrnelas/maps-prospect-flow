import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AvailabilityStatus = "online" | "away" | "offline";

export interface MemberAvailability {
  id: string;
  user_id: string;
  account_owner_id: string;
  status: AvailabilityStatus;
  work_days: number[];
  work_start: string; // "HH:MM"
  work_end: string;
  timezone: string;
  updated_at: string;
}

const DEFAULTS = {
  status: "online" as AvailabilityStatus,
  work_days: [1, 2, 3, 4, 5],
  work_start: "08:00",
  work_end: "18:00",
  timezone: "America/Sao_Paulo",
};

async function resolveOwnerId(uid: string): Promise<string> {
  const { data } = await supabase.rpc("get_account_owner", { _uid: uid });
  return (data as string) || uid;
}

export function useMemberAvailability(userId?: string | null) {
  const { user } = useAuth();
  const targetId = userId || user?.id || null;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<MemberAvailability | null>(null);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    const { data: row } = await supabase
      .from("member_availability")
      .select("*")
      .eq("user_id", targetId)
      .maybeSingle();
    if (row) {
      setData(row as any);
    } else {
      const owner = await resolveOwnerId(targetId);
      const insertRow = {
        user_id: targetId,
        account_owner_id: owner,
        ...DEFAULTS,
      };
      const { data: created } = await supabase
        .from("member_availability")
        .insert(insertRow)
        .select("*")
        .maybeSingle();
      setData((created as any) || null);
    }
    setLoading(false);
  }, [targetId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (patch: Partial<MemberAvailability>) => {
      if (!data) return;
      setSaving(true);
      const { data: updated } = await supabase
        .from("member_availability")
        .update(patch)
        .eq("id", data.id)
        .select("*")
        .maybeSingle();
      if (updated) setData(updated as any);
      setSaving(false);
    },
    [data]
  );

  return { loading, saving, availability: data, save, refresh: load };
}

export function useAccountAvailabilities() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MemberAvailability[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const owner = await resolveOwnerId(user.id);
    const { data } = await supabase
      .from("member_availability")
      .select("*")
      .eq("account_owner_id", owner);
    setRows((data || []) as any);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, availabilities: rows, refresh: load };
}

export const WEEK_DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  online: "Online",
  away: "Ausente",
  offline: "Offline",
};
