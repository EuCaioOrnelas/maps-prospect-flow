import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  buildUnsubscribeUrl,
  buildVars,
  cleanupEmptyGreetings,
  compileTemplate,
  injectTracking,
  lifecycleCors,
  lifecycleLayout,
  sendWithResend,
  styleEmailHtml,
} from "../_shared/lifecycle.ts";

// Admin-only operations for the Trial Email Flow.
//   action=preview    -> compiled HTML for a step (no send)
//   action=send_test  -> single test email, flagged as test, never touches user state
//   action=simulate   -> eligibility/test mode for a real user
// Every call requires an authenticated admin (is_current_user_admin).

const TRIAL_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: lifecycleCors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const trackingSecret = Deno.env.get("LIFECYCLE_TRACKING_SECRET") || "";
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...lifecycleCors, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("is_current_user_admin");
    if (isAdmin !== true) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    // ── Preview ──────────────────────────────────────────────────────────────
    if (action === "preview" || action === "send_test") {
      const stepId = body?.stepId as string;
      if (!stepId) return json({ error: "stepId é obrigatório" }, 400);

      const { data: step } = await service
        .from("lifecycle_campaign_steps")
        .select("*, lifecycle_campaigns(*)")
        .eq("id", stepId)
        .maybeSingle();
      if (!step) return json({ error: "Etapa não encontrada" }, 404);

      const campaign = (step as any).lifecycle_campaigns;
      const sampleEnd = new Date(Date.now() + 3 * 86400000);
      const vars = buildVars({
        name: body?.sampleName || "Maria",
        email: body?.recipientEmail || userData.user.email || "",
        trialEnd: sampleEnd,
        daysRemaining: 3,
      });

      const compiledBody = styleEmailHtml(cleanupEmptyGreetings(compileTemplate(step.content || "", vars)));
      const subject = cleanupEmptyGreetings(compileTemplate(step.subject || "", vars)).trim() || step.name;
      const preheader = compileTemplate(step.preheader || "", vars);

      if (action === "preview") {
        return json({
          subject,
          html: lifecycleLayout({ body: compiledBody, preheader, unsubscribeUrl: "#" }),
        });
      }

      const recipient = (body?.recipientEmail as string || "").trim();
      if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
        return json({ error: "Informe um e-mail válido" }, 400);
      }
      if (!resendKey) return json({ error: "RESEND_API_KEY não configurada" }, 500);

      const { data: delivery, error: deliveryError } = await service
        .from("lifecycle_email_deliveries")
        .insert({
          campaign_id: step.campaign_id,
          step_id: step.id,
          recipient_email: recipient,
          status: "pending",
          is_test: true,
        })
        .select("id")
        .single();
      if (deliveryError || !delivery) return json({ error: "Falha ao registrar o teste" }, 500);

      const tracked = await injectTracking({ html: compiledBody, baseUrl: supabaseUrl, deliveryId: delivery.id, secret: trackingSecret });
      const unsubscribeUrl = await buildUnsubscribeUrl(supabaseUrl, delivery.id, trackingSecret);
      const html = lifecycleLayout({ body: tracked, preheader, unsubscribeUrl, isTest: true });

      const result = await sendWithResend(resendKey, {
        to: recipient,
        subject: `[TESTE] ${subject}`,
        html,
        from: `${campaign?.from_name || "Wiize"} <${campaign?.from_email || "no-reply@wiize.com.br"}>`,
      });

      await service
        .from("lifecycle_email_deliveries")
        .update(
          result.ok
            ? { status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.id || null }
            : { status: "failed", error_message: result.error?.slice(0, 500) },
        )
        .eq("id", delivery.id);

      return result.ok
        ? json({ success: true, message: `E-mail de teste enviado para ${recipient}` })
        : json({ error: result.error || "Falha no envio" }, 500);
    }

    // ── Test mode / eligibility simulation ───────────────────────────────────
    if (action === "simulate") {
      const email = (body?.email as string || "").trim().toLowerCase();
      if (!email) return json({ error: "Informe um e-mail" }, 400);

      const { data: profile } = await service
        .from("profiles")
        .select("id, email, name, plan, trial_start_at, trial_end_at, created_at, is_archived")
        .ilike("email", email)
        .maybeSingle();
      if (!profile) return json({ error: "Usuário não encontrado" }, 404);

      const { data: campaign } = await service
        .from("lifecycle_campaigns")
        .select("*")
        .eq("key", "trial_wiize")
        .maybeSingle();
      const { data: steps } = await service
        .from("lifecycle_campaign_steps")
        .select("*")
        .eq("campaign_id", campaign?.id)
        .order("day_offset");

      const { data: enrollment } = await service
        .from("lifecycle_enrollments")
        .select("*")
        .eq("campaign_id", campaign?.id)
        .eq("user_id", profile.id)
        .maybeSingle();

      const { data: deliveries } = await service
        .from("lifecycle_email_deliveries")
        .select("step_id, status, sent_at, opened_at, clicked_at")
        .eq("user_id", profile.id)
        .eq("is_test", false);

      const anchor = enrollment?.anchor_at || profile.trial_start_at;
      const anchorMs = anchor ? new Date(anchor).getTime() : null;
      const trialEnd = profile.trial_end_at
        ? new Date(profile.trial_end_at)
        : anchorMs
        ? new Date(anchorMs + TRIAL_DAYS * 86400000)
        : null;

      const sentSteps = new Set((deliveries || []).map((d) => d.step_id));
      const elapsedHours = anchorMs ? (Date.now() - anchorMs) / 3600000 : null;

      const checks = [
        { label: "Campanha ativa", pass: campaign?.status === "active", detail: `status: ${campaign?.status || "—"}` },
        { label: "E-mail válido", pass: !!profile.email, detail: profile.email || "—" },
        { label: "Trial registrado", pass: !!anchor, detail: anchor ? new Date(anchor).toLocaleString("pt-BR") : "sem data de início" },
        { label: "Ainda não converteu", pass: !profile.plan || profile.plan === "free", detail: `plano: ${profile.plan || "free"}` },
        { label: "Conta ativa", pass: !profile.is_archived, detail: profile.is_archived ? "arquivada" : "ok" },
        { label: "Inscrito no fluxo", pass: enrollment?.status === "active", detail: enrollment ? `status: ${enrollment.status}` : "não inscrito" },
      ];

      const nextStep = (steps || []).find((s) => s.is_active && !sentSteps.has(s.id));
      const currentStep = [...(steps || [])]
        .filter((s) => sentSteps.has(s.id))
        .sort((a, b) => b.day_offset - a.day_offset)[0] || null;

      return json({
        user: { id: profile.id, email: profile.email, name: profile.name, plan: profile.plan },
        trial: { start: anchor, end: trialEnd?.toISOString() || null, elapsed_hours: elapsedHours },
        enrollment,
        current_step: currentStep ? { day: currentStep.day_offset, name: currentStep.name } : null,
        next_step: nextStep
          ? {
              day: nextStep.day_offset,
              name: nextStep.name,
              scheduled_at: anchorMs ? new Date(anchorMs + nextStep.day_offset * 24 * 3600000).toISOString() : null,
            }
          : null,
        eligible: checks.every((c) => c.pass) && !!nextStep,
        checks,
        deliveries,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("lifecycle-admin error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
