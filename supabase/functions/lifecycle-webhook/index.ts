// --- Helpers locais (sem arquivos compartilhados) ---
const lifecycleCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
// --- fim dos helpers ---

// Resend webhook receiver for lifecycle emails.
// Maps provider events onto lifecycle_email_deliveries / lifecycle_email_events.
// Idempotent: the provider event id is stored with a unique index.
// Signature: Svix headers, verified when RESEND_WEBHOOK_SECRET is configured.

const EVENT_MAP: Record<string, { event: string; column?: string; status?: string }> = {
  "email.sent": { event: "sent", column: "sent_at", status: "sent" },
  "email.delivered": { event: "delivered", column: "delivered_at", status: "delivered" },
  "email.delivery_delayed": { event: "delayed" },
  "email.opened": { event: "opened", column: "opened_at", status: "opened" },
  "email.clicked": { event: "clicked", column: "clicked_at", status: "clicked" },
  "email.bounced": { event: "bounced", column: "bounced_at", status: "bounced" },
  "email.complained": { event: "complained", column: "complained_at", status: "complained" },
};

async function verifySvix(secret: string, req: Request, payload: string): Promise<boolean> {
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signatureHeader = req.headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));

  return signatureHeader
    .split(" ")
    .map((part) => part.split(",")[1])
    .some((sig) => sig === expected);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: lifecycleCors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";

  try {
    const raw = await req.text();

    if (webhookSecret) {
      const valid = await verifySvix(webhookSecret, req, raw);
      if (!valid) return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(raw);
    const type: string = payload?.type || "";
    const mapping = EVENT_MAP[type];
    if (!mapping) return new Response(JSON.stringify({ ignored: type }), { status: 200, headers: lifecycleCors });

    const messageId: string | undefined = payload?.data?.email_id || payload?.data?.id;
    const providerEventId = req.headers.get("svix-id") || `${type}:${messageId}:${payload?.created_at || ""}`;
    if (!messageId) return new Response(JSON.stringify({ ignored: "no_message_id" }), { status: 200, headers: lifecycleCors });

    const { data: delivery } = await supabase
      .from("lifecycle_email_deliveries")
      .select("id, campaign_id, step_id, user_id, recipient_email")
      .eq("provider_message_id", messageId)
      .maybeSingle();

    // Not one of ours (other Wiize emails also go through Resend) — acknowledge quietly.
    if (!delivery) return new Response(JSON.stringify({ ignored: "unknown_delivery" }), { status: 200, headers: lifecycleCors });

    const { error: eventError } = await supabase.from("lifecycle_email_events").insert({
      delivery_id: delivery.id,
      campaign_id: delivery.campaign_id,
      step_id: delivery.step_id,
      user_id: delivery.user_id,
      event_type: mapping.event,
      provider_event_id: providerEventId,
      link_url: payload?.data?.click?.link || null,
      metadata: { provider: "resend", type },
    });

    // Duplicate provider event (unique index) -> already processed.
    if (eventError && String(eventError.code) === "23505") {
      return new Response(JSON.stringify({ duplicate: true }), { status: 200, headers: lifecycleCors });
    }

    const at = payload?.created_at ? new Date(payload.created_at).toISOString() : new Date().toISOString();
    const patch: Record<string, unknown> = {};
    if (mapping.column) patch[mapping.column] = at;
    if (mapping.status) patch.status = mapping.status;
    if (Object.keys(patch).length) {
      await supabase.from("lifecycle_email_deliveries").update(patch).eq("id", delivery.id);
    }

    // Hard bounces and complaints stop future lifecycle email to that address.
    if (mapping.event === "bounced" || mapping.event === "complained") {
      await supabase
        .from("email_suppressions")
        .insert({ email: delivery.recipient_email, reason: mapping.event, source: "resend_webhook" });
      if (delivery.user_id) {
        await supabase
          .from("lifecycle_enrollments")
          .update({ status: "exited", exited_at: at, exit_reason: mapping.event })
          .eq("user_id", delivery.user_id)
          .eq("status", "active");
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...lifecycleCors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lifecycle-webhook error:", error);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: lifecycleCors });
  }
});
