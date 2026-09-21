import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Link2 } from "lucide-react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forms-public`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function TrackedLinkRedirect() {
  const { slug = "" } = useParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON,
            Authorization: `Bearer ${ANON}`,
          },
          body: JSON.stringify({ action: "click", slug, referrer: document.referrer || "" }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const url = (data as any)?.redirect;
        if (url) window.location.replace(url);
        else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4 text-center">
      {failed ? (
        <p className="text-sm text-zinc-600">Este link não está disponível.</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#16a34a]/10">
            <Link2 className="h-5 w-5 animate-pulse text-[#16a34a]" />
          </span>
          <p className="text-xs font-medium text-zinc-500">Redirecionando…</p>
        </div>
      )}
    </div>
  );
}
