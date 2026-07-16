// Grava auditoria de toda requisição — sucesso ou falha. Falha silenciosa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AuditEntry {
  request_id: string;
  client_id: string | null;
  user_id: string | null;
  company_id: string | null;
  endpoint: string;
  version: string;
  modules: string[];
  filters: Record<string, unknown>;
  status_code: number;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
  processing_time_ms: number;
  records_returned: number;
  ip: string | null;
  user_agent: string | null;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("integration_audit_log").insert(entry);
  } catch (e) {
    console.warn("[integration] audit write failed:", (e as Error).message);
  }
}
