import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatWebWindow, type ChatWebMessage, type ChatWebOption } from "@/components/chatweb/ChatWebWindow";
import { readTheme } from "@/lib/chatweb";

interface PublicCfg {
  slug: string; display_name: string; description: string | null; avatar_url: string | null;
  theme: any; welcome_message: string | null; input_placeholder: string | null; enabled: boolean;
}

const storeKey = (slug: string) => `wiize-chatweb:${slug}`;

function visitorId() {
  const k = "wiize-chatweb:visitor";
  let v = localStorage.getItem(k);
  if (!v || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) { v = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem(k, v); }
  return v;
}

/** Origem do site que incorporou (só usada para restringir domínios e responder ao widget). */
function hostOrigin(params: URLSearchParams): string | null {
  const h = params.get("host");
  try { if (h) return new URL(h).origin; } catch { /* ignore */ }
  try { return document.referrer ? new URL(document.referrer).origin : null; } catch { return null; }
}

async function api(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("chatweb-api", { body });
  if (error) {
    let detail: any = null;
    try { detail = await (error as any).context?.json?.(); } catch { /* ignore */ }
    throw Object.assign(new Error(detail?.error || "network"), { code: detail?.error || "network" });
  }
  return data as any;
}

export default function ChatWebPublic() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const embed = params.get("embed");
  const host = useMemo(() => (embed ? hostOrigin(params) : null), [embed, params]);
  const [cfg, setCfg] = useState<PublicCfg | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatWebMessage[]>([]);
  const [status, setStatus] = useState("active");
  const [typing, setTyping] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const lastAt = useRef<string | null>(null);

  const merge = useCallback((incoming: ChatWebMessage[]) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev.filter((m) => !m.id.startsWith("local-") || !incoming.some((x) => x.sender_type === "visitor" && x.content === m.content)), ...incoming.filter((m) => !seen.has(m.id))];
      lastAt.current = next.length ? next[next.length - 1].created_at : lastAt.current;
      return next;
    });
  }, []);

  const start = useCallback(async () => {
    setTyping(true);
    try {
      const r = await api({ action: "start", slug, visitor_id: visitorId(), host_origin: host });
      tokenRef.current = r.token;
      localStorage.setItem(storeKey(slug), r.token);
      setMessages([]); lastAt.current = null; setStatus(r.status);
      merge(r.messages);
    } catch (e: any) {
      setError(e.code === "disabled" ? "Este atendimento está indisponível no momento." : e.code === "rate_limited" ? "Muitas tentativas. Aguarde alguns minutos." : "Não foi possível iniciar o atendimento.");
    } finally { setTyping(false); }
  }, [slug, host, merge]);

  useEffect(() => {
    document.title = "Atendimento";
    (async () => {
      try {
        const r = await api({ action: "config", slug, host_origin: host });
        setCfg(r.config);
        if (r.config.display_name) document.title = r.config.display_name;
        const saved = localStorage.getItem(storeKey(slug));
        if (saved) {
          try {
            const s = await api({ action: "resume", token: saved, slug });
            tokenRef.current = saved; setStatus(s.status); merge(s.messages);
            return;
          } catch { localStorage.removeItem(storeKey(slug)); }
        }
        if (r.config.enabled) await start();
        else setError("Este atendimento está indisponível no momento.");
      } catch (e: any) {
        setError(e.code === "domain_not_allowed" ? "Este chat não está autorizado neste site." : "Atendimento não encontrado.");
      }
    })();
  }, [slug, host, merge, start]);

  // Recebe respostas que chegam depois (esperas, atendente humano).
  useEffect(() => {
    if (!tokenRef.current || !["active", "handoff"].includes(status)) return;
    const id = setInterval(async () => {
      if (document.hidden || !tokenRef.current) return;
      try {
        const r = await api({ action: "poll", token: tokenRef.current, slug, since: lastAt.current });
        setStatus(r.status); merge(r.messages);
      } catch { /* tenta de novo */ }
    }, 4000);
    return () => clearInterval(id);
  }, [status, slug, merge]);

  const send = async (text: string, option?: ChatWebOption) => {
    if (!tokenRef.current) return;
    const localId = `local-${Date.now()}`;
    const content = option ? option.title : text;
    setMessages((m) => [...m, { id: localId, sender_type: "visitor", message_type: option ? "option_reply" : "text", content, created_at: new Date().toISOString(), local_status: "sending" }]);
    setTyping(true);
    try {
      const r = await api({ action: "send", token: tokenRef.current, slug, text: option ? "" : text, button_id: option?.id, button_title: option?.title });
      setMessages((m) => m.filter((x) => x.id !== localId));
      merge(r.messages); setStatus(r.status);
    } catch (e: any) {
      setMessages((m) => m.map((x) => (x.id === localId ? { ...x, local_status: "error" } : x)));
      if (e.code === "session_closed") setStatus("completed");
    } finally { setTyping(false); }
  };

  const close = embed === "widget" && host
    ? () => window.parent.postMessage({ type: "wiize-chat:close" }, host)
    : undefined;

  if (error) return <div className="h-[100dvh] flex items-center justify-center p-6 text-center text-sm text-muted-foreground bg-background">{error}</div>;
  if (!cfg) return <div className="h-[100dvh] flex items-center justify-center bg-background"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className={embed ? "h-[100dvh]" : "h-[100dvh] sm:p-6 bg-muted flex items-center justify-center"}>
      <ChatWebWindow
        className={embed ? "" : "sm:max-w-[440px] sm:h-[min(760px,100%)] sm:rounded-2xl sm:shadow-xl sm:border sm:border-border"}
        name={cfg.display_name}
        description={cfg.description}
        avatarUrl={cfg.avatar_url}
        theme={readTheme(cfg.theme)}
        placeholder={cfg.input_placeholder}
        messages={messages}
        typing={typing}
        status={status}
        onSend={(t) => send(t)}
        onOption={(o) => send("", o)}
        onClose={close}
        onRestart={() => { localStorage.removeItem(storeKey(slug)); start(); }}
      />
    </div>
  );
}
