import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tracks email flow events:
// - ?action=open  → 1x1 pixel (tracks opens)
// - ?action=click → redirect with tracking (tracks clicks)
// Params: uid (user_id), fid (flow_id), eid (enrollment_id), nid (node_id)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("uid");
    const flowId = url.searchParams.get("fid");
    const enrollmentId = url.searchParams.get("eid");
    const nodeId = url.searchParams.get("nid");
    const action = url.searchParams.get("action");
    const redirectUrl = url.searchParams.get("url");

    if (!userId || !flowId || !action) {
      return new Response("Missing params", { status: 400 });
    }

    if (action === "open") {
      // Deduplicate: only log once per enrollment+node
      const { count } = await supabase
        .from("email_flow_execution_logs")
        .select("*", { count: "exact", head: true })
        .eq("enrollment_id", enrollmentId)
        .eq("node_id", nodeId)
        .eq("action_type", "email_opened");

      if ((count || 0) === 0) {
        await supabase.from("email_flow_execution_logs").insert({
          flow_id: flowId,
          enrollment_id: enrollmentId || null,
          user_id: userId,
          node_id: nodeId,
          action_type: "email_opened",
          status: "success",
          details: { tracked_at: new Date().toISOString() },
        });
      }

      // Return 1x1 transparent GIF pixel
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80,
        0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04,
        0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
      ]);

      return new Response(pixel, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    if (action === "click") {
      if (!redirectUrl) {
        return new Response("Missing redirect URL", { status: 400 });
      }

      const decodedUrl = decodeURIComponent(redirectUrl);

      // Log click event (allow multiple clicks)
      await supabase.from("email_flow_execution_logs").insert({
        flow_id: flowId,
        enrollment_id: enrollmentId || null,
        user_id: userId,
        node_id: nodeId,
        action_type: "email_clicked",
        status: "success",
        details: { url: decodedUrl, tracked_at: new Date().toISOString() },
      });

      // Also log open (if not already) since clicking implies opening
      const { count } = await supabase
        .from("email_flow_execution_logs")
        .select("*", { count: "exact", head: true })
        .eq("enrollment_id", enrollmentId)
        .eq("node_id", nodeId)
        .eq("action_type", "email_opened");

      if ((count || 0) === 0) {
        await supabase.from("email_flow_execution_logs").insert({
          flow_id: flowId,
          enrollment_id: enrollmentId || null,
          user_id: userId,
          node_id: nodeId,
          action_type: "email_opened",
          status: "success",
          details: { inferred_from_click: true, tracked_at: new Date().toISOString() },
        });
      }

      return new Response(null, {
        status: 302,
        headers: { Location: decodedUrl },
      });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("Email flow tracker error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
