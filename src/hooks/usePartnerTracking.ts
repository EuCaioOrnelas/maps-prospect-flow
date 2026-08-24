import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isPublicDemoPath } from "@/lib/publicDemo";

const STORAGE_KEY = "wiize_referral";
const CODE_KEY = "wiize_referral_code";
const PENDING_KEY = "wiize_referral_pending";
const COOKIE_KEY = "wiize_ref";
const COOKIE_DAYS = 365 * 2; // 2 years (last-click persistence)

interface StoredReferral {
  code: string;
  partner_id: string;
  click_id: string;
  referral_link_id?: string | null;
  ts: number;
}

/**
 * Referral captured from the URL but not yet registered as a click.
 * Happens on the public demo (/tour-guiado), where all backend traffic is
 * blocked — we still keep the code so the trial signup gets attributed.
 */
interface PendingReferral {
  code: string;
  link_slug: string | null;
  landing_page: string;
  utm: Record<string, string | null>;
  ts: number;
}

export function getPendingReferral(): PendingReferral | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.code ? parsed : null;
  } catch { return null; }
}

function setPendingReferral(value: PendingReferral | null) {
  try {
    if (!value) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(value));
  } catch {}
}

/** Preserves ?ref=/?rl=/utm_* when navigating out of a public page. */
export function withReferralParams(path: string): string {
  try {
    const current = new URLSearchParams(window.location.search);
    const keep = ["ref", "rl", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const url = new URL(path, window.location.origin);
    keep.forEach((k) => {
      const v = current.get(k);
      if (v && !url.searchParams.get(k)) url.searchParams.set(k, v);
    });
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return path; }
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

/** Normalizes a manually typed referral code (letters/numbers only, lowercase). */
export function normalizeReferralCode(input: string): string {
  return (input || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Stores a referral code explicitly typed by the user (trial / checkout). */
export function setManualReferralCode(code: string | null) {
  try {
    const normalized = code ? normalizeReferralCode(code) : "";
    if (!normalized) localStorage.removeItem(CODE_KEY);
    else localStorage.setItem(CODE_KEY, normalized);
  } catch {}
}

/** Reads the referral code explicitly typed by the user, if any. */
export function getManualReferralCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY) || null;
  } catch { return null; }
}

/**
 * Metadata forwarded to Stripe / Asaas checkout.
 * A manually typed code takes priority over automatic link attribution.
 */
export function getPartnerReferralMetadata(): Record<string, string> {
  const manualCode = getManualReferralCode();
  const ref = getStoredReferral();

  if (manualCode) {
    return {
      partner_referral_code: manualCode,
      partner_attribution_source: "referral_code",
      ...(ref?.partner_id && ref.code === manualCode
        ? { partner_id: ref.partner_id, partner_click_id: ref.click_id }
        : {}),
    };
  }

  if (!ref) return {};

  return {
    partner_referral_code: ref.code,
    partner_id: ref.partner_id,
    partner_click_id: ref.click_id,
    partner_attribution_source: "referral_link",
    ...(ref.referral_link_id ? { partner_referral_link_id: ref.referral_link_id } : {}),
  };
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



/**
 * Call this after a user signs up to attribute their account to a partner.
 * A code typed manually by the user wins over the automatic link attribution.
 */
export async function attributePartnerLeadOnSignup(userId: string, email: string, name?: string) {
  const ref = getStoredReferral();
  const manualCode = getManualReferralCode();
  if (!ref && !manualCode) return;

  const attempts: Array<Record<string, unknown>> = [];

  if (ref) {
    attempts.push({
      p_user_id: userId,
      p_email: email,
      p_name: name || null,
      p_referral_code: ref.code,
      p_click_id: ref.click_id,
      p_partner_id: ref.partner_id,
      p_referral_link_id: ref.referral_link_id ?? null,
      p_source: "signed_in_event",
    });
  }

  // Runs last on purpose: the RPC re-attributes the lead to the typed code.
  if (manualCode) {
    attempts.push({
      p_user_id: userId,
      p_email: email,
      p_name: name || null,
      p_referral_code: manualCode,
      p_click_id: null,
      p_partner_id: null,
      p_referral_link_id: null,
      p_source: "referral_code",
    });
  }

  try {
    for (const payload of attempts) {
      const { data, error } = await (supabase as any).rpc("attribute_partner_lead", payload);

      if (error) {
        console.warn("[attributePartnerLeadOnSignup] attribution failed:", error.message);
        continue;
      }

      if (data?.status === "blocked") {
        console.warn("[attributePartnerLeadOnSignup] self-referral blocked:", data);
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(CODE_KEY);
          document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        } catch {}
      }
    }
  } catch (err) {

    console.warn("[attributePartnerLeadOnSignup]", err);
  }
}

