import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "wiize_referral";
const COOKIE_KEY = "wiize_ref";
const COOKIE_DAYS = 365 * 2; // 2 years (last-click persistence)

interface StoredReferral {
  code: string;
  partner_id: string;
  click_id: string;
  referral_link_id?: string | null;
  ts: number;
}

function setCookie(name: string, value: string, days: number) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  } catch {}
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  } catch { return null; }
}

export function getStoredReferral(): StoredReferral | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || getCookie(COOKIE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.code || !parsed.partner_id) return null;
    return parsed;
  } catch { return null; }
}

function persistReferral(data: StoredReferral) {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
    setCookie(COOKIE_KEY, json, COOKIE_DAYS);
  } catch {}
}

/**
 * Captures ?ref= from URL on every public route change, registers a click,
 * and persists the partner attribution in localStorage + cookie.
 * Last-click model: a new ?ref= always overrides the previous one.
 */
export function usePartnerTracking() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref")?.trim().toLowerCase();
    if (!ref) return;

    let cancelled = false;
    (async () => {
      try {
        const linkSlug = params.get("rl")?.trim().toLowerCase() || null;
        // SECURITY DEFINER RPC: atomically resolves the partner + (optional) link,
        // inserts the click row, and returns the new click_id. Works for anon visitors
        // without exposing any partner data.
        const { data, error } = await supabase.rpc("register_partner_click", {
          _referral_code: ref,
          _referral_link_slug: linkSlug,
          _landing_page: location.pathname,
          _user_agent: navigator.userAgent.substring(0, 500),
          _utm_source: params.get("utm_source"),
          _utm_medium: params.get("utm_medium"),
          _utm_campaign: params.get("utm_campaign"),
          _utm_term: params.get("utm_term"),
          _utm_content: params.get("utm_content"),
          _session_id: crypto.randomUUID(),
        });
        if (error) {
          console.warn("[usePartnerTracking] register_partner_click failed:", error.message);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.click_id || !row?.partner_id || cancelled) return;

        persistReferral({
          code: ref,
          partner_id: row.partner_id,
          click_id: row.click_id,
          referral_link_id: row.referral_link_id ?? null,
          ts: Date.now(),
        });
      } catch (err) {
        console.warn("[usePartnerTracking]", err);
      }
    })();

    return () => { cancelled = true; };
  }, [location.search, location.pathname]);
}



/** Call this after a user signs up to attribute their account to the stored partner. */
export async function attributePartnerLeadOnSignup(userId: string, email: string, name?: string) {
  const ref = getStoredReferral();
  if (!ref) return;
  try {
    // Server-side anti-self-referral guard (CPF, e-mail, IP, fingerprint, telefone)
    const { data: fraudCheck } = await supabase.rpc("check_partner_self_referral", {
      p_partner_id: ref.partner_id,
      p_user_id: userId,
    });
    if (fraudCheck && (fraudCheck as any).blocked) {
      console.warn("[attributePartnerLeadOnSignup] self-referral blocked:", fraudCheck);
      // Clear stored referral so future actions don't retry
      try {
        localStorage.removeItem(STORAGE_KEY);
        document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      } catch {}
      // Audit-only log; insertion is allowed by RLS for authenticated users
      await supabase.from("partner_fraud_attempts").insert({
        partner_id: ref.partner_id,
        user_id: userId,
        email,
        reason: (fraudCheck as any).reason,
        matched_field: (fraudCheck as any).matched_field,
        metadata: { source: "signup", click_id: ref.click_id },
      });
      return;
    }

    const { error: leadErr } = await supabase.from("partner_leads").insert({
      partner_id: ref.partner_id,
      user_id: userId,
      email,
      name: name || null,
      click_id: ref.click_id,
      referral_link_id: ref.referral_link_id ?? null,
      is_trial: true,
    });
    if (leadErr) {
      // Unique violation on user_id (23505) means this user was already attributed — silent ok.
      if ((leadErr as any).code !== "23505") {
        console.warn("[attributePartnerLeadOnSignup] lead insert failed:", leadErr.message);
        return;
      }
    }
    const { error: clickUpdErr } = await supabase
      .from("partner_clicks")
      .update({ converted_to_lead_at: new Date().toISOString(), converted_user_id: userId })
      .eq("id", ref.click_id)
      .is("converted_user_id", null);
    if (clickUpdErr) {
      console.warn("[attributePartnerLeadOnSignup] click update failed:", clickUpdErr.message);
    }
  } catch (err) {
    console.warn("[attributePartnerLeadOnSignup]", err);
  }
}

