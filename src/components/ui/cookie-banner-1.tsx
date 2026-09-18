"use client";

import { useEffect, useState } from "react";
import { Cookie, Shield, Info, Check } from "lucide-react";
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
  rejectText?: string;
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

/** Recusa apenas os cookies de marketing/anúncios. Essenciais, funcionais e
 *  analíticos continuam ativos para o site funcionar e ser medido. */
const MARKETING_DENIED: ConsentPrefs = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: false,
};

const CookiePanel = (props: CookiePanelProps) => {
  const {
    message = "Usamos cookies para oferecer a melhor experiência, manter sua sessão segura, analisar o uso do site e personalizar conteúdos e anúncios.",
    acceptText = "Aceitar cookies",
    customizeText = "Configurar cookies",
    rejectText = "Rejeitar cookies não necessários",
    icon = "cookie",
    className,
    privacyHref = "/privacy",
    termsHref = "/terms",
    onDecision,
  } = props;

  const [visible, setVisible] = useState(false);
  const [render, setRender] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPrefs>(getConsent());

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
        "fixed inset-x-0 bottom-0 z-[100] border-t border-border/60 bg-card text-card-foreground shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.35)]",
        "transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
        className,
      )}
    >
      <div className="mx-auto max-h-[70vh] w-full max-w-[1400px] overflow-y-auto px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconEl className="size-6" />
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {message} Para mais informações, consulte nosso{" "}
              <a href={privacyHref} className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80">
                Aviso de Privacidade
              </a>{" "}
              e os{" "}
              <a href={termsHref} className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80">
                Termos de Uso
              </a>
              .
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 sm:items-end lg:shrink-0">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setShowPrefs((p) => !p)}
                aria-expanded={showPrefs}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-muted sm:text-sm"
              >
                {customizeText}
              </button>
              <button
                type="button"
                onClick={() => decide(ALL_GRANTED)}
                className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90 sm:text-sm"
              >
                {acceptText}
              </button>
            </div>
            <button
              type="button"
              onClick={() => decide(MARKETING_DENIED)}
              className="text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              {rejectText}
            </button>
          </div>
        </div>

        {showPrefs && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((c) => {
                const checked = c.locked ? true : prefs[c.field];
                return (
                  <label
                    key={c.field}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border border-border/70 p-3",
                      c.locked ? "cursor-default opacity-90" : "cursor-pointer hover:border-primary/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-transparent",
                      )}
                    >
                      <Check className="size-3.5" />
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={c.locked}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, [c.field]: e.target.checked, necessary: true }))
                      }
                    />
                    <span>
                      <span className="block text-xs font-medium">{c.title}</span>
                      <span className="block text-[11px] leading-relaxed text-muted-foreground">
                        {c.desc}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => decide({ ...prefs, necessary: true })}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-muted sm:text-sm"
              >
                Salvar preferências
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { CookiePanel };
