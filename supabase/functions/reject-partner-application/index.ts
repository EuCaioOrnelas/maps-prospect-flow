// Admin-only: rejects a partner application and sends a courteous email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: callerData } = await callerClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!callerData?.user) return json(401, { error: "Unauthorized" });

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) return json(403, { error: "Forbidden — admin only" });

    const { application_id, reason, send_email = true } = await req.json();
    if (!application_id) return json(400, { error: "application_id obrigatório" });
    if (!reason || !String(reason).trim()) return json(400, { error: "Motivo da recusa obrigatório" });

    const { data: app } = await supabase
      .from("partner_applications").select("*").eq("id", application_id).maybeSingle();
    if (!app) return json(404, { error: "Candidatura não encontrada" });

    await supabase
      .from("partner_applications")
      .update({
        status: "rejected",
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by_admin_id: callerData.user.id,
      })
      .eq("id", application_id);

    if (send_email) {
      // Use generic admin_partner_alert template lines for cordial rejection
      fetch(`${supabaseUrl}/functions/v1/send-partner-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          type: "admin_partner_alert",
          to: app.email,
          data: {
            subject: "Atualização sobre sua candidatura Wiize Partners",
            preheader: "Análise da sua candidatura",
            title: `Olá, ${app.full_name.split(" ")[0]}`,
            lines: [
              "Agradecemos imensamente o seu interesse em fazer parte do Programa Wiize Parceiros.",
              "Após análise cuidadosa, neste momento decidimos não seguir adiante com a sua candidatura.",
              reason,
              "Esta decisão não impede candidaturas futuras — ficaremos felizes em reavaliar quando o cenário evoluir.",
              "Desejamos sucesso na sua jornada e seguimos à disposição.",
            ],
          },
        }),
      }).catch((e) => console.warn("[reject-partner-application] email err:", e));
    }

    return json(200, { success: true });
  } catch (e) {
    console.error("[reject-partner-application] fatal:", e);
    return json(500, { error: "Erro inesperado" });
  }
});
