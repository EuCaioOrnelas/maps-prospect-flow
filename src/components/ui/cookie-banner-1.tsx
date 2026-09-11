"use client";

import { useEffect, useRef, useState } from "react";
import { Cookie, Shield, Info, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_GRANTED,
  ConsentPrefs,
  DEFAULT_PREFS,
  getConsent,
  hasConsentDecision,
  saveConsent,
} from "@/lib/consent";

interface CookiePanelProps {
  title?: string;
  message?: string;
  acceptText?: string;
  rejectText?: string;
  customizeText?: string;
  icon?: "cookie" | "shield" | "info";
  className?: string;
  privacyHref?: string;
  termsHref?: string;
  onDecision?: (prefs: ConsentPrefs) => void;
}

const CATEGORIES: {
  field: keyof ConsentPrefs;
  title: string;
  desc: string;
  locked?: boolean;
}[] = [
  {
    field: "necessary",
    title: "Essenciais",
    desc: "Funcionamento do site, login, segurança, prevenção a fraude, rastreamento interno de uso e atribuição do programa de parceiros (comissões).",
    locked: true,
  },
  {
    field: "functional",
    title: "Funcionais",
    desc: "Lembram preferências como tema, idioma e itens já vistos para melhorar sua experiência.",
  },
  {
    field: "analytics",
    title: "Analíticos",
    desc: "Métricas agregadas de navegação e desempenho das páginas para melhorarmos o produto.",
  },
  {
    field: "marketing",
    title: "Marketing",
    desc: "Mensuração e personalização de anúncios (Google Ads, Meta Ads) e remarketing.",
  },
];

const CookiePanel = (props: CookiePanelProps) => {
  const {
    title = "Sua privacidade, sua escolha",
    message =
      "Usamos cookies para operar a plataforma, manter sua sessão segura, medir o uso e melhorar sua experiência.",
    acceptText = "Aceitar todos",
    rejectText = "Apenas essenciais",
    customizeText = "Personalizar",
    icon = "cookie",
    className,
    privacyHref = "/privacidade",
    termsHref = "/terms",
    onDecision,
  } = props;

  const [visible, setVisible] = useState(false);
  const [render, setRender] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPrefs>(getConsent());

  const prefsRef = useRef<HTMLDivElement | null>(null);
  const [prefsHeight, setPrefsHeight] = useState(0);

  useEffect(() => {
    if (!hasConsentDecision()) {
      const timer = setTimeout(() => {
        setRender(true);
        requestAnimationFrame(() => setVisible(true));
      }, 3000);
      return () => clearTimeout(timer);
    }
    setPrefs(getConsent());
  }, []);

  useEffect(() => {
    if (showPrefs && prefsRef.current) setPrefsHeight(prefsRef.current.scrollHeight);
    else setPrefsHeight(0);
  }, [showPrefs, prefs]);

  const close = () => {
    setVisible(false);
    setTimeout(() => setRender(false), 400);
  };

  const decide = (value: ConsentPrefs) => {
    saveConsent(value);
    onDecision?.(value);
    setShowPrefs(false);
    close();
  };

  if (!render) return null;

  const IconEl = icon === "shield" ? Shield : icon === "info" ? Info : Cookie;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Aviso de cookies"
      className={cn(
        "fixed bottom-3 left-3 right-3 z-[100] max-h-[75vh] overflow-visible sm:bottom-6 sm:left-6 sm:right-auto sm:w-[min(560px,calc(100vw-3rem))]",
        "transition-all duration-700",
        visible
          ? "opacity-100 translate-x-0 [transition-timing-function:cubic-bezier(0.34,1.4,0.64,1)]"
          : "opacity-0 -translate-x-14 [transition-timing-function:cubic-bezier(0.4,0,1,1)]",
        className,
      )}
    >
      <div className="rounded-2xl border border-border/80 bg-card text-card-foreground shadow-[0_4px_6px_-2px_rgba(0,0,0,0.08),0_12px_24px_-4px_rgba(0,0,0,0.16),0_24px_48px_-8px_rgba(0,0,0,0.24)] overflow-hidden max-h-[inherit] overflow-y-auto">
        <div className="h-1 w-full bg-primary" />
        <div className="relative p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 sm:size-9">
                <IconEl className="size-4" />
              </span>
              <p className="text-sm font-semibold leading-tight">{title}</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              {message} Cookies essenciais são sempre ativos. Veja nossa{" "}
              <a href={privacyHref} className="text-primary hover:underline">
                Política de Privacidade
              </a>{" "}
              e os{" "}
              <a href={termsHref} className="text-primary hover:underline">
                Termos de Uso
              </a>
              .
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => decide(ALL_GRANTED)}
              className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
            >
              {acceptText}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPrefs((p) => !p)}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            aria-expanded={showPrefs}
          >
            {customizeText}
            {showPrefs ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          <div
            className="overflow-hidden transition-all duration-300"
            style={{ height: prefsHeight ? `${prefsHeight}px` : "0px" }}
          >
            <div ref={prefsRef} className="pt-3 space-y-2.5">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Estas são as categorias de cookies utilizadas na plataforma:
              </p>
              {CATEGORIES.map((c) => (
                <div key={c.field} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border border-border bg-primary/15 text-primary">
                    <Check className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium">{c.title}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CookiePanel };
