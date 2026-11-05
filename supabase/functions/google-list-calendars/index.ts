import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, getGoogleAccessToken, googleFailure, json, resolveCaller } from "../_shared/googleAuth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = adminClient();
    const caller = await resolveCaller(req, supabase, body.user_id);
    if (caller instanceof Response) return caller;

    const tok = await getGoogleAccessToken(supabase, caller.userId, body.google_account_id, "calendar");
    if (tok instanceof Response) return tok;

    const calRes = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer&maxResults=250",
      { headers: { Authorization: `Bearer ${tok.accessToken}` } },
    );
    if (!calRes.ok) return await googleFailure(calRes, "Falha ao listar agendas");
    const calData = await calRes.json();

    const calendars = (calData.items || []).map((c: any) => ({
      id: c.id,
      summary: c.summaryOverride || c.summary || c.id,
      primary: !!c.primary,
      backgroundColor: c.backgroundColor,
    }));
    // Principal sempre primeiro.
    calendars.sort((a: any, b: any) => Number(b.primary) - Number(a.primary));

    return json({ calendars, google_email: tok.account.google_email });
  } catch (err) {
    console.error("Error in google-list-calendars:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
