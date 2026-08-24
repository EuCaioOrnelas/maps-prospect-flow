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
      // RPC pública (security definer): resolve o link ativo sem expor a tabela de parceiros.
      const { data } = await (supabase as any).rpc("resolve_partner_referral_link", { _slug: slug });
      const link = Array.isArray(data) ? data[0] : data;

      if (!link?.referral_code) {
        navigate("/", { replace: true });
        return;
      }

      const params = new URLSearchParams();
      params.set("ref", link.referral_code);
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
