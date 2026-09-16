// Retorna, de forma pública, os identificadores de rastreamento do site.
// O ID do GA4 pode vir da tabela `tracking_settings` (admin) ou do secret
// GOOGLE_ANALYTICS_MEASUREMENT_ID — assim o valor nunca se perde no deploy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  if (!s) return null;
  // Ignora placeholders do tipo "@secret:NOME_DO_SEGREDO".
  if (s.startsWith("@secret:")) return null;
  return s;
};

async function readSettings(): Promise<Record<string, unknown> | null> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const query = supabase
      .from("tracking_settings")
      .select("gtm_id, ga4_id, meta_pixel_id, enabled")
      .maybeSingle();
    // O banco nunca pode segurar a resposta: 8s no máximo.
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
    const result = await Promise.race([query, timeout]);
    return (result as { data?: Record<string, unknown> } | null)?.data ?? null;
  } catch (e) {
    console.error("tracking-config: falha ao ler tracking_settings", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const row = await readSettings();

  const body = {
    gtm_id: clean(row?.gtm_id as string | null),
    ga4_id:
      clean(row?.ga4_id as string | null) ??
      clean(Deno.env.get("GOOGLE_ANALYTICS_MEASUREMENT_ID")),
    meta_pixel_id: clean(row?.meta_pixel_id as string | null),
    enabled: row ? (row.enabled as boolean) !== false : true,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
});
