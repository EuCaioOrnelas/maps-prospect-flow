import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Helpers locais (sem arquivos compartilhados) ---
const lifecycleCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function signToken(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyToken(secret: string, payload: string, signature: string): Promise<boolean> {
  if (!signature) return false;
  const expected = await signToken(secret, payload);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
// --- fim dos helpers ---

// Tracking endpoints for lifecycle emails:
//   ?action=open        -> 1x1 pixel, records the first open
//   ?action=click       -> records the click and redirects
//   ?action=unsubscribe -> opts the recipient out of lifecycle/marketing email
// Every request is signed with HMAC (LIFECYCLE_TRACKING_SECRET) over the delivery id.

const PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

function pixelResponse() {
  return new Response(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

function htmlPage(title: string, message: string) {
  return new Response(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:480px;margin:80px auto;background:#fff;border-radius:12px;padding:32px;text-align:center;">
<h1 style="font-size:20px;color:#18181b;margin:0 0 12px;">${title}</h1>
<p style="font-size:15px;color:#52525b;line-height:1.6;margin:0;">${message}</p>
</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: lifecycleCors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const secret = Deno.env.get("LIFECYCLE_TRACKING_SECRET") || "";

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const deliveryId = url.searchParams.get("d") || "";
    const signature = url.searchParams.get("s") || "";

    if (!action || !deliveryId) return new Response("Missing params", { status: 400 });
    const valid = await verifyToken(secret, deliveryId, signature);
    if (!valid) {
      // Never leak whether the delivery exists; opens fail silently as a pixel.
      return action === "open" ? pixelResponse() : new Response("Invalid signature", { status: 403 });
    }

    const { data: delivery } = await supabase
      .from("lifecycle_email_deliveries")
      .select("id, campaign_id, step_id, user_id, recipient_email, opened_at, clicked_at, is_test")
      .eq("id", deliveryId)
      .maybeSingle();

    if (!delivery) return action === "open" ? pixelResponse() : new Response("Not found", { status: 404 });

    const now = new Date().toISOString();
    const baseEvent = {
      delivery_id: delivery.id,
      campaign_id: delivery.campaign_id,
      step_id: delivery.step_id,
      user_id: delivery.user_id,
    };

    if (action === "open") {
      if (!delivery.opened_at) {
        await supabase
          .from("lifecycle_email_deliveries")
          .update({ opened_at: now, status: "opened" })
          .eq("id", delivery.id)
          .is("opened_at", null);
        await supabase.from("lifecycle_email_events").insert({
          ...baseEvent,
          event_type: "opened",
          metadata: { source: "pixel" },
        });
      }
      return pixelResponse();
    }

    if (action === "click") {
      const target = url.searchParams.get("url");
      if (!target) return new Response("Missing url", { status: 400 });
      const decoded = decodeURIComponent(target);
      if (!/^https?:\/\//i.test(decoded)) return new Response("Invalid url", { status: 400 });

      const label = url.searchParams.get("l") || null;

      await supabase.from("lifecycle_email_events").insert({
        ...baseEvent,
        event_type: "clicked",
        link_url: decoded,
        link_label: label,
        metadata: { source: "redirect" },
      });

      const patch: Record<string, unknown> = { status: "clicked" };
      if (!delivery.clicked_at) patch.clicked_at = now;
      if (!delivery.opened_at) {
        patch.opened_at = now;
        await supabase.from("lifecycle_email_events").insert({
          ...baseEvent,
          event_type: "opened",
          metadata: { inferred_from_click: true },
        });
      }
      await supabase.from("lifecycle_email_deliveries").update(patch).eq("id", delivery.id);

      return new Response(null, { status: 302, headers: { Location: decoded, "Cache-Control": "no-store" } });
    }

    if (action === "unsubscribe") {
      if (delivery.is_test) return htmlPage("E-mail de teste", "Este é um envio de teste — nada foi alterado.");

      await supabase
        .from("email_suppressions")
        .insert({ email: delivery.recipient_email, reason: "unsubscribe", source: "lifecycle" });

      if (delivery.user_id) {
        await supabase
          .from("email_preferences")
          .upsert(
            { user_id: delivery.user_id, marketing_enabled: false },
            { onConflict: "user_id" },
          );

        await supabase
          .from("lifecycle_enrollments")
          .update({ status: "exited", exited_at: now, exit_reason: "unsubscribed" })
          .eq("user_id", delivery.user_id)
          .eq("status", "active");
      }

      await supabase
        .from("lifecycle_email_deliveries")
        .update({ unsubscribed_at: now })
        .eq("id", delivery.id)
        .is("unsubscribed_at", null);

      await supabase.from("lifecycle_email_events").insert({
        ...baseEvent,
        event_type: "unsubscribed",
        metadata: { source: "link" },
      });

      return htmlPage(
        "Pronto, você foi descadastrado",
        "Você não receberá mais e-mails de relacionamento da Wiize. E-mails essenciais da sua conta continuam funcionando.",
      );
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("lifecycle-tracker error:", error);
    return new Response(null, { status: 204 });
  }
});
