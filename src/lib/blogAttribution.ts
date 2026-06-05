import { supabase } from "@/integrations/supabase/client";

const KEY = "wiize_blog_attribution";

type Stored = { post_id: string; slug: string; ts: number };

function getSessionId(): string {
  let sid = localStorage.getItem("wiize_session_id");
  if (!sid) {
    sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("wiize_session_id", sid);
  }
  return sid;
}

function getStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    // Expire after 30 days
    if (Date.now() - parsed.ts > 30 * 86400_000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function trackBlogCtaClick(post_id: string, slug: string) {
  const session_id = getSessionId();
  const payload: Stored = { post_id, slug, ts: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(payload));
  try {
    await supabase.from("blog_post_attributions").insert({
      post_id,
      session_id,
      event: "cta_click",
      metadata: { slug },
    });
  } catch (e) {
    console.debug("blog cta click track err", e);
  }
}

export async function markBlogAttribution(event: "trial_started" | "purchased", user_id?: string) {
  const stored = getStored();
  if (!stored) return;
  const session_id = getSessionId();
  try {
    await supabase.from("blog_post_attributions").insert({
      post_id: stored.post_id,
      session_id,
      user_id: user_id || null,
      event,
      metadata: { slug: stored.slug },
    });
  } catch (e) {
    console.debug("blog attribution err", e);
  }
}
