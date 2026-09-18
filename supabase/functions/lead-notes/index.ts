import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const MESSAGE_PREFIX = "enc:v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let keyPromise: Promise<CryptoKey> | null = null;

function base64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function encryptionKey(): Promise<CryptoKey> {
  if (keyPromise) return keyPromise;
  const secret = Deno.env.get("WIIZE_MESSAGE_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("Message encryption is unavailable");
  keyPromise = crypto.subtle.digest("SHA-256", encoder.encode(secret)).then((raw) =>
    crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  );
  return keyPromise;
}

async function encryptValue(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    encoder.encode(value),
  );
  return `${MESSAGE_PREFIX}${bufferToBase64(iv.buffer)}:${bufferToBase64(ciphertext)}`;
}

async function decryptValue(value: unknown): Promise<string | null> {
  if (typeof value !== "string") return null;
  if (!value.startsWith(MESSAGE_PREFIX)) return value;
  const parts = value.slice(MESSAGE_PREFIX.length).split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted note format");
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(parts[0]) },
      await encryptionKey(),
      base64ToBuffer(parts[1]),
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error("Encrypted note could not be authenticated");
  }
}

async function safeDecrypt(value: unknown): Promise<string> {
  try {
    return (await decryptValue(value)) ?? "";
  } catch {
    return "[Nota indisponível]";
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_LENGTH = 4000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: claims, error: claimsError } = await admin.auth.getClaims(auth.slice(7));
    const callerId = claims?.claims?.sub as string | undefined;
    if (claimsError || !callerId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const leadId = typeof body.lead_id === "string" ? body.lead_id : "";
    if (!leadId) return json({ error: "lead_id is required" }, 400);

    const { data: ownerData } = await admin.rpc("get_account_owner", { _uid: callerId });
    const accountOwnerId = (ownerData as string) || callerId;

    // O contato precisa pertencer à conta do usuário autenticado.
    const { data: lead } = await admin
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", accountOwnerId)
      .maybeSingle();
    if (!lead) return json({ error: "Not found" }, 404);

    if (action === "list") {
      const { data, error } = await admin
        .from("lead_notes")
        .select("id, lead_id, user_id, content, reply_to_id, created_at")
        .eq("lead_id", leadId)
        .eq("owner_user_id", accountOwnerId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) return json({ error: "Unable to load notes" }, 500);

      const rows = data || [];
      const notes = await Promise.all(
        rows.map(async (row) => ({ ...row, content: await safeDecrypt(row.content) })),
      );

      const authorIds = [...new Set(notes.map((n) => n.user_id).filter(Boolean))];
      let authors: Record<string, { name: string | null; email: string | null; avatar_url: string | null }> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", authorIds);
        authors = Object.fromEntries(
          (profiles || []).map((p) => [p.id, { name: p.name, email: p.email, avatar_url: p.avatar_url }]),
        );
      }

      return json({ notes, authors });
    }

    if (action === "create") {
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (!content) return json({ error: "Conteúdo obrigatório" }, 400);
      if (content.length > MAX_LENGTH) return json({ error: "Nota muito longa" }, 400);

      const { data: rate } = await admin.rpc("check_rate_limit", {
        p_identifier: callerId,
        p_endpoint: "lead-notes-create",
        p_max_requests: 30,
        p_window_seconds: 60,
      });
      if (rate && (rate as Record<string, unknown>).allowed === false) {
        return json({ error: "Muitas mensagens em pouco tempo. Aguarde um instante." }, 429);
      }

      let replyToId: string | null = typeof body.reply_to_id === "string" ? body.reply_to_id : null;
      if (replyToId) {
        const { data: parent } = await admin
          .from("lead_notes")
          .select("id")
          .eq("id", replyToId)
          .eq("lead_id", leadId)
          .eq("owner_user_id", accountOwnerId)
          .maybeSingle();
        if (!parent) replyToId = null;
      }

      const { data, error } = await admin
        .from("lead_notes")
        .insert({
          lead_id: leadId,
          user_id: callerId,
          owner_user_id: accountOwnerId,
          content: await encryptValue(content),
          reply_to_id: replyToId,
        })
        .select("id, lead_id, user_id, reply_to_id, created_at")
        .single();
      if (error) return json({ error: "Unable to save note" }, 500);

      return json({ note: { ...data, content } });
    }

    if (action === "delete") {
      const noteId = typeof body.note_id === "string" ? body.note_id : "";
      if (!noteId) return json({ error: "note_id is required" }, 400);
      const { data: note } = await admin
        .from("lead_notes")
        .select("id, user_id")
        .eq("id", noteId)
        .eq("lead_id", leadId)
        .eq("owner_user_id", accountOwnerId)
        .maybeSingle();
      if (!note) return json({ error: "Not found" }, 404);
      if (note.user_id !== callerId && callerId !== accountOwnerId) {
        return json({ error: "Somente o autor pode excluir esta mensagem" }, 403);
      }
      const { error } = await admin.from("lead_notes").delete().eq("id", noteId);
      if (error) return json({ error: "Unable to delete note" }, 500);
      return json({ ok: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("[lead-notes] request failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unable to process notes" }, 500);
  }
});
