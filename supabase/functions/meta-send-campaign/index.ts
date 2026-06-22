import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatPhoneForMeta } from "../_shared/phoneFormat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);


    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id,parent_owner_id")
      .eq("id", user.id)
      .maybeSingle();
    const accountOwnerId = profile?.parent_owner_id || profile?.id || user.id;

    const body = await req.json();
    const {
      connection_id,
      phone_number_id,
      access_token,
      template_name,
      template_language,
      template_variables,
      phone_numbers,
      campaign_name,
    } = body;

    if (!phone_number_id || !access_token || !template_name || !phone_numbers?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build template components with variables
    const components: any[] = [];
    const varKeys = Object.keys(template_variables || {}).sort();
    if (varKeys.length > 0) {
      components.push({
        type: "body",
        parameters: varKeys.map((key) => ({
          type: "text",
          text: template_variables[key],
        })),
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Fetch the full template definition from Meta so we can persist the real rendered
    // message in the chat (instead of just "[template_name]").
    let templateDef: any = null;
    try {
      // Discover waba_id from the connection row
      const { data: connRow } = await supabase
        .from("user_waba_connections")
        .select("waba_id")
        .eq("id", connection_id)
        .maybeSingle();
      const wabaId = connRow?.waba_id;
      if (wabaId) {
        const tplResp = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100&fields=name,language,components&name=${encodeURIComponent(template_name)}`,
          { headers: { Authorization: `Bearer ${access_token}` } }
        );
        const tplJson = await tplResp.json();
        if (tplResp.ok && Array.isArray(tplJson?.data)) {
          templateDef =
            tplJson.data.find(
              (t: any) => t.name === template_name && (!template_language || t.language === template_language)
            ) || tplJson.data.find((t: any) => t.name === template_name) || null;
        }
      }
    } catch (e) {
      console.error("[meta-send-campaign] template fetch failed:", e);
    }

    // Render a human-readable preview of the outbound template message
    const renderedPreview = (() => {
      // Fallback if we couldn't fetch the template
      const vars = varKeys.map((k) => template_variables[k]);
      if (!templateDef) {
        return vars.length > 0
          ? `[${template_name}] ${vars.join(" | ")}`
          : `[${template_name}]`;
      }

      const fillVars = (text: string): string =>
        String(text || "").replace(/\{\{(\d+)\}\}/g, (_m, n) => {
          const v = template_variables?.[String(n)];
          return v !== undefined && v !== null && v !== "" ? String(v) : `{{${n}}}`;
        });

      const components: any[] = Array.isArray(templateDef.components) ? templateDef.components : [];
      const parts: string[] = [];

      const header = components.find((c) => String(c?.type).toUpperCase() === "HEADER");
      if (header) {
        const fmt = String(header.format || "TEXT").toUpperCase();
        if (fmt === "TEXT" && header.text) parts.push(`*${fillVars(header.text)}*`);
        else if (fmt === "IMAGE") parts.push("📷 [Imagem]");
        else if (fmt === "VIDEO") parts.push("🎥 [Vídeo]");
        else if (fmt === "DOCUMENT") parts.push("📄 [Documento]");
      }

      const bodyComp = components.find((c) => String(c?.type).toUpperCase() === "BODY");
      if (bodyComp?.text) parts.push(fillVars(bodyComp.text));

      const footer = components.find((c) => String(c?.type).toUpperCase() === "FOOTER");
      if (footer?.text) parts.push(`_${footer.text}_`);

      const buttonsComp = components.find((c) => String(c?.type).toUpperCase() === "BUTTONS");
      if (buttonsComp && Array.isArray(buttonsComp.buttons) && buttonsComp.buttons.length > 0) {
        const btnLines = buttonsComp.buttons.map((b: any) => {
          const t = String(b?.type || "").toUpperCase();
          const label = b?.text || "";
          if (t === "URL") return `🔗 ${label}${b?.url ? ` (${b.url})` : ""}`;
          if (t === "PHONE_NUMBER") return `📞 ${label}${b?.phone_number ? ` (${b.phone_number})` : ""}`;
          return `🔘 ${label}`;
        });
        parts.push(btnLines.join("\n"));
      }

      const rendered = parts.filter(Boolean).join("\n\n").trim();
      return rendered || `[${template_name}]`;
    })();

    // Helper: persist outbound message into chat_conversations + chat_messages
    async function persistOutboundChat(db: any, toPhone: string, wabaMessageId: string | null) {
      try {
        const phoneDigits = String(toPhone).replace(/\D/g, "");
        if (!phoneDigits || !connection_id) return;
        const last8 = phoneDigits.slice(-8);
        const nowIso = new Date().toISOString();

        const { data: conversation } = await db
          .from("chat_conversations")
          .select("id")
          .eq("owner_user_id", accountOwnerId)
          .eq("waba_connection_id", connection_id)
          .ilike("contact_phone", `%${last8}`)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        let convId = conversation?.id as string | undefined;

        if (!convId) {
          const { data: created } = await db
            .from("chat_conversations")
            .insert({
              user_id: user.id,
              owner_user_id: accountOwnerId,
              waba_connection_id: connection_id,
              phone_number_id: phone_number_id,
              contact_phone: phoneDigits,
              last_message_text: renderedPreview,
              last_message_at: nowIso,
              last_message_type: "text",
              last_message_direction: "outbound",
              unread_count: 0,
            })
            .select("id")
            .single();
          convId = created?.id;
        } else {
          await db
            .from("chat_conversations")
            .update({
              last_message_text: renderedPreview,
              last_message_at: nowIso,
              last_message_type: "text",
              last_message_direction: "outbound",
            })
            .eq("id", convId);
        }

        if (!convId) return;

        if (wabaMessageId) {
          const { data: existing } = await db
            .from("chat_messages")
            .select("id")
            .eq("waba_message_id", wabaMessageId)
            .maybeSingle();
          if (existing) return;
        }

        await db.from("chat_messages").insert({
          conversation_id: convId,
          user_id: user.id,
          owner_user_id: accountOwnerId,
          waba_message_id: wabaMessageId,
          direction: "outbound",
          message_type: "text",
          content: renderedPreview,
          status: "sent",
          status_updated_at: nowIso,
          metadata: {
            source: "campaign",
            campaign_name: campaign_name || null,
            template_name,
            template_language: template_language || "pt_BR",
            template_variables: template_variables || {},
          },
        });
      } catch (e) {
        console.error("[meta-send-campaign] persistOutboundChat failed:", e);
      }
    }

    // Normalização E.164 global (BR + internacional). formatPhoneForMeta
    // garante 9º dígito BR e respeita números internacionais (não força DDI 55).

    // Send messages in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < phone_numbers.length; i += BATCH_SIZE) {
      const batch = phone_numbers.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (rawPhone: string) => {
        const phone = formatPhoneForMeta(rawPhone);
        if (!phone) {
          console.warn(`[meta-send-campaign] Telefone inválido descartado: ${rawPhone}`);
          return;
        }
          const messageBody: any = {
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: template_name,
              language: { code: template_language || "pt_BR" },
            },
          };

          if (components.length > 0) {
            messageBody.template.components = components;
          }

          const response = await fetch(
            `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messageBody),
            }
          );

          const responseText = await response.text();
          let parsed: any = null;
          try { parsed = responseText ? JSON.parse(responseText) : null; } catch { /* keep text */ }

          if (response.ok) {
            const wabaId = parsed?.messages?.[0]?.id || null;
            const wppContact = parsed?.contacts?.[0]?.wa_id || null;
            console.log(`[meta-send-campaign] ✅ ${phone} → wa_id=${wppContact} msg_id=${wabaId}`);
            // Meta às vezes responde 200 mesmo quando o número NÃO existe no WhatsApp.
            // Quando isso acontece, `messages[0].id` vem ausente — tratamos como falha real.
            if (!wabaId) {
              failedCount++;
              errors.push(`${phone}: aceito pela Meta sem messageId (número provavelmente sem WhatsApp)`);
              return;
            }
            successCount++;
            try {
              await persistOutboundChat(supabase, phone, wabaId);
            } catch (persistErr) {
              console.error("[meta-send-campaign] persist post-success error:", persistErr);
            }

          } else {
            failedCount++;
            const apiMsg = parsed?.error?.message || responseText || `HTTP ${response.status}`;
            console.error(`[meta-send-campaign] ❌ ${phone} → ${apiMsg}`);
            errors.push(`${phone}: ${apiMsg}`);
          }
        } catch (err) {
          failedCount++;
          console.error(`[meta-send-campaign] 💥 ${phone}:`, err);
          errors.push(`${phone}: ${err.message}`);
        }
      });

      await Promise.all(promises);

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < phone_numbers.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Save campaign record
    const campaignNameFinal = campaign_name || `Meta ${new Date().toISOString().split("T")[0]}`;
    const campaignPayload = {
      user_id: user.id,
      owner_user_id: accountOwnerId,
      connection_id: connection_id,
      campaign_name: campaignNameFinal,
      template_name: template_name,
      template_language: template_language || "pt_BR",
      total_recipients: phone_numbers.length,
      success_count: successCount,
      failed_count: failedCount,
      status: "completed",
      error_details: errors.length > 0 ? errors.slice(0, 20) : null,
    };
    const { error: campaignInsertError } = await supabase.from("meta_campaigns").insert(campaignPayload);
    if (campaignInsertError) {
      console.error("[meta-send-campaign] campaign insert failed:", campaignInsertError);
      return new Response(
        JSON.stringify({ error: "Campanha enviada, mas não foi salva no histórico", details: campaignInsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-send-campaign] campaign saved user=${user.id} recipients=${phone_numbers.length} success=${successCount} failed=${failedCount}`);

    // === Campaign issues notification ===
    // Trigger when campaign fully fails or failure rate is high (>30% with >=5 recipients)
    const failRate = phone_numbers.length > 0 ? failedCount / phone_numbers.length : 0;
    const isProblematic =
      (successCount === 0 && failedCount > 0) ||
      (phone_numbers.length >= 5 && failRate > 0.3);
    if (isProblematic) {
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            user_id: user.id,
            email_type: "CAMPAIGN_FAILED_TO_START",
            idempotency_key: `meta-campaign-fail-${connection_id}-${Date.now()}`,
            meta_pref_key: "notify_campaign_issues",
            payload: {
              campaign_name: campaignNameFinal,
              total_contacts: phone_numbers.length,
              failed_count: failedCount,
              success_count: successCount,
              error_sample: errors.slice(0, 3).join(" | "),
            },
          },
        });
      } catch (e) {
        console.error("[meta-send-campaign] failure email error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success_count: successCount,
        failed_count: failedCount,
        total: phone_numbers.length,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
