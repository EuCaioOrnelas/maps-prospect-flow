import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ISSUER = "Wiize";

// ---------- crypto helpers ----------
const enc = new TextEncoder();

async function aesKey(): Promise<CryptoKey> {
  const material = Deno.env.get("TOTP_ENCRYPTION_KEY") || SERVICE_KEY;
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`wiize-2fa:${material}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey();
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)));
  return `${b64(iv)}.${b64(ct)}`;
}

async function decryptSecret(payload: string): Promise<string> {
  const [ivB64, ctB64] = payload.split(".");
  const key = await aesKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(ivB64) }, key, unb64(ctB64));
  return new TextDecoder().decode(pt);
}

// ---------- base32 (RFC 4648, no padding) ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = B32.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

// ---------- TOTP ----------
async function totpAt(secretB32: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", base32Decode(secretB32), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const bin = ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

async function verifyTotp(secretB32: string, code: string): Promise<boolean> {
  const clean = (code || "").replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const counter = Math.floor(Date.now() / 30000);
  for (const drift of [-1, 0, 1]) {
    const expected = await totpAt(secretB32, counter + drift);
    // constant-time-ish comparison
    let diff = expected.length ^ clean.length;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ clean.charCodeAt(i);
    if (diff === 0) return true;
  }
  return false;
}

async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return Array.from(d).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genRecoveryCodes(n = 10): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const raw = Array.from(bytes).map((b) => alphabet[b % alphabet.length]).join("");
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

function jwtPayload(token: string): any {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch { return {}; }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const payload = jwtPayload(token);
    const sessionId: string = payload?.session_id || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body?.action || "status";

    const audit = async (act: string, meta: Record<string, unknown> = {}, targetUser = user.id) => {
      await admin.from("security_audit_log").insert({
        user_id: targetUser,
        action: act,
        resource_type: "two_factor",
        resource_id: targetUser,
        ip_address: ip,
        user_agent: ua,
        metadata: meta, // nunca inclui secret / códigos
      });
    };

    const loadRow = async () => {
      const { data } = await admin.from("user_security").select("*").eq("user_id", user.id).maybeSingle();
      return data as any | null;
    };

    // ---------------- STATUS ----------------
    if (action === "status") {
      const row = await loadRow();
      let sessionVerified = true;
      if (row?.two_factor_enabled) {
        const { data: s } = await admin
          .from("user_mfa_sessions")
          .select("session_id")
          .eq("user_id", user.id)
          .eq("session_id", sessionId)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        sessionVerified = !!s;
      }
      const { count } = await admin
        .from("user_recovery_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);
      return json({
        two_factor_enabled: !!row?.two_factor_enabled,
        enabled_at: row?.enabled_at ?? null,
        session_verified: sessionVerified,
        recovery_codes_left: count ?? 0,
      });
    }

    // ---------------- ENROLL START ----------------
    if (action === "enroll_start") {
      const row = await loadRow();
      if (row?.two_factor_enabled) return json({ error: "already_enabled" }, 400);
      const secret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));
      const encrypted = await encryptSecret(secret);
      await admin.from("user_security").upsert({
        user_id: user.id,
        pending_secret_encrypted: encrypted,
        pending_created_at: new Date().toISOString(),
        two_factor_enabled: false,
      }, { onConflict: "user_id" });
      const label = encodeURIComponent(`${ISSUER}:${user.email ?? user.id}`);
      const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${ISSUER}&algorithm=SHA1&digits=6&period=30`;
      await audit("2fa_enroll_started");
      return json({ otpauth_url: otpauth, secret });
    }

    // ---------------- ENROLL VERIFY ----------------
    if (action === "enroll_verify") {
      const row = await loadRow();
      if (!row?.pending_secret_encrypted) return json({ error: "no_pending_enrollment" }, 400);
      if (row.locked_until && new Date(row.locked_until) > new Date()) return json({ error: "locked", locked_until: row.locked_until }, 429);

      const secret = await decryptSecret(row.pending_secret_encrypted);
      const ok = await verifyTotp(secret, String(body.code || ""));
      if (!ok) {
        const attempts = (row.failed_attempts || 0) + 1;
        await admin.from("user_security").update({
          failed_attempts: attempts,
          locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
        }).eq("user_id", user.id);
        await audit("2fa_invalid_code", { context: "enroll", attempts });
        return json({ error: "invalid_code" }, 400);
      }

      await admin.from("user_security").update({
        two_factor_enabled: true,
        totp_secret_encrypted: row.pending_secret_encrypted,
        pending_secret_encrypted: null,
        pending_created_at: null,
        enabled_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        failed_attempts: 0,
        locked_until: null,
      }).eq("user_id", user.id);

      const codes = genRecoveryCodes();
      await admin.from("user_recovery_codes").delete().eq("user_id", user.id);
      await admin.from("user_recovery_codes").insert(
        await Promise.all(codes.map(async (c) => ({ user_id: user.id, code_hash: await sha256Hex(c) }))),
      );

      if (sessionId) {
        await admin.from("user_mfa_sessions").upsert({
          session_id: sessionId, user_id: user.id, ip_address: ip, user_agent: ua,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
        }, { onConflict: "session_id" });
      }

      await audit("2fa_enabled");
      return json({ success: true, recovery_codes: codes });
    }

    // ---------------- CHALLENGE (login step) ----------------
    if (action === "challenge_verify") {
      const row = await loadRow();
      if (!row?.two_factor_enabled || !row.totp_secret_encrypted) return json({ error: "not_enabled" }, 400);
      if (row.locked_until && new Date(row.locked_until) > new Date()) return json({ error: "locked", locked_until: row.locked_until }, 429);

      const rawCode = String(body.code || "").trim();
      let ok = false;
      let usedRecovery = false;

      if (/^\d{6}$/.test(rawCode.replace(/\s/g, ""))) {
        ok = await verifyTotp(await decryptSecret(row.totp_secret_encrypted), rawCode);
      } else if (rawCode.length >= 8) {
        const hash = await sha256Hex(rawCode.toUpperCase());
        const { data: rc } = await admin
          .from("user_recovery_codes")
          .select("id")
          .eq("user_id", user.id)
          .eq("code_hash", hash)
          .is("used_at", null)
          .maybeSingle();
        if (rc) {
          await admin.from("user_recovery_codes").update({ used_at: new Date().toISOString() })
            .eq("id", (rc as any).id).is("used_at", null);
          ok = true;
          usedRecovery = true;
        }
      }

      if (!ok) {
        const attempts = (row.failed_attempts || 0) + 1;
        await admin.from("user_security").update({
          failed_attempts: attempts,
          locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
        }).eq("user_id", user.id);
        await audit("2fa_invalid_code", { context: "login", attempts });
        return json({ error: "invalid_code", attempts_left: Math.max(0, 5 - attempts) }, 400);
      }

      await admin.from("user_security").update({
        failed_attempts: 0, locked_until: null, last_verified_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      if (sessionId) {
        await admin.from("user_mfa_sessions").upsert({
          session_id: sessionId, user_id: user.id, ip_address: ip, user_agent: ua,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
        }, { onConflict: "session_id" });
      }

      await audit(usedRecovery ? "2fa_recovery_code_used" : "2fa_login_verified");
      return json({ success: true, used_recovery: usedRecovery });
    }

    // ---------------- DISABLE (step-up: senha + código) ----------------
    if (action === "disable") {
      const row = await loadRow();
      if (!row?.two_factor_enabled) return json({ error: "not_enabled" }, 400);

      const password = String(body.password || "");
      if (!password || !user.email) return json({ error: "password_required" }, 400);
      const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || SERVICE_KEY, { auth: { persistSession: false } });
      const { error: pwErr } = await anon.auth.signInWithPassword({ email: user.email, password });
      if (pwErr) { await audit("2fa_disable_denied", { reason: "invalid_password" }); return json({ error: "invalid_password" }, 400); }

      const ok = await verifyTotp(await decryptSecret(row.totp_secret_encrypted), String(body.code || ""));
      if (!ok) { await audit("2fa_disable_denied", { reason: "invalid_code" }); return json({ error: "invalid_code" }, 400); }

      await admin.from("user_security").update({
        two_factor_enabled: false, totp_secret_encrypted: null, pending_secret_encrypted: null,
        enabled_at: null, failed_attempts: 0, locked_until: null,
      }).eq("user_id", user.id);
      await admin.from("user_recovery_codes").delete().eq("user_id", user.id);
      await admin.from("user_mfa_sessions").delete().eq("user_id", user.id);
      await audit("2fa_disabled");
      return json({ success: true });
    }

    // ---------------- REGENERATE RECOVERY CODES ----------------
    if (action === "regenerate_recovery") {
      const row = await loadRow();
      if (!row?.two_factor_enabled) return json({ error: "not_enabled" }, 400);
      const ok = await verifyTotp(await decryptSecret(row.totp_secret_encrypted), String(body.code || ""));
      if (!ok) { await audit("2fa_invalid_code", { context: "regenerate" }); return json({ error: "invalid_code" }, 400); }
      const codes = genRecoveryCodes();
      await admin.from("user_recovery_codes").delete().eq("user_id", user.id);
      await admin.from("user_recovery_codes").insert(
        await Promise.all(codes.map(async (c) => ({ user_id: user.id, code_hash: await sha256Hex(c) }))),
      );
      await audit("2fa_recovery_codes_regenerated");
      return json({ success: true, recovery_codes: codes });
    }

    // ---------------- OWNER: RESET DO 2FA DE UM SUBUSUÁRIO ----------------
    if (action === "admin_reset_member") {
      const memberId = String(body.member_user_id || "");
      if (!memberId) return json({ error: "member_user_id_required" }, 400);
      if (memberId === user.id) return json({ error: "use_disable_instead" }, 400);

      const { data: member } = await admin
        .from("profiles").select("id, parent_owner_id, email").eq("id", memberId).maybeSingle();
      if (!member || (member as any).parent_owner_id !== user.id) {
        await audit("2fa_admin_reset_denied", { target: memberId });
        return json({ error: "forbidden" }, 403);
      }

      const password = String(body.password || "");
      if (!password || !user.email) return json({ error: "password_required" }, 400);
      const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || SERVICE_KEY, { auth: { persistSession: false } });
      const { error: pwErr } = await anon.auth.signInWithPassword({ email: user.email, password });
      if (pwErr) return json({ error: "invalid_password" }, 400);

      await admin.from("user_security").update({
        two_factor_enabled: false, totp_secret_encrypted: null, pending_secret_encrypted: null,
        enabled_at: null, failed_attempts: 0, locked_until: null,
      }).eq("user_id", memberId);
      await admin.from("user_recovery_codes").delete().eq("user_id", memberId);
      await admin.from("user_mfa_sessions").delete().eq("user_id", memberId);

      await admin.from("security_audit_log").insert({
        user_id: user.id,
        action: "2fa_admin_reset",
        resource_type: "two_factor",
        resource_id: memberId,
        ip_address: ip,
        user_agent: ua,
        metadata: { performed_by_owner: true },
      });
      return json({ success: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[security-2fa]", (e as Error).message);
    return json({ error: "internal_error" }, 500);
  }
});
