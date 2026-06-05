import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const nowIso = new Date().toISOString();

    const { data: pending, error: selErr } = await supabase
      .from("blog_posts")
      .select("id, slug, title, scheduled_for")
      .eq("status", "scheduled")
      .lte("scheduled_for", nowIso);

    if (selErr) throw selErr;

    const ids = (pending ?? []).map((p) => p.id);
    let published = 0;

    if (ids.length > 0) {
      const { error: updErr } = await supabase
        .from("blog_posts")
        .update({ status: "published", published_at: nowIso })
        .in("id", ids);
      if (updErr) throw updErr;
      published = ids.length;
    }

    return new Response(
      JSON.stringify({ ok: true, published, posts: pending ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[blog-scheduler] error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
