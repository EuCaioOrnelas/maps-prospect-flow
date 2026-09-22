"use client";

import { useEffect, useState } from "react";
import { Cookie, Shield, Info, SlidersHorizontal } from "lucide-react";
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

const OPTIONAL_DENIED: ConsentPrefs = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const CookiePanel = (props: CookiePanelProps) => {
  const {
    message = "Usamos cookies para oferecer a melhor experiência, manter sua sessão segura, analisar o uso do site e personalizar conteúdos e anúncios.",
    acceptText = "Aceitar cookies",
    rejectText = "Rejeitar cookies",
    icon = "cookie",
    className,
    privacyHref = "/privacy",
    termsHref = "/terms",
    onDecision,
  } = props;

  const [visible, setVisible] = useState(false);
  const [render, setRender] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPrefs>(getConsent());

  useEffect(() => {
    if (!hasConsentDecision()) {
      const timer = setTimeout(() => {
        setRender(true);
        requestAnimationFrame(() => setVisible(true));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(() => setRender(false), 400);
  };

  const decide = (value: ConsentPrefs) => {
    saveConsent(value);
    onDecision?.(value);
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

          <div className="flex flex-col items-center gap-1.5 lg:shrink-0">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button type="button" onClick={() => setCustomizing((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:text-sm">
                <SlidersHorizontal className="size-4" aria-hidden="true" /> Personalizar
              </button>
              <button type="button" onClick={() => decide(OPTIONAL_DENIED)} className="rounded-lg px-3 py-2 text-[11px] font-medium text-muted-foreground/60 transition-colors hover:text-muted-foreground sm:text-xs">
                {rejectText.replace("cookies", "opcionais")}
              </button>
              <button
                type="button"
                onClick={() => decide(ALL_GRANTED)}
                className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90 sm:text-sm"
              >
                {acceptText}
              </button>
            </div>
          </div>
        </div>
        {customizing && (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: "necessary", label: "Essenciais", description: "Sessão, segurança e funcionamento.", disabled: true },
              { key: "functional", label: "Funcionais", description: "Preferências e recursos opcionais." },
              { key: "analytics", label: "Analíticos", description: "Medição de uso e desempenho." },
              { key: "marketing", label: "Marketing", description: "Campanhas e publicidade." },
            ].map((item) => (
              <label key={item.key} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                <input type="checkbox" checked={preferences[item.key as keyof ConsentPrefs]} disabled={item.disabled} onChange={(event) => setPreferences((current) => ({ ...current, [item.key]: event.target.checked }))} className="mt-0.5 size-4 accent-primary" />
                <span><span className="block text-sm font-medium text-foreground">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span>
              </label>
            ))}
            <button type="button" onClick={() => decide(preferences)} className="rounded-lg bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:col-span-2 lg:col-span-4 lg:justify-self-end">
              Salvar preferências
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export { CookiePanel };
