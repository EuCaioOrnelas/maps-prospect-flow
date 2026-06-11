import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BackupState {
  connectionId: string;
  connectionLabel?: string;
  total: number;
  current: number;
  status: "running" | "done" | "error";
  error?: string;
  startedAt: number;
}

const STORAGE_KEY = "wiize:chat-backup-state:v1";
const EVENT_NAME = "wiize:chat-backup-update";

function readState(): BackupState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BackupState) : null;
  } catch {
    return null;
  }
}

function writeState(state: BackupState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useChatBackupState() {
  const [state, setState] = useState<BackupState | null>(() => readState());

  useEffect(() => {
    const sync = () => setState(readState());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const dismiss = useCallback(() => writeState(null), []);

  return { state, dismiss };
}

interface StartBackupArgs {
  connectionId: string;
  ownerUserId: string;
  responsibleUserId: string | null;
  connectionLabel?: string;
}

/**
 * Inicia backup dos contatos do CRM para o chat:
 * - Se houver responsável, traz somente leads desse responsável;
 * - Caso contrário, traz todos os leads da conta;
 * - Faz upsert em chat_conversations (sem sobrescrever conversas existentes).
 */
export async function startChatBackup({
  connectionId,
  ownerUserId,
  responsibleUserId,
  connectionLabel,
}: StartBackupArgs) {
  // Leads do CRM
  let leadsQuery = supabase
    .from("leads")
    .select("phone, contact_name, company_name, responsible_user_id")
    .eq("owner_user_id", ownerUserId)
    .is("archived_at", null);

  if (responsibleUserId) {
    leadsQuery = leadsQuery.eq("responsible_user_id", responsibleUserId);
  }

  const { data: leads, error } = await leadsQuery;
  if (error) {
    writeState({
      connectionId,
      connectionLabel,
      total: 0,
      current: 0,
      status: "error",
      error: error.message,
      startedAt: Date.now(),
    });
    return;
  }

  // Normalizar telefone
  const seen = new Set<string>();
  const items = (leads ?? [])
    .map((l) => {
      const digits = (l.phone || "").replace(/\D/g, "");
      if (!digits || digits.length < 8) return null;
      if (seen.has(digits)) return null;
      seen.add(digits);
      return {
        phone: digits,
        name: l.contact_name || l.company_name || null,
      };
    })
    .filter(Boolean) as { phone: string; name: string | null }[];

  const total = items.length;
  writeState({
    connectionId,
    connectionLabel,
    total,
    current: 0,
    status: "running",
    startedAt: Date.now(),
  });

  if (total === 0) {
    writeState({
      connectionId,
      connectionLabel,
      total: 0,
      current: 0,
      status: "done",
      startedAt: Date.now(),
    });
    return;
  }

  // Conversas já existentes para esse connection
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("contact_phone")
    .eq("waba_connection_id", connectionId);
  const existingSet = new Set((existing ?? []).map((r: any) => (r.contact_phone || "").replace(/\D/g, "")));

  const toInsert = items.filter((i) => !existingSet.has(i.phone));
  const BATCH = 50;
  let done = 0;

  // Conta como "já feitos" os que já existiam
  done += items.length - toInsert.length;
  writeState({
    connectionId,
    connectionLabel,
    total,
    current: done,
    status: "running",
    startedAt: Date.now(),
  });

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    const rows = slice.map((s) => ({
      user_id: ownerUserId,
      owner_user_id: ownerUserId,
      waba_connection_id: connectionId,
      contact_phone: s.phone,
      contact_name: s.name,
      responsible_user_id: responsibleUserId,
      last_message_at: null,
      unread_count: 0,
    }));
    const { error: insErr } = await supabase
      .from("chat_conversations")
      .upsert(rows as any, {
        onConflict: "user_id,waba_connection_id,contact_phone",
        ignoreDuplicates: true,
      });
    if (insErr) {
      writeState({
        connectionId,
        connectionLabel,
        total,
        current: done,
        status: "error",
        error: insErr.message,
        startedAt: Date.now(),
      });
      return;
    }
    done += slice.length;
    writeState({
      connectionId,
      connectionLabel,
      total,
      current: done,
      status: "running",
      startedAt: Date.now(),
    });
  }

  writeState({
    connectionId,
    connectionLabel,
    total,
    current: total,
    status: "done",
    startedAt: Date.now(),
  });
}
