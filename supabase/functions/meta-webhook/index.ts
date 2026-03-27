import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ========== GET: Webhook Verification (Meta challenge) ==========
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('[meta-webhook] Verification request:', { mode, token: token?.substring(0, 4) + '***', challenge });

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[meta-webhook] ✅ Webhook verified successfully');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    console.error('[meta-webhook] ❌ Verification failed - token mismatch');
    return new Response('Forbidden', { status: 403 });
  }

  // ========== POST: Incoming webhook events ==========
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[meta-webhook] Received event:', JSON.stringify(body).substring(0, 500));

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Meta sends events in this structure:
      // { object: "whatsapp_business_account", entry: [...] }
      if (body.object !== 'whatsapp_business_account') {
        console.log('[meta-webhook] Ignoring non-WhatsApp event:', body.object);
        return new Response('OK', { status: 200 });
      }

      for (const entry of body.entry || []) {
        const wabaId = entry.id;
        const changes = entry.changes || [];

        for (const change of changes) {
          const field = change.field;
          const value = change.value;

          console.log(`[meta-webhook] WABA ${wabaId} | field: ${field}`);

          // Handle messages field (incoming messages + statuses)
          if (field === 'messages') {
              const messages = value.messages || [];
              const contacts = value.contacts || [];
              const metadata = value.metadata || {};
              const phoneNumberId = metadata.phone_number_id;
              const displayPhone = metadata.display_phone_number;

              for (const msg of messages) {
                const from = msg.from;
                const msgType = msg.type;
                const timestamp = msg.timestamp;
                const contactName = contacts.find((c: any) => c.wa_id === from)?.profile?.name || null;

                console.log(`[meta-webhook] 📩 Message from ${from} (${contactName}) to ${displayPhone} | type: ${msgType}`);

                let textContent = '';
                if (msgType === 'text') {
                  textContent = msg.text?.body || '';
                } else if (msgType === 'button') {
                  textContent = msg.button?.text || '';
                } else if (msgType === 'interactive') {
                  textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
                }

                await supabase.from('meta_webhook_events').insert({
                  waba_id: wabaId,
                  phone_number_id: phoneNumberId,
                  event_type: 'message',
                  from_phone: from,
                  contact_name: contactName,
                  message_type: msgType,
                  message_content: textContent,
                  raw_payload: msg,
                  received_at: new Date(parseInt(timestamp) * 1000).toISOString(),
                });
              }

              const statuses = value.statuses || [];
              for (const status of statuses) {
                console.log(`[meta-webhook] 📊 Status: ${status.status} for msg ${status.id} to ${status.recipient_id}`);

                await supabase.from('meta_webhook_events').insert({
                  waba_id: wabaId,
                  phone_number_id: value.metadata?.phone_number_id,
                  event_type: 'status',
                  from_phone: status.recipient_id,
                  message_type: status.status,
                  message_content: status.errors?.[0]?.message || null,
                  raw_payload: status,
                  received_at: new Date(parseInt(status.timestamp) * 1000).toISOString(),
                });
              }
          } else {
              // All other fields: template updates, account updates, security, flows, etc.
              console.log(`[meta-webhook] 📋 Event field=${field}:`, JSON.stringify(value).substring(0, 300));

              await supabase.from('meta_webhook_events').insert({
                waba_id: wabaId,
                event_type: field,
                message_type: value.event || value.status || field,
                message_content: JSON.stringify(value).substring(0, 1000),
                raw_payload: value,
              });
          }
        }
      }

      // Meta requires 200 response within 20 seconds
      return new Response('OK', { status: 200 });

    } catch (error) {
      console.error('[meta-webhook] Error processing event:', error);
      // Still return 200 to prevent Meta from retrying
      return new Response('OK', { status: 200 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
