// Worker de mensagens agendadas do Chat.
// Executado por cron (pg_cron + pg_net). Arquivo único, sem imports compartilhados.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const META_API_VERSION = Deno.env.get("META_API_VERSION") ?? "v25.0";
const MESSAGE_PREFIX = "enc:v1:";
const messageEncoder = new TextEncoder();
let messageKeyPromise: Promise<CryptoKey> | null = null;

function messageBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function messageEncryptionKey(): Promise<CryptoKey> {
  if (messageKeyPromise) return messageKeyPromise;
  const secret = Deno.env.get("WIIZE_MESSAGE_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("Message encryption is unavailable");
  messageKeyPromise = crypto.subtle.digest("SHA-256", messageEncoder.encode(secret)).then((raw) =>
    crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt"])
  );
  return messageKeyPromise;
}
async function encryptMessageValue(value: unknown): Promise<string | null> {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.startsWith(MESSAGE_PREFIX)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await messageEncryptionKey(),
    messageEncoder.encode(value),
  );
  return `${MESSAGE_PREFIX}${messageBytesToBase64(iv)}:${messageBytesToBase64(new Uint8Array(ciphertext))}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Claim atômico: marca pending -> processing com FOR UPDATE SKIP LOCKED e
    // devolve apenas o que esta execução reivindicou. Duas execuções simultâneas
    // nunca recebem a mesma linha.
    const { data: due, error: dueError } = await supabase
      .rpc("claim_chat_scheduled_messages", { _limit: 40 });

    if (dueError) throw dueError;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const row of due as any[]) {
      try {
        const { data: connection } = await supabase
          .from("user_waba_connections")
          .select("access_token, provider, evolution_instance_name, phone_number_id, user_id, owner_user_id")
          .eq("id", row.waba_connection_id)
          .maybeSingle();

        if (!connection) throw new Error("Conexão do WhatsApp não encontrada");

        const isEvolution = connection.provider === "evolution";
        if (isEvolution && row.kind === "template") {
          throw new Error("Templates são exclusivos do número Meta oficial");
        }

        const to = String(row.contact_phone || "").replace(/\D/g, "");
        const previewText = row.kind === "template"
          ? `[Template] ${row.template_name || ""}`
          : (row.content || "");

        // 1) Persiste a mensagem criptografada como pendente
        const { data: inserted, error: insertError } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: row.conversation_id,
            user_id: row.created_by,
            owner_user_id: row.owner_user_id,
            direction: "outbound",
            message_type: "text",
            content: await encryptMessageValue(previewText),
            status: "pending",
            metadata: { scheduled_message_id: row.id, scheduled_at: row.scheduled_at },
          })
          .select("id")
          .single();
        if (insertError || !inserted) throw new Error("Não foi possível registrar a mensagem");

        // 2) Envia pelo provedor correto
        let wabaMessageId: string | null = null;
        let errorMessage: string | null = null;

        if (isEvolution) {
          const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
          const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
          const res = await fetch(`${EVO_URL}/message/sendText/${connection.evolution_instance_name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: EVO_KEY },
            body: JSON.stringify({ number: to, text: row.content || "" }),
          });
          const result = await res.json().catch(() => ({}));
          wabaMessageId = result?.key?.id || null;
          if (!res.ok || !wabaMessageId) {
            errorMessage = result?.response?.message?.[0] || result?.message || `Evolution ${res.status}`;
          }
        } else {
          const payload: Record<string, unknown> = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
          };
          if (row.kind === "template") {
            payload.type = "template";
            payload.template = {
              name: row.template_name,
              language: { code: row.template_language || "pt_BR" },
            };
          } else {
            payload.type = "text";
            payload.text = { body: row.content || "" };
          }
          const res = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${connection.phone_number_id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${connection.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            },
          );
          const result = await res.json().catch(() => ({}));
          wabaMessageId = result?.messages?.[0]?.id || null;
          if (!res.ok || !wabaMessageId) errorMessage = result?.error?.message || `Meta ${res.status}`;
        }

        if (errorMessage) {
          await supabase.from("chat_messages").update({
            status: "failed",
            metadata: { error: errorMessage, scheduled_message_id: row.id },
            status_updated_at: new Date().toISOString(),
          }).eq("id", inserted.id);
          throw new Error(errorMessage);
        }

        await supabase.from("chat_messages").update({
          status: "sent",
          waba_message_id: wabaMessageId,
          status_updated_at: new Date().toISOString(),
        }).eq("id", inserted.id);

        await supabase.from("chat_conversations").update({
          last_message_text: await encryptMessageValue(previewText),
          last_message_at: new Date().toISOString(),
          last_message_type: "text",
          last_message_direction: "outbound",
        }).eq("id", row.conversation_id);

        await supabase.from("chat_scheduled_messages").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          waba_message_id: wabaMessageId,
          error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);

        sent++;
      } catch (err) {
        failed++;
        await supabase.from("chat_scheduled_messages").update({
          status: "failed",
          error: err instanceof Error ? err.message : "Erro desconhecido",
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({ processed: due.length, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[chat-scheduled-sender] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
