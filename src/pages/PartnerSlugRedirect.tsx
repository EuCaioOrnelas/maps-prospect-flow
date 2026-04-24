import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Resolves /r/:slug → /?ref=CODE&utm_*=... and redirects. */
export default function PartnerSlugRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { navigate("/", { replace: true }); return; }
    (async () => {
      const { data } = await supabase
        .from("partner_referral_links")
        .select("partner_id, utm_source, utm_medium, utm_campaign, is_active, partners!inner(referral_code, status)")
        .eq("slug", slug)
        .maybeSingle();

      const link = data as any;
      if (!link || !link.is_active || link.partners?.status !== "active") {
        navigate("/", { replace: true });
        return;
      }

      const params = new URLSearchParams();
      params.set("ref", link.partners.referral_code);
      params.set("rl", slug);
      if (link.utm_source) params.set("utm_source", link.utm_source);
      if (link.utm_medium) params.set("utm_medium", link.utm_medium);
      if (link.utm_campaign) params.set("utm_campaign", link.utm_campaign);
      window.location.replace(`/?${params.toString()}`);
    })();
  }, [slug, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">{error || "Redirecionando..."}</div>
    </div>
  );
}
