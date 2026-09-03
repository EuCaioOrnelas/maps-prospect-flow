import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface WiizeApiProfileInput {
  full_name: string;
  company_name: string;
  phone?: string | null;
  doc_type?: string;
  doc_number?: string | null;
  postal_code?: string | null;
  street?: string | null;
  street_number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

function profileFromMetadata(user: User): WiizeApiProfileInput {
  const metadata = (user.user_metadata || {}) as Record<string, string>;
  return {
    full_name: metadata.full_name || metadata.name || "",
    company_name: metadata.company_name || "",
    phone: metadata.api_phone || null,
    doc_type: metadata.api_doc_type || "cnpj",
    doc_number: metadata.api_doc_number || null,
    postal_code: metadata.api_postal_code || null,
    street: metadata.api_street || null,
    street_number: metadata.api_street_number || null,
    complement: metadata.api_complement || null,
    neighborhood: metadata.api_neighborhood || null,
    city: metadata.api_city || null,
    state: metadata.api_state || null,
  };
}

export async function createWiizeApiAccess(userId: string, profile: WiizeApiProfileInput) {
  return supabase.from("wiize_api_profiles").upsert(
    { user_id: userId, ...profile },
    { onConflict: "user_id" },
  );
}

export async function resolveWiizeApiAccess(user: User) {
  const { data, error } = await supabase
    .from("wiize_api_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { hasAccess: false, error };
  if (data) return { hasAccess: true, error: null };

  if (user.user_metadata?.wiize_product === "wiize_api") {
    const { error: createError } = await createWiizeApiAccess(user.id, profileFromMetadata(user));
    return { hasAccess: !createError, error: createError };
  }

  return { hasAccess: false, error: null };
}