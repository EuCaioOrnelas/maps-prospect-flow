import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AtSign, CheckCircle2, FileText, Hash, ListChecks, MessageSquareText,
  Paperclip, Phone, Radio, Type,
} from "lucide-react";
import { hostFromUrl, inferUtmFromParams, isInternalHost } from "@/lib/leadOrigin";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forms-public`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

const ACCEPTED_UPLOADS = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const CONSENT_VERSION = "2026-09-v2";
export const CONSENT_TEXT =
  "Ao enviar, você concorda com o uso dos seus dados para contato sobre esta solicitação.";
const REDIRECT_SECONDS = 3;

const normalizeAssetUrl = (value?: string | null) => {
  const clean = (value || "").trim();
  if (!clean || /^https?:\/\//i.test(clean)) return clean;
  return `https://${clean.replace(/^\/+/, "")}`;
};

export interface PublicFormField {
  id: string;
  field_type: string;
  label: string;
  name: string;
  placeholder: string | null;
  required: boolean;
  options: any;
  page?: number | null;
}

interface PendingFile { field: string; filename: string; mime: string; data: string; size: number }

const FIELD_ICONS: Record<string, typeof Type> = {
  text: Type,
  email: AtSign,
  phone: Phone,
  whatsapp: Phone,
  number: Hash,
  textarea: MessageSquareText,
  select: ListChecks,
  radio: Radio,
  checkbox: CheckCircle2,
  file: Paperclip,
};

const formRequests = new Map<string, Promise<any>>();
const viewedForms = new Set<string>();
const FORM_CACHE_MS = 5 * 60 * 1000;

function readCachedForm(slug: string) {
  if (!slug) return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(`wz_form_${slug}`) || "null");
    return cached?.savedAt && Date.now() - cached.savedAt < FORM_CACHE_MS ? cached.data : null;
  } catch {
    return null;
  }
}

function loadPublicForm(slug: string) {
  const existing = formRequests.get(slug);
  if (existing) return existing;
  const request = callPublic<any>({ action: "get_form", slug }).finally(() => formRequests.delete(slug));
  formRequests.set(slug, request);
  return request;
}

async function callPublic<T = any>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error) {
    throw new Error(body?.error && body.error !== "not_found" ? body.error : "Não foi possível concluir agora.");
  }
  return body as T;
}

/** Comprime imagens no navegador mantendo boa qualidade; PDFs seguem originais. */
async function prepareFile(file: File, fieldName: string): Promise<PendingFile> {
  const toBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(blob);
    });

  if (file.type.startsWith("image/")) {
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (blob && blob.size < file.size) {
        return {
          field: fieldName,
          filename: file.name.replace(/\.[^.]+$/, "") + ".jpg",
          mime: "image/jpeg",
          data: await toBase64(blob),
          size: blob.size,
        };
      }
    } catch { /* usa o original */ }
  }
  return { field: fieldName, filename: file.name, mime: file.type, data: await toBase64(file), size: file.size };
}

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
    // Referência do próprio site não diz nada útil: descartamos.
    const rawReferrer = stored.referrer || document.referrer || "";
    const referrer = isInternalHost(hostFromUrl(rawReferrer)) ? "" : rawReferrer;
    // Sem UTM na URL, deduzimos a origem real (gclid, fbclid, site de origem...).
    if (!utm.utm_source) Object.assign(utm, inferUtmFromParams(params, referrer));
    const payload = {
      utm,
      wz_link: wzLink,
      referrer,
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
  const initial = useMemo(() => readCachedForm(slug), [slug]);

  const [state, setState] = useState<"loading" | "ready" | "inactive" | "missing">(initial?.form ? "ready" : "loading");
  const [form, setForm] = useState<any>(initial?.form || null);
  const [fields, setFields] = useState<PublicFormField[]>(initial?.fields || []);
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, PendingFile[]>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [redirectSeconds, setRedirectSeconds] = useState(3);
  const [consent, setConsent] = useState(false);
  const honeypot = useRef("");

  // Carregamento do formulário — uma única chamada, sem dependências pesadas.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadPublicForm(slug);
        if (cancelled) return;
        if (data?.status === "inactive") { setState("inactive"); return; }
        setForm(data.form);
        setFields(data.fields || []);
        setState("ready");
        document.title = data.form?.title || "Formulário";
        try { sessionStorage.setItem(`wz_form_${slug}`, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* cache opcional */ }
        if (!viewedForms.has(slug)) {
          viewedForms.add(slug);
          callPublic({ action: "view", slug, utm: tracking.utm, referrer: tracking.referrer }).catch(() => viewedForms.delete(slug));
        }
      } catch {
        if (!cancelled) setState("missing");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Tags de rastreamento configuradas pelo dono do formulário.
  useEffect(() => {
    const config = form?.config || {};
    const cleanMetaId = /^\d{6,20}$/.test(config.metaPixelId || "") ? config.metaPixelId : "";
    const cleanGtmId = /^GTM-[A-Z0-9]+$/.test(config.googleTagManagerId || "") ? config.googleTagManagerId : "";
    const cleanAdsId = /^AW-\d+$/.test(config.googleAdsId || "") ? config.googleAdsId : "";
    if (!cleanMetaId && !cleanGtmId && !cleanAdsId) return;
    const scripts: HTMLScriptElement[] = [];
    const idle = window.setTimeout(() => {
      if (cleanMetaId) {
        const script = document.createElement("script");
        script.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${cleanMetaId}');fbq('track','PageView');`;
        document.head.appendChild(script); scripts.push(script);
      }
      if (cleanGtmId) {
        const script = document.createElement("script");
        script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cleanGtmId)}`;
        script.async = true; document.head.appendChild(script); scripts.push(script);
        const dataLayer = ((window as any).dataLayer ||= []); dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      }
      if (cleanAdsId) {
        const script = document.createElement("script");
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanAdsId)}`;
        script.async = true; document.head.appendChild(script); scripts.push(script);
        const dataLayer = ((window as any).dataLayer ||= []); const gtag = (...args: unknown[]) => dataLayer.push(args);
        gtag("js", new Date()); gtag("config", cleanAdsId);
      }
    }, 800);
    return () => { window.clearTimeout(idle); scripts.forEach((script) => script.remove()); };
  }, [form]);

  useEffect(() => {
    const rawRedirect = (form?.config?.redirectUrl || "").trim();
    const redirectUrl = rawRedirect && !/^https?:\/\//i.test(rawRedirect) ? `https://${rawRedirect.replace(/^\/+/, "")}` : rawRedirect;
    if (!done || !form?.config?.redirectEnabled || !redirectUrl) return;
    setRedirectSeconds(REDIRECT_SECONDS);
    const interval = window.setInterval(() => setRedirectSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    const timeout = window.setTimeout(() => window.location.assign(redirectUrl), REDIRECT_SECONDS * 1000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [done, form]);

  const cfg = form?.config || {};
  const primary = cfg.primaryColor || "#3daa57";
  const bg = cfg.backgroundColor || "#f6f7f9";
  const textColor = cfg.textColor || "#18181b";
  const radius = typeof cfg.radius === "number" ? cfg.radius : 10;
  const align = cfg.align === "center" ? "center" : "left";

  const pages = useMemo(() => {
    const map = new Map<number, PublicFormField[]>();
    for (const field of fields) {
      const page = Math.max(1, Number(field.page) || 1);
      map.set(page, [...(map.get(page) || []), field]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => group);
  }, [fields]);
  const totalPages = Math.max(1, pages.length);
  const currentFields = pages[pageIndex] || [];
  const isLastPage = pageIndex >= totalPages - 1;
  const progress = Math.min(99, Math.round(((pageIndex + 1) / totalPages) * 100));

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const attach = async (field: PublicFormField, list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const prepared: PendingFile[] = [];
    for (const file of Array.from(list).slice(0, 3)) {
      if (file.size > MAX_UPLOAD_BYTES * 2) { setError(`O arquivo "${file.name}" é muito grande (máx. 8 MB).`); return; }
      const ready = await prepareFile(file, field.name);
      if (ready.size > MAX_UPLOAD_BYTES) { setError(`O arquivo "${file.name}" excede 8 MB.`); return; }
      prepared.push(ready);
    }
    setFiles((prev) => ({ ...prev, [field.name]: [...(prev[field.name] || []), ...prepared].slice(0, 3) }));
  };

  const pageIsValid = () => {
    for (const field of currentFields) {
      if (!field.required) continue;
      if (field.field_type === "file") {
        if (!(files[field.name] || []).length) { setError(`Envie um arquivo em "${field.label}".`); return false; }
        continue;
      }
      if (!values[field.name]) { setError(`Preencha o campo "${field.label}".`); return false; }
    }
    return true;
  };

  const goNext = () => {
    setError(null);
    if (!pageIsValid()) return;
    setPageIndex((index) => Math.min(totalPages - 1, index + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isLastPage) { goNext(); return; }
    if (!pageIsValid()) return;
    if (!consent) { setError("Confirme o aceite para que possamos entrar em contato."); return; }
    setSubmitting(true);
    try {
      const data = await callPublic<any>({
        action: "submit",
        slug,
        data: values,
        files: Object.values(files).flat(),
        hp: honeypot.current,
        consent: { accepted: true, text: CONSENT_TEXT, version: CONSENT_VERSION, accepted_at: new Date().toISOString() },
        utm: tracking.utm,
        wz_link: tracking.wz_link,
        referrer: tracking.referrer,
        landing_url: tracking.landing_url,
      });
      setDone(data?.message || "Obrigado! Recebemos seus dados.");
      if (/^\d{6,20}$/.test(cfg.metaPixelId || "") && typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "Lead");
      }
      if ((window as any).dataLayer) (window as any).dataLayer.push({ event: "form_submit", form_slug: slug });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-500" />
      </div>
    );
  }

  if (state === "missing" || state === "inactive") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-base font-medium text-zinc-800">
            {state === "inactive" ? "Este formulário não está disponível no momento." : "Formulário não encontrado."}
          </p>
        </div>
      </div>
    );
  }

  const inputStyle = { borderRadius: radius } as const;
  const inputClass = "w-full border border-zinc-200 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none transition focus:border-zinc-400";

  const embedded = new URLSearchParams(window.location.search).get("embed") === "1";

  return (
    <div className={`min-h-screen w-full overflow-x-hidden ${embedded ? "p-0" : "px-3 py-6 sm:px-4 sm:py-12"}`} style={{ background: bg, color: textColor }}>
      <div className="mx-auto w-full max-w-lg">
        <div className="overflow-hidden bg-white shadow-sm" style={{ borderRadius: radius + 8 }}>
          {cfg.coverUrl && (
            <div className="p-2">
              <img src={normalizeAssetUrl(cfg.coverUrl)} alt="" loading="eager" className="h-28 w-full object-cover sm:h-36" style={{ borderRadius: Math.max(4, radius) }} />
            </div>
          )}

          {totalPages > 1 && !done && (
            <div className="px-5 pt-4 sm:px-7">
               <div className="flex items-center justify-end text-xs font-semibold opacity-70"><span>{progress}%</span></div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(6, progress)}%`, background: primary }} />
              </div>
            </div>
          )}

          <div className="p-5 sm:p-7">
            {done ? (
              <div className="py-6 text-center" role="dialog" aria-modal="true" aria-label="Formulário enviado">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${primary}18` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" className="h-8 w-8"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <h2 className="text-xl font-semibold" style={{ color: textColor }}>Obrigado!</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm opacity-75" style={{ color: textColor }}>{done}</p>
                {cfg.redirectEnabled && Boolean((cfg.redirectUrl || "").trim()) && (
                  <div className="mx-auto mt-6 flex max-w-sm items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left">
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#e4e4e7" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="16" fill="none" stroke={primary} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 16}
                          strokeDashoffset={2 * Math.PI * 16 * (1 - redirectSeconds / REDIRECT_SECONDS)}
                          style={{ transition: "stroke-dashoffset 1s linear" }}
                        />
                      </svg>
                      <span className="absolute text-xs font-semibold text-zinc-700">{redirectSeconds}</span>
                    </span>
                    <span className="text-sm text-zinc-700">
                      <strong className="block font-medium text-zinc-900">Redirecionando você</strong>
                      Aguarde {redirectSeconds} segundo{redirectSeconds === 1 ? "" : "s"}, estamos abrindo a próxima página.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {cfg.logoUrl && (
                  <div className="mb-5 flex h-14 w-[220px] max-w-full items-center" style={{ justifyContent: align === "center" ? "center" : "flex-start", marginInline: align === "center" ? "auto" : undefined }}>
                    <img src={normalizeAssetUrl(cfg.logoUrl)} alt="" className="h-full w-full object-contain" style={{ objectPosition: align === "center" ? "center" : "left center" }} />
                  </div>
                )}
                <div style={{ textAlign: align as any }}>
                  <h1 className="text-xl font-semibold sm:text-2xl" style={{ color: textColor }}>{form.title}</h1>
                  {form.description && <p className="mt-2 text-sm opacity-70">{form.description}</p>}
                </div>

                <form onSubmit={submit} className="mt-6 space-y-4">
                  <input
                    type="text" tabIndex={-1} autoComplete="off" aria-hidden
                    onChange={(e) => { honeypot.current = e.target.value; }}
                    className="absolute h-0 w-0 opacity-0"
                  />

                  {currentFields.map((f) => {
                    const value = values[f.name] || "";
                    const opts: string[] = Array.isArray(f.options) ? f.options : [];
                    const FieldIcon = FIELD_ICONS[f.field_type] || FileText;
                    return (
                      <div key={f.id} className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: textColor }}>
                          <FieldIcon className="h-4 w-4 shrink-0" style={{ color: primary }} aria-hidden="true" />
                          {f.label}{f.required && <span className="ml-0.5 text-red-500">*</span>}
                        </label>

                        {f.field_type === "textarea" ? (
                          <textarea
                            value={value} required={f.required} placeholder={f.placeholder || ""}
                            onChange={(e) => setValue(f.name, e.target.value)}
                            style={inputStyle} className={`${inputClass} min-h-[110px] resize-y`}
                          />
                        ) : f.field_type === "select" ? (
                          <select value={value} required={f.required} onChange={(e) => setValue(f.name, e.target.value)} style={inputStyle} className={inputClass}>
                            <option value="">{f.placeholder || "Selecione"}</option>
                            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.field_type === "radio" ? (
                          <div className="space-y-2">
                            {opts.map((o) => (
                              <label key={o} className="flex items-center gap-2 text-sm text-zinc-700">
                                <input type="radio" name={f.name} value={o} checked={value === o} onChange={() => setValue(f.name, o)} required={f.required} />
                                {o}
                              </label>
                            ))}
                          </div>
                        ) : f.field_type === "checkbox" ? (
                          <label className="flex items-center gap-2 text-sm text-zinc-700">
                            <input type="checkbox" checked={value === "sim"} onChange={(e) => setValue(f.name, e.target.checked ? "sim" : "")} />
                            {f.placeholder || f.label}
                          </label>
                        ) : f.field_type === "file" ? (
                          <div className="space-y-2">
                             <label
                               onDragOver={(event) => event.preventDefault()}
                               onDrop={(event) => { event.preventDefault(); void attach(f, event.dataTransfer.files); }}
                               className="flex cursor-pointer items-center justify-center gap-3 border border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-left text-sm text-zinc-600 transition-colors hover:border-zinc-400"
                              style={inputStyle}
                            >
                              <input type="file" accept={ACCEPTED_UPLOADS} multiple className="hidden" onChange={(e) => attach(f, e.target.files)} />
                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 18v-6m-3 3 3-3 3 3"/></svg>
                               <span><strong className="block font-medium text-zinc-800">Arraste um arquivo ou clique para enviar</strong><span className="mt-0.5 block text-xs text-zinc-500">Imagens ou PDF, até 8 MB</span></span>
                            </label>
                            {(files[f.name] || []).map((file, index) => (
                              <div key={`${file.filename}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                                <span className="truncate">{file.filename} · {(file.size / 1024).toFixed(0)} KB</span>
                                <button
                                  type="button" className="shrink-0 text-red-500"
                                  onClick={() => setFiles((prev) => ({ ...prev, [f.name]: (prev[f.name] || []).filter((_, position) => position !== index) }))}
                                >
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <input
                            type={f.field_type === "number" ? "number" : f.field_type === "email" ? "email" : "text"}
                            inputMode={f.field_type === "phone" || f.field_type === "whatsapp" ? "tel" : undefined}
                            value={value} required={f.required} placeholder={f.placeholder || ""}
                            onChange={(e) => setValue(f.name, e.target.value)}
                            style={inputStyle} className={inputClass}
                          />
                        )}
                      </div>
                    );
                  })}

                  {isLastPage && (
                    <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-relaxed opacity-70" style={{ color: textColor }}>
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(event) => { setConsent(event.target.checked); if (event.target.checked) setError(null); }}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        style={{ accentColor: primary }}
                      />
                       <span>
                         {CONSENT_TEXT}{" "}
                         <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                           Consulte a Política de Privacidade.
                         </a>
                       </span>
                    </label>
                  )}

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    {pageIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => { setError(null); setPageIndex((index) => Math.max(0, index - 1)); }}
                        className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 sm:w-auto"
                        style={inputStyle}
                      >
                        Voltar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
                      style={{ background: cfg.buttonColor || primary, borderRadius: radius }}
                    >
                      {submitting ? "Enviando..." : isLastPage ? form.button_text : "Continuar"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {!embedded && <p className="mt-4 text-center text-xs opacity-60">
          Formulário seguro · Desenvolvido por{" "}
          <a href="https://wiize.com.br" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Wiize.com.br
          </a>
        </p>}
      </div>
    </div>
  );
}
