"use client";

import { useEffect, useRef, useState } from "react";
import { Cookie, Shield, Info, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_GRANTED,
  ConsentPrefs,
  getConsent,
  hasConsentDecision,
  saveConsent,
} from "@/lib/consent";

interface CookiePanelProps {
  title?: string;
  message?: string;
  acceptText?: string;
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
    desc: "Mensuração e personalização de campanhas (Google Ads, Meta Ads) e remarketing.",
  },
];

const CookiePanel = (props: CookiePanelProps) => {
  const {
    title = "Este site usa cookies",
    message = "Usamos cookies para operar a plataforma, medir o uso e melhorar sua experiência.",
    acceptText = "Aceitar todos",
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
      setRender(true);
      requestAnimationFrame(() => setVisible(true));
    }
    setPrefs(getConsent());
  }, []);

  useEffect(() => {
    if (showPrefs && prefsRef.current) setPrefsHeight(prefsRef.current.scrollHeight);
    else setPrefsHeight(0);
  }, [showPrefs, prefs]);

  const close = () => {
    setVisible(false);
    setTimeout(() => setRender(false), 300);
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
      aria-label="Aviso de cookies"
      className={cn(
        "fixed bottom-4 left-4 z-[100] w-[min(380px,calc(100vw-2rem))]",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      )}
    >
      <div className="rounded-panel border border-border bg-card text-card-foreground shadow-2xl shadow-black/10 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <IconEl className="size-4" />
            </span>
            <p className="text-sm font-semibold">{title}</p>
            <button
              type="button"
              onClick={() => decide({ ...getConsent(), necessary: true })}
              className="ml-auto inline-flex size-8 items-center justify-center rounded-md hover:bg-foreground/5"
              aria-label="Fechar aviso de cookies"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {message} Cookies essenciais (funcionamento, segurança, rastreamento interno de uso e
            atribuição de parceiros) são sempre ativos. Veja nossa{" "}
            <a href={privacyHref} className="text-primary hover:underline">
              Política de Privacidade
            </a>{" "}
            e os{" "}
            <a href={termsHref} className="text-primary hover:underline">
              Termos de Uso
            </a>
            .
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrefs((p) => !p)}
              className="flex items-center gap-1 rounded-hover border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
              aria-expanded={showPrefs}
            >
              {customizeText}
              {showPrefs ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => decide(ALL_GRANTED)}
              className="ml-auto rounded-hover bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {acceptText}
            </button>
          </div>

          <div
            className="overflow-hidden transition-all duration-300"
            style={{ height: prefsHeight ? `${prefsHeight}px` : "0px" }}
          >
            <div ref={prefsRef} className="pt-4 space-y-3">
              {CATEGORIES.map((c) => (
                <div key={c.field} className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      !c.locked && setPrefs((p) => ({ ...p, [c.field]: !p[c.field] }))
                    }
                    className={cn(
                      "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border",
                      c.locked
                        ? "cursor-not-allowed border-border bg-primary/15 text-primary"
                        : prefs[c.field]
                          ? "cursor-pointer border-primary bg-primary text-primary-foreground"
                          : "cursor-pointer border-border bg-background hover:bg-accent",
                    )}
                    aria-pressed={prefs[c.field]}
                    aria-label={`Preferência de cookies: ${c.title}`}
                  >
                    {prefs[c.field] && <Check className="size-3.5" />}
                  </button>
                  <div>
                    <p className="text-xs font-medium">
                      {c.title}{" "}
                      {c.locked && (
                        <span className="text-[10px] font-normal text-muted-foreground">
                          (obrigatório)
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPrefs(false)}
                  className="rounded-hover border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => decide(prefs)}
                  className="rounded-hover bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Salvar preferências
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CookiePanel };
