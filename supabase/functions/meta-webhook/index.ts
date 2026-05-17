import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ---------- Rate limiter (per-isolate, sliding window 60s) ----------
// Limites generosos vs tráfego real da Meta (~poucos eventos/s), agressivos vs flood.
const RL_WINDOW_MS = 60_000;
const RL_IP_MAX = 240;            // requests/min por IP
const RL_EVENT_MAX = 600;         // eventos/min por (waba_id|field)
const rlBuckets = new Map<string, number[]>();
function rlHit(key: string, max: number): boolean {
  const now = Date.now();
  const arr = rlBuckets.get(key) || [];
  const fresh = arr.filter((t) => now - t < RL_WINDOW_MS);
  fresh.push(now);
  rlBuckets.set(key, fresh);
  if (rlBuckets.size > 5000) {
    for (const [k, v] of rlBuckets) {
      if (!v.length || now - v[v.length - 1] > RL_WINDOW_MS) rlBuckets.delete(k);
    }
  }
  return fresh.length > max;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ========== GET: Webhook Verification ==========
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    console.log('[meta-webhook] Verification request:', { mode, token: token?.substring(0, 4) + '***', challenge });
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[meta-webhook] ✅ Webhook verified');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // ========== POST: Incoming events ==========
  if (req.method === 'POST') {
    try {
      const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';

      // ---------- Payload size guard (DoS protection) ----------
      // Meta webhook payloads are typically <50KB. Hard cap at 1MB.
      const MAX_PAYLOAD_BYTES = 1_048_576; // 1 MB
      const contentLengthHeader = req.headers.get('content-length');
      if (contentLengthHeader) {
        const declared = parseInt(contentLengthHeader, 10);
        if (Number.isFinite(declared) && declared > MAX_PAYLOAD_BYTES) {
          console.warn('[meta-webhook] 🚫 Rejected — payload too large (declared)', declared);
          return new Response('Payload Too Large', { status: 413, headers: corsHeaders });
        }
      }

      // Read raw body once for HMAC + parsing
      const rawBody = await req.text();

      // Verify actual size (defense in depth — header could be missing/lying)
      if (rawBody.length > MAX_PAYLOAD_BYTES) {
        console.warn('[meta-webhook] 🚫 Rejected — payload too large (actual)', rawBody.length);
        return new Response('Payload Too Large', { status: 413, headers: corsHeaders });
      }
      const sigHeader = req.headers.get('x-hub-signature-256') || req.headers.get('X-Hub-Signature-256') || '';
      const reqIp = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '').split(',')[0].trim();
      const reqUserAgent = req.headers.get('user-agent') || '';

      // ---------- Rate limit por IP (antes de qualquer trabalho pesado) ----------
      if (reqIp && rlHit(`ip:${reqIp}`, RL_IP_MAX)) {
        console.warn('[meta-webhook] 🚫 Rate limit IP', reqIp);
        return new Response('Too Many Requests', {
          status: 429,
          headers: { ...corsHeaders, 'Retry-After': '60' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // ---------- Security helpers ----------
      async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
        const key = await crypto.subtle.importKey(
          'raw', new TextEncoder().encode(secret),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
        return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
      function timingSafeEqual(a: string, b: string): boolean {
        if (a.length !== b.length) return false;
        let r = 0;
        for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return r === 0;
      }
      // Meta / Facebook IPv4 ranges (AS32934 — public webhook origins)
      const META_CIDRS: Array<[number, number]> = [
        ['31.13.24.0', 21], ['31.13.64.0', 18], ['66.220.144.0', 20],
        ['69.63.176.0', 20], ['69.171.224.0', 19], ['74.119.76.0', 22],
        ['103.4.96.0', 22], ['129.134.0.0', 16], ['157.240.0.0', 16],
        ['173.252.64.0', 18], ['179.60.192.0', 22], ['185.60.216.0', 22],
        ['204.15.20.0', 22],
      ].map(([ip, bits]) => {
        const parts = (ip as string).split('.').map(Number);
        const ipInt = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
        return [ipInt, bits as number];
      });
      function ipInMetaRanges(ip: string): boolean {
        if (!ip) return false;
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;
        const ipInt = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
        for (const [base, bits] of META_CIDRS) {
          const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
          if ((ipInt & mask) === (base & mask)) return true;
        }
        return false;
      }
      async function logSecurityEvent(params: {
        user_id: string | null;
        action: string;
        waba_id?: string | null;
        extra?: Record<string, unknown>;
      }) {
        try {
          await supabase.from('security_audit_log').insert({
            user_id: params.user_id,
            action: params.action,
            resource_type: 'meta_webhook',
            resource_id: params.waba_id || null,
            ip_address: reqIp || null,
            user_agent: reqUserAgent || null,
            metadata: params.extra || {},
          });
        } catch (e) {
          console.warn('[meta-webhook] audit log failed', (e as Error).message);
        }
      }

      // Parse body (after capturing raw for HMAC)
      let body: any;
      try { body = JSON.parse(rawBody); } catch {
        return new Response('Bad payload', { status: 400, headers: corsHeaders });
      }
      console.log('[meta-webhook] Received:', JSON.stringify(body).substring(0, 500));

      // Resolve owner(s) from WABA id(s) for audit logging.
      // Security (HMAC + IP allowlist + audit) is ALWAYS enforced — not user-configurable.
      const wabaIds = Array.from(new Set(
        (body?.entry || []).map((e: any) => String(e?.id || '')).filter(Boolean)
      ));
      let ownerSettings: Array<{ user_id: string; waba_id: string }> = [];
      if (wabaIds.length) {
        const { data: conns } = await supabase
          .from('user_waba_connections')
          .select('user_id, waba_id')
          .in('waba_id', wabaIds);
        ownerSettings = (conns || []).map((c: any) => ({ user_id: c.user_id, waba_id: c.waba_id }));
      }

      // ---------- 1) HMAC validation (mandatory when app secret configured) ----------
      let hmacStatus: 'verified' | 'missing' | 'invalid' | 'no_secret' = 'no_secret';
      if (META_APP_SECRET) {
        if (sigHeader) {
          const expected = 'sha256=' + (await hmacSha256Hex(META_APP_SECRET, rawBody));
          hmacStatus = timingSafeEqual(sigHeader, expected) ? 'verified' : 'invalid';
        } else {
          hmacStatus = 'missing';
        }
      }
      if (hmacStatus === 'invalid' || hmacStatus === 'missing') {
        for (const o of ownerSettings) {
          await logSecurityEvent({
            user_id: o.user_id, waba_id: o.waba_id,
            action: hmacStatus === 'invalid' ? 'meta_webhook_rejected_hmac_invalid' : 'meta_webhook_rejected_hmac_missing',
            extra: { reason: hmacStatus },
          });
        }
        console.warn('[meta-webhook] 🚫 Rejected — HMAC', hmacStatus);
        if (META_APP_SECRET) {
          return new Response('Unauthorized', { status: 401, headers: corsHeaders });
        }
      }

      // ---------- 2) IP allowlist (Meta CIDR ranges) — always enforced ----------
      const ipOk = !reqIp || ipInMetaRanges(reqIp);
      if (!ipOk) {
        for (const o of ownerSettings) {
          await logSecurityEvent({
            user_id: o.user_id, waba_id: o.waba_id,
            action: 'meta_webhook_rejected_ip',
            extra: { ip: reqIp },
          });
        }
        console.warn('[meta-webhook] 🚫 Rejected — IP', reqIp);
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }

      // ---------- 3) Audit log accepted webhook (always) ----------
      for (const o of ownerSettings) {
        await logSecurityEvent({
          user_id: o.user_id, waba_id: o.waba_id,
          action: 'meta_webhook_accepted',
          extra: {
            hmac: hmacStatus,
            ip_in_meta_range: ipOk,
            fields: Array.from(new Set((body?.entry || []).flatMap((e: any) => (e?.changes || []).map((c: any) => c.field)))),
          },
        });
      }


      // Helper: normalize Brazilian phone to E.164 for revenue scoring
      // Returns the digits-only normalized phone (no '+') or null when invalid
      function normalizeBrazilianMobileE164(phone: string): string | null {
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits || digits.length < 10) return null;
        if (digits.startsWith('120363')) return null; // group IDs

        // Already 13-digit BR mobile: 55 + DD + 9XXXXXXXX
        if (digits.length === 13 && digits.startsWith('55')) {
          const ddd = Number(digits.slice(2, 4));
          if (ddd >= 11 && ddd <= 99) return digits;
          return null;
        }

        // 12-digit BR: 55 + DD + 8-digit (Meta sometimes strips the leading 9)
        if (digits.length === 12 && digits.startsWith('55')) {
          const ddd = Number(digits.slice(2, 4));
          if (ddd >= 11 && ddd <= 99) {
            // Add leading 9 to make it a valid 13-digit mobile
            return `55${digits.slice(2, 4)}9${digits.slice(4)}`;
          }
          return null;
        }

        // 11-digit local BR: DD + 9 + 8
        if (digits.length === 11) {
          const ddd = Number(digits.slice(0, 2));
          if (ddd >= 11 && ddd <= 99) return `55${digits}`;
        }

        // 10-digit local BR missing 9th digit
        if (digits.length === 10) {
          const ddd = Number(digits.slice(0, 2));
          if (ddd >= 11 && ddd <= 99) {
            return `55${digits.slice(0, 2)}9${digits.slice(2)}`;
          }
        }

        // International numbers (non-BR)
        if (digits.length >= 10 && !digits.startsWith('55')) return digits;
        return null;
      }

      // Helper: get last 8 digits for flexible CRM lead matching
      function phoneTail8(phone: string): string {
        return String(phone || '').replace(/\D/g, '').slice(-8);
      }

      // Helper: update CRM lead whatsapp_status by phone match (last 8 digits)
      async function updateLeadStatus(params: {
        user_id: string;
        phone: string;
        direction: 'inbound' | 'outbound';
        timestamp: string;
      }) {
        try {
          const tail = phoneTail8(params.phone);
          if (!tail || tail.length < 8) return;

          const { data: leads } = await supabase
            .from('leads')
            .select('id, whatsapp_status, first_message_sent')
            .eq('user_id', params.user_id)
            .ilike('phone', `%${tail}`)
            .limit(5);

          if (!leads || leads.length === 0) return;

          for (const lead of leads) {
            const updates: any = { updated_at: new Date().toISOString() };

            if (params.direction === 'inbound') {
              updates.whatsapp_status = 'replied';
              updates.has_responded = true;
              updates.last_response_at = params.timestamp;
              updates.responded_at = params.timestamp;
            } else {
              // outbound: mark as message_sent if not already in a deeper state
              const current = lead.whatsapp_status || 'never_contacted';
              if (current === 'never_contacted' || current === 'no_response') {
                updates.whatsapp_status = 'message_sent';
              } else if (current === 'replied') {
                updates.whatsapp_status = 'in_conversation';
              }
              updates.first_message_sent = true;
              if (!lead.first_message_sent) {
                updates.first_message_sent_at = params.timestamp;
              }
              updates.last_message_sent_at = params.timestamp;
            }

            await supabase.from('leads').update(updates).eq('id', lead.id);
          }
          console.log(`[meta-webhook] 🏷️ Updated ${leads.length} lead(s) status (${params.direction}) for tail ${tail}`);
        } catch (e) {
          console.error('[meta-webhook] updateLeadStatus error:', e);
        }
      }

      // Helper: fire revenue event for lead scoring
      async function fireRevenueEvent(params: {
        user_id: string;
        phone_e164: string;
        direction: 'inbound' | 'outbound';
        message_content?: string;
        lead_name?: string;
      }) {
        try {
          const { data: revenueResult, error } = await supabase.functions.invoke('revenue-processor', {
            body: { action: 'process_message', source: 'meta', ...params },
          });
          if (error) {
            console.error('[meta-webhook] Revenue processor invoke failed:', error);
          } else if (revenueResult?.success === false) {
            console.log('[meta-webhook] Revenue processor skipped:', revenueResult);
          } else {
            console.log('[meta-webhook] ✅ Revenue event processed:', revenueResult?.score, revenueResult?.bucket);
          }
        } catch (e) {
          console.error('[meta-webhook] Revenue event fire error:', e);
        }
      }

      if (body.object !== 'whatsapp_business_account') {
        return new Response('OK', { status: 200 });
      }

      for (const entry of body.entry || []) {
        const wabaId = entry.id;
        const changes = entry.changes || [];

        for (const change of changes) {
          const field = change.field;
          const value = change.value;

          // ---------- Rate limit por evento (WABA + tipo) ----------
          if (rlHit(`evt:${wabaId}:${field}`, RL_EVENT_MAX)) {
            console.warn(`[meta-webhook] 🚫 Rate limit evento ${field} em WABA ${wabaId} — descartando`);
            continue;
          }

          console.log(`[meta-webhook] WABA ${wabaId} | field: ${field}`);

          if (field === 'messages') {
            const messages = value.messages || [];
            const contacts = value.contacts || [];
            const metadata = value.metadata || {};
            const phoneNumberId = metadata.phone_number_id;
            const displayPhone = metadata.display_phone_number;

            // Find WABA connection for this phone_number_id
            const { data: wabaConn } = await supabase
              .from('user_waba_connections')
              .select('id, user_id')
              .eq('phone_number_id', phoneNumberId)
              .eq('status', 'active')
              .maybeSingle();

            for (const msg of messages) {
              const from = msg.from;
              const msgType = msg.type;
              const timestamp = msg.timestamp;
              const contactName = contacts.find((c: any) => c.wa_id === from)?.profile?.name || null;

              console.log(`[meta-webhook] 📩 Message from ${from} (${contactName}) to ${displayPhone} | type: ${msgType}`);

              let textContent = '';
              let mediaUrl = null;
              let mediaMime = null;
              let mediaFilename = null;

              if (msgType === 'text') {
                textContent = msg.text?.body || '';
              } else if (msgType === 'button') {
                textContent = msg.button?.text || '';
              } else if (msgType === 'interactive') {
                textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
              } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(msgType)) {
                const media = msg[msgType];
                if (media) {
                  textContent = media.caption || '';
                  mediaMime = media.mime_type || null;
                  mediaFilename = media.filename || null;
                  // Media ID needs to be downloaded via Graph API - store ID for now
                  mediaUrl = media.id ? `meta_media:${media.id}` : null;
                }
              }

              // Log to meta_webhook_events
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

              // ===== CHAT SYSTEM INTEGRATION =====
              if (wabaConn) {
                const userId = wabaConn.user_id;
                const connectionId = wabaConn.id;
                const msgTime = new Date(parseInt(timestamp) * 1000).toISOString();

                // Find or create conversation
                let { data: conversation } = await supabase
                  .from('chat_conversations')
                  .select('id, unread_count')
                  .eq('user_id', userId)
                  .eq('waba_connection_id', connectionId)
                  .eq('contact_phone', from)
                  .maybeSingle();

                const lastText = msgType === 'text' ? textContent
                  : msgType === 'image' ? '📷 Imagem'
                  : msgType === 'video' ? '🎥 Vídeo'
                  : msgType === 'audio' ? '🎤 Áudio'
                  : msgType === 'document' ? `📄 ${mediaFilename || 'Documento'}`
                  : msgType === 'sticker' ? '🏷️ Sticker'
                  : textContent || msgType;

                if (!conversation) {
                  const { data: newConv } = await supabase.from('chat_conversations').insert({
                    user_id: userId,
                    waba_connection_id: connectionId,
                    contact_phone: from,
                    contact_name: contactName,
                    last_message_text: lastText,
                    last_message_at: msgTime,
                    last_message_type: msgType,
                    last_message_direction: 'inbound',
                    unread_count: 1,
                  }).select('id, unread_count').single();
                  conversation = newConv;
                } else {
                  await supabase.from('chat_conversations').update({
                    contact_name: contactName || undefined,
                    last_message_text: lastText,
                    last_message_at: msgTime,
                    last_message_type: msgType,
                    last_message_direction: 'inbound',
                    unread_count: (conversation.unread_count || 0) + 1,
                  }).eq('id', conversation.id);
                }

                if (conversation) {
                  await supabase.from('chat_messages').insert({
                    conversation_id: conversation.id,
                    user_id: userId,
                    waba_message_id: msg.id || null,
                    direction: 'inbound',
                    message_type: msgType,
                    content: textContent || null,
                    media_url: mediaUrl,
                    media_mime_type: mediaMime,
                    media_filename: mediaFilename,
                    media_caption: msgType !== 'text' ? (textContent || null) : null,
                    status: 'delivered',
                  });
                  console.log(`[meta-webhook] ✅ Chat message saved for conversation ${conversation.id}`);

                  // === CRM LEAD STATUS: mark as 'replied' on inbound ===
                  await updateLeadStatus({
                    user_id: userId,
                    phone: from,
                    direction: 'inbound',
                    timestamp: msgTime,
                  });

                  // === REVENUE SCORING: Fire event for inbound messages ===
                  const normalizedPhone = normalizeBrazilianMobileE164(from);
                  if (normalizedPhone) {
                    await fireRevenueEvent({
                      user_id: userId,
                      phone_e164: normalizedPhone,
                      direction: 'inbound',
                      message_content: textContent || undefined,
                      lead_name: contactName || undefined,
                    });
                    console.log(`[meta-webhook] 📊 Revenue event fired for ${normalizedPhone}`);
                  } else {
                    console.log(`[meta-webhook] ⚠️ Phone ${from} could not be normalized for scoring`);
                  }

                  // === WA FLOW RUNNER (production flows) ===
                  try {
                    const phoneForFlow = normalizedPhone || from.replace(/\D/g, '');
                    const buttonId = msg.button?.payload || msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || null;
                    const buttonTitle = msg.button?.text || msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || null;
                    const SB_URL = Deno.env.get('SUPABASE_URL')!;
                    const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                    await fetch(`${SB_URL}/functions/v1/wa-flow-runner`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SB_KEY}` },
                      body: JSON.stringify({
                        user_id: userId,
                        lead_phone: phoneForFlow,
                        lead_name: contactName || null,
                        incoming_text: textContent || null,
                        button_id: buttonId,
                        button_title: buttonTitle,
                        source: 'meta',
                        waba_connection_id: connectionId,
                        phone_number_id: value.metadata?.phone_number_id,
                      }),
                    }).catch((e) => console.error('[meta-webhook] wa-flow-runner failed:', e));
                  } catch (e) {
                    console.error('[meta-webhook] wa-flow-runner error:', e);
                  }
                }
              }
            }

            // Handle statuses
            const statuses = value.statuses || [];
            for (const status of statuses) {
              console.log(`[meta-webhook] 📊 Status: ${status.status} for msg ${status.id}`);

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

              // Update chat message status
              if (status.id && status.status) {
                const statusMap: Record<string, string> = {
                  'sent': 'sent',
                  'delivered': 'delivered',
                  'read': 'read',
                  'failed': 'failed',
                };
                const newStatus = statusMap[status.status];
                if (newStatus) {
                  await supabase.from('chat_messages')
                    .update({
                      status: newStatus,
                      status_updated_at: new Date(parseInt(status.timestamp) * 1000).toISOString(),
                    })
                    .eq('waba_message_id', status.id);
                  console.log(`[meta-webhook] ✅ Message ${status.id} status → ${newStatus}`);
                }
              }
            }
          } else {
            console.log(`[meta-webhook] 📋 Event field=${field}:`, JSON.stringify(value).substring(0, 300));
            await supabase.from('meta_webhook_events').insert({
              waba_id: wabaId,
              event_type: field,
              message_type: value.event || value.status || field,
              message_content: JSON.stringify(value).substring(0, 1000),
              raw_payload: value,
            });

            // === Quality drop notification (yellow / red) ===
            if (field === 'phone_number_quality_update') {
              const newQuality = String(value.new_quality_score || value.new_quality || '').toUpperCase();
              const oldQuality = String(value.old_quality_score || value.old_quality || '').toUpperCase();
              const displayPhone = value.display_phone_number || '';
              if (newQuality === 'YELLOW' || newQuality === 'RED') {
                const { data: wabaConn } = await supabase
                  .from('user_waba_connections')
                  .select('id, user_id, display_phone_number, business_name')
                  .eq('waba_id', wabaId)
                  .maybeSingle();
                if (wabaConn) {
                  const today = new Date().toISOString().slice(0, 10);
                  try {
                    await supabase.functions.invoke('send-email', {
                      body: {
                        user_id: wabaConn.user_id,
                        email_type: 'META_QUALITY_DROP',
                        idempotency_key: `meta-quality-${wabaConn.id}-${newQuality}-${today}`,
                        meta_pref_key: 'notify_quality_drop',
                        payload: {
                          phone_number: displayPhone || wabaConn.display_phone_number,
                          business_name: wabaConn.business_name,
                          new_quality: newQuality,
                          old_quality: oldQuality,
                        },
                      },
                    });
                  } catch (e) {
                    console.error('[meta-webhook] quality email error:', e);
                  }
                }
              }
            }
          }
        }
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('[meta-webhook] Error:', error);
      return new Response('OK', { status: 200 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
