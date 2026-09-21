import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlignLeft, AtSign, CheckCircle2, ChevronDown, CircleDot, Hash, Loader2, Phone, Type } from "lucide-react";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export interface PublicFormField {
  id: string;
  field_type: string;
  label: string;
  name: string;
  placeholder: string | null;
  required: boolean;
  options: any;
}

const iconForField = (type: string) => {
  if (type === "email") return AtSign;
  if (type === "phone" || type === "whatsapp") return Phone;
  if (type === "number") return Hash;
  if (type === "textarea") return AlignLeft;
  if (type === "select") return ChevronDown;
  if (type === "radio" || type === "checkbox") return CircleDot;
  return Type;
};

function useTrackingParams(slug: string) {
  const [params] = useSearchParams();
  return useMemo(() => {
    const storageKey = `wz_form_utm_${slug}`;
    const stored = (() => {
      try { return JSON.parse(sessionStorage.getItem(storageKey) || "{}"); } catch { return {}; }
    })();
    const utm: Record<string, string> = { ...stored.utm };
    let found = false;
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) { utm[key] = value; found = true; }
    }
    const wzLink = params.get("wz_link") || stored.wz_link || "";
    const payload = {
      utm,
      wz_link: wzLink,
      referrer: stored.referrer || document.referrer || "",
      landing_url: stored.landing_url || window.location.href,
    };
    if (found || !stored.landing_url) {
      try { sessionStorage.setItem(storageKey, JSON.stringify(payload)); } catch { /* ignore */ }
    }
    return payload;
  }, [params, slug]);
}

export default function PublicForm() {
  const { slug = "" } = useParams();
  const tracking = useTrackingParams(slug);

  const [state, setState] = useState<"loading" | "ready" | "inactive" | "missing">("loading");
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<PublicFormField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const honeypot = useRef("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.functions.invoke("forms-public", { body: { action: "get_form", slug } });
      if (cancelled) return;
      if (!data || (data as any).error) { setState("missing"); return; }
      if ((data as any).status === "inactive") { setState("inactive"); return; }
      setForm((data as any).form);
      setFields((data as any).fields || []);
      setState("ready");
      supabase.functions.invoke("forms-public", {
        body: { action: "view", slug, utm: tracking.utm, referrer: tracking.referrer },
      });
      document.title = (data as any).form?.title || "Formulário";
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (state !== "ready" || !form?.config) return;
    const pixelId = String(form.config.metaPixelId || "");
    const googleId = String(form.config.googleTagId || "").toUpperCase();
    const added: HTMLElement[] = [];

    if (/^\d{6,30}$/.test(pixelId)) {
      const script = document.createElement("script");
      script.dataset.formTracking = "meta";
      script.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
      document.head.appendChild(script);
      added.push(script);
    }

    if (/^GTM-[A-Z0-9]+$/.test(googleId)) {
      const script = document.createElement("script");
      script.dataset.formTracking = "google";
      script.text = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${googleId}');`;
      document.head.appendChild(script);
      added.push(script);
    } else if (/^AW-\d+$/.test(googleId)) {
      const external = document.createElement("script");
      external.async = true;
      external.src = `https://www.googletagmanager.com/gtag/js?id=${googleId}`;
      external.dataset.formTracking = "google";
      const config = document.createElement("script");
      config.dataset.formTracking = "google";
      config.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${googleId}');`;
      document.head.append(external, config);
      added.push(external, config);
    }
    return () => { added.forEach((node) => node.remove()); };
  }, [form, state]);

  const cfg = form?.config || {};
  const primary = cfg.primaryColor || "#3daa57";
  const bg = cfg.backgroundColor || "#f6f7f9";
  const textColor = cfg.textColor || "#18181b";
  const radius = typeof cfg.radius === "number" ? cfg.radius : 10;
  const align = cfg.align === "center" ? "center" : "left";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("forms-public", {
        body: {
          action: "submit",
          slug,
          data: values,
          hp: honeypot.current,
          utm: tracking.utm,
          wz_link: tracking.wz_link,
          referrer: tracking.referrer,
          landing_url: tracking.landing_url,
        },
      });
      if (fnError) {
        let message = "Não foi possível enviar agora. Tente novamente.";
        const ctx: any = (fnError as any).context;
        try {
          const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
          if (body?.error) message = body.error;
        } catch { /* ignore */ }
        throw new Error(message);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone((data as any)?.message || "Obrigado! Recebemos seus dados.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f9]">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (state === "missing" || state === "inactive") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f9] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-base font-medium text-zinc-800">
            {state === "inactive"
              ? "Este formulário não está disponível no momento."
              : "Formulário não encontrado."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden px-4 py-8 sm:py-14" style={{ background: bg, color: textColor }}>
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8" style={{ borderRadius: radius + 8 }}>
          {cfg.coverUrl && (
            <img src={cfg.coverUrl} alt="" className="mb-5 h-32 w-full rounded-xl object-cover" />
          )}
          {cfg.logoUrl && (
            <img src={cfg.logoUrl} alt="" className="mb-4 h-10 w-auto object-contain" style={{ marginInline: align === "center" ? "auto" : undefined }} />
          )}

          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10" style={{ color: primary }} />
              <p className="text-base font-medium" style={{ color: textColor }}>{done}</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: align as any }}>
                <h1 className="text-2xl font-semibold" style={{ color: textColor }}>{form.title}</h1>
                {form.description && (
                  <p className="mt-2 text-sm opacity-70">{form.description}</p>
                )}
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  onChange={(e) => { honeypot.current = e.target.value; }}
                  className="absolute h-0 w-0 opacity-0"
                  aria-hidden
                />
                {fields.map((f) => {
                  const value = values[f.name] || "";
                  const set = (v: string) => setValues((prev) => ({ ...prev, [f.name]: v }));
                  const opts: string[] = Array.isArray(f.options) ? f.options : [];
                  const FieldIcon = iconForField(f.field_type);
                  return (
                    <div key={f.id} className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: textColor }}>
                        <FieldIcon className="h-3.5 w-3.5 opacity-60" />
                        {f.label}{f.required && <span className="ml-0.5 text-red-500">*</span>}
                      </Label>

                      {f.field_type === "textarea" ? (
                        <Textarea
                          value={value}
                          required={f.required}
                          placeholder={f.placeholder || ""}
                          onChange={(e) => set(e.target.value)}
                          style={{ borderRadius: radius }}
                          className="min-h-[110px] bg-white text-zinc-900"
                        />
                      ) : f.field_type === "select" ? (
                        <select
                          value={value}
                          required={f.required}
                          onChange={(e) => set(e.target.value)}
                          style={{ borderRadius: radius }}
                          className="h-11 w-full border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                        >
                          <option value="">{f.placeholder || "Selecione"}</option>
                          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.field_type === "radio" ? (
                        <div className="space-y-2">
                          {opts.map((o) => (
                            <label key={o} className="flex items-center gap-2 text-sm text-zinc-700">
                              <input type="radio" name={f.name} value={o} checked={value === o} onChange={() => set(o)} required={f.required} />
                              {o}
                            </label>
                          ))}
                        </div>
                      ) : f.field_type === "checkbox" ? (
                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                          <Checkbox checked={value === "sim"} onCheckedChange={(c) => set(c ? "sim" : "")} />
                          {f.placeholder || f.label}
                        </label>
                      ) : (
                        <Input
                          type={f.field_type === "number" ? "number" : f.field_type === "email" ? "email" : "text"}
                          inputMode={f.field_type === "phone" || f.field_type === "whatsapp" ? "tel" : undefined}
                          value={value}
                          required={f.required}
                          placeholder={f.placeholder || ""}
                          onChange={(e) => set(e.target.value)}
                          style={{ borderRadius: radius }}
                          className="h-11 bg-white text-zinc-900"
                        />
                      )}
                    </div>
                  );
                })}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full font-semibold text-white hover:opacity-90"
                  style={{ background: cfg.buttonColor || primary, borderRadius: radius }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : form.button_text}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs opacity-50">Formulário seguro · Wiize</p>
      </div>
    </div>
  );
}
