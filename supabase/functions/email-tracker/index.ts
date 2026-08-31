import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Tracks email opens (via pixel) and clicks (via redirect) for email_logs table
// Params: lid (log_id), action (open|click), url (redirect target for clicks)

const TRANSPARENT_PIXEL = Uint8Array.from(atob(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
), c => c.charCodeAt(0));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const logId = url.searchParams.get("lid");
    const action = url.searchParams.get("action");
    const redirectUrl = url.searchParams.get("url");

    if (!logId || !action) {
      return new Response("Missing params", { status: 400 });
    }

    if (action === "open") {
      // Increment open count, set opened_at on first open
      const { data: log } = await supabase
        .from("email_logs")
        .select("opened_at, opened_count")
        .eq("id", logId)
        .maybeSingle();

      if (log) {
        const updates: Record<string, unknown> = {
          opened_count: (log.opened_count || 0) + 1,
        };
        if (!log.opened_at) {
          updates.opened_at = new Date().toISOString();
        }
        await supabase.from("email_logs").update(updates).eq("id", logId);
      }

      // Return transparent 1x1 GIF
      return new Response(TRANSPARENT_PIXEL, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    if (action === "click") {
      if (!redirectUrl) {
        return new Response("Missing url param", { status: 400 });
      }

      // Open-redirect protection: only https links to Wiize-controlled hosts.
      const ALLOWED_HOSTS = [
        "wiize.com.br",
        "www.wiize.com.br",
        "app.wiize.com.br",
        "wiize-lb2.lovable.app",
      ];
      let parsedRedirect: URL;
      try {
        parsedRedirect = new URL(redirectUrl);
      } catch {
        return new Response("Invalid url param", { status: 400 });
      }
      const hostAllowed =
        parsedRedirect.protocol === "https:" &&
        ALLOWED_HOSTS.some(
          (h) => parsedRedirect.hostname === h || parsedRedirect.hostname.endsWith(`.${h}`),
        );
      if (!hostAllowed) {
        console.warn("[email-tracker] blocked redirect:", parsedRedirect.hostname);
        return new Response("Redirect not allowed", { status: 400 });
      }
      const safeRedirect = parsedRedirect.toString();

      // Increment click count, set clicked_at on first click
      const { data: log } = await supabase
        .from("email_logs")
        .select("clicked_at, clicked_count")
        .eq("id", logId)
        .maybeSingle();

      if (log) {
        const updates: Record<string, unknown> = {
          clicked_count: (log.clicked_count || 0) + 1,
        };
        if (!log.clicked_at) {
          updates.clicked_at = new Date().toISOString();
        }
        await supabase.from("email_logs").update(updates).eq("id", logId);
      }

      // Redirect to original URL
      return new Response(null, {
        status: 302,
        headers: { Location: safeRedirect },
      });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("[email-tracker] Error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
