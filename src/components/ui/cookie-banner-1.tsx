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
    desc: "Mensuração e personalização de anúncios (Google Ads, Meta Ads) e remarketing.",
  },
];

const CookiePanel = (props: CookiePanelProps) => {
  const {
    title = "Sua privacidade, sua escolha",
    message =
      "Usamos cookies para operar a plataforma, manter sua sessão segura, medir o uso e melhorar sua experiência. Para navegar com todos os recursos ativos, aceite todos os cookies.",
    acceptText = "Aceitar todos os cookies",
    customizeText = "Personalizar minhas escolhas",
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
    <>
      {/* Bloqueia a navegação até que o visitante decida */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-[99] bg-black/70 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aviso de cookies"
        className={cn(
          "fixed bottom-5 left-5 z-[100] w-[min(480px,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto",
          "transition-all duration-300",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          className,
        )}
      >
        <div className="rounded-panel border border-border bg-card text-card-foreground shadow-2xl shadow-black/30 overflow-hidden">
          <div className="h-1.5 w-full bg-primary" />
          <div className="relative p-6">
            <button
              type="button"
              onClick={() => decide(DEFAULT_PREFS)}
              className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground/70"
              aria-label="Recusar cookies opcionais e usar apenas essenciais"
              title="Usar apenas cookies essenciais"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3 pr-6">
              <span className="inline-flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <IconEl className="size-5" />
              </span>
              <p className="text-base sm:text-lg font-semibold leading-tight">{title}</p>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
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

            <button
              type="button"
              onClick={() => decide(ALL_GRANTED)}
              className="mt-5 w-full rounded-hover bg-primary px-4 py-3.5 text-sm sm:text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
            >
              {acceptText}
            </button>

            <button
              type="button"
              onClick={() => setShowPrefs((p) => !p)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-hover px-3 py-2 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              aria-expanded={showPrefs}
            >
              {customizeText}
              {showPrefs ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            <div
              className="overflow-hidden transition-all duration-300"
              style={{ height: prefsHeight ? `${prefsHeight}px` : "0px" }}
            >
              <div ref={prefsRef} className="pt-4 space-y-3.5">
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
                    className="rounded-hover border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(prefs)}
                    className="rounded-hover border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
                  >
                    Salvar apenas o que marquei
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Sua escolha fica salva neste navegador. Se você limpar os dados do navegador, o aviso
              aparecerá novamente.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export { CookiePanel };
