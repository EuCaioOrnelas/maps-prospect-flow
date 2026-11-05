import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, getGoogleAccessToken, googleFailure, json, resolveCaller } from "../_shared/googleAuth.ts";

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { google_account_id, calendar_id, description, start_datetime, duration_minutes, attendee_email, reminder_minutes } = body;
    const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 500) : "";
    if (!summary) return json({ error: "Informe o nome do evento" }, 400);

    const supabase = adminClient();
    const caller = await resolveCaller(req, supabase, body.user_id);
    if (caller instanceof Response) return caller;

    const tok = await getGoogleAccessToken(supabase, caller.userId, google_account_id, "calendar");
    if (tok instanceof Response) return tok;

    let startTime = start_datetime ? new Date(start_datetime) : new Date();
    if (isNaN(startTime.getTime())) startTime = new Date();
    const minutes = Math.min(Math.max(Number(duration_minutes) || 30, 5), 24 * 60);
    const endTime = new Date(startTime.getTime() + minutes * 60000);

    const event: Record<string, unknown> = {
      summary,
      description: typeof description === "string" ? description.slice(0, 8000) : "",
      start: { dateTime: startTime.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: endTime.toISOString(), timeZone: "America/Sao_Paulo" },
    };

    const attendee = typeof attendee_email === "string" ? attendee_email.trim() : "";
    if (attendee && EMAIL_RE.test(attendee)) event.attendees = [{ email: attendee }];

    const rem = Number(reminder_minutes);
    if (Number.isFinite(rem) && rem > 0) {
      event.reminders = { useDefault: false, overrides: [{ method: "popup", minutes: Math.min(rem, 40320) }] };
    }

    const calId = encodeURIComponent(calendar_id || "primary");
    const sendUpdates = event.attendees ? "all" : "none";
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?sendUpdates=${sendUpdates}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${tok.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      },
    );
    if (!calRes.ok) return await googleFailure(calRes, "Falha ao criar o evento");
    const calData = await calRes.json();

    return json({ success: true, eventId: calData.id, htmlLink: calData.htmlLink });
  } catch (err) {
    console.error("Error in google-calendar-action:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
