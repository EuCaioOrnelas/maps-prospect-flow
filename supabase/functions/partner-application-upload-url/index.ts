// Returns a signed upload URL so the public landing form can upload
// documents to the private "partner-applications" bucket without auth.
// Each upload goes to applications/<random-id>/<filename>.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { filename, size, application_session } = await req.json();

    if (!filename || typeof filename !== "string") {
      return new Response(JSON.stringify({ error: "filename obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof size !== "number" || size <= 0 || size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Arquivo excede 10 MB" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXT.includes(ext)) {
      return new Response(JSON.stringify({ error: "Formato não permitido. Use PDF, JPG, PNG ou WebP." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = (application_session || crypto.randomUUID()).replace(/[^a-zA-Z0-9-]/g, "");
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `applications/${session}/${crypto.randomUUID()}-${safeName}`;

    const { data, error } = await supabase.storage
      .from("partner-applications")
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error("[partner-application-upload-url] storage error:", error);
      return new Response(JSON.stringify({ error: "Falha ao gerar URL de upload" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      session,
      path,
      token: data.token,
      signed_url: data.signedUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[partner-application-upload-url] fatal:", e);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
