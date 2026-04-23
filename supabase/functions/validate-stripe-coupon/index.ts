// Valida um código de cupom diretamente na Stripe.
// Aceita tanto promotion codes (códigos amigáveis criados no dashboard) quanto coupon IDs.
// Retorna detalhes do desconto: % ou valor, duração (once/repeating/forever), meses, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  console.log(`[VALIDATE-COUPON] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

interface CouponInfo {
  valid: boolean;
  error?: string;
  // Identificadores para reutilizar no checkout
  promotionCodeId?: string;
  couponId?: string;
  code?: string;
  // Detalhes do desconto
  percentOff?: number | null;
  amountOff?: number | null; // em centavos
  currency?: string | null;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number | null;
  // Texto pronto para exibir
  description: string;
}

function buildDescription(
  duration: "once" | "repeating" | "forever",
  durationInMonths: number | null | undefined,
  percentOff: number | null | undefined,
  amountOff: number | null | undefined,
  currency: string | null | undefined,
): string {
  const discountText = percentOff
    ? `${percentOff}% de desconto`
    : amountOff
      ? `${(amountOff / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: (currency || "BRL").toUpperCase(),
        })} de desconto`
      : "Desconto aplicado";

  if (duration === "forever") {
    return `${discountText} vitalício na assinatura (até cancelar)`;
  }
  if (duration === "once") {
    return `${discountText} no primeiro mês`;
  }
  // repeating
  const months = durationInMonths || 1;
  if (months === 1) {
    return `${discountText} no primeiro mês`;
  }
  return `${discountText} nos primeiros ${months} meses`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    const { code, planKey, billingPeriod } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido" } satisfies Partial<CouponInfo>),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmed = code.trim();
    log("Validating", { code: trimmed, planKey, billingPeriod });

    let coupon: Stripe.Coupon | null = null;
    let promotionCodeId: string | undefined;
    let displayCode = trimmed;

    // 1) Tenta como promotion code (código amigável digitado pelo cliente)
    try {
      const promoList = await stripe.promotionCodes.list({
        code: trimmed,
        active: true,
        limit: 1,
      });
      if (promoList.data.length > 0) {
        const promo = promoList.data[0];
        promotionCodeId = promo.id;
        displayCode = promo.code;
        coupon = promo.coupon;
        log("Found as promotion code", { id: promo.id });

        // Validações extras do promotion code
        if (promo.expires_at && promo.expires_at * 1000 < Date.now()) {
          return new Response(
            JSON.stringify({ valid: false, error: "Cupom expirado" } satisfies Partial<CouponInfo>),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (promo.max_redemptions && promo.times_redeemed >= promo.max_redemptions) {
          return new Response(
            JSON.stringify({ valid: false, error: "Cupom esgotado" } satisfies Partial<CouponInfo>),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    } catch (e) {
      log("Promotion code lookup failed", { error: String(e) });
    }

    // 2) Se não achou, tenta como coupon ID direto
    if (!coupon) {
      try {
        coupon = await stripe.coupons.retrieve(trimmed);
        log("Found as coupon", { id: coupon.id });
      } catch (_e) {
        // não existe
      }
    }

    if (!coupon) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Cupom não encontrado",
        } satisfies Partial<CouponInfo>),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!coupon.valid) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Cupom não está mais válido",
        } satisfies Partial<CouponInfo>),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result: CouponInfo = {
      valid: true,
      promotionCodeId,
      couponId: coupon.id,
      code: displayCode,
      percentOff: coupon.percent_off ?? null,
      amountOff: coupon.amount_off ?? null,
      currency: coupon.currency ?? null,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months ?? null,
      description: buildDescription(
        coupon.duration,
        coupon.duration_in_months,
        coupon.percent_off,
        coupon.amount_off,
        coupon.currency,
      ),
    };

    log("Valid", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ valid: false, error: msg } satisfies Partial<CouponInfo>),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
