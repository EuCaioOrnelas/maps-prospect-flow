import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function TrackedLinkRedirect() {
  const { slug = "" } = useParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.functions.invoke("forms-public", {
        body: { action: "click", slug, referrer: document.referrer || "" },
      });
      if (cancelled) return;
      const url = (data as any)?.redirect;
      if (url) window.location.replace(url);
      else setFailed(true);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4 text-center">
      {failed ? (
        <p className="text-sm text-zinc-600">Este link não está disponível.</p>
      ) : (
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      )}
    </div>
  );
}
