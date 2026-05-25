import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

export type TourStep = {
  id: string;
  /** Optional route to navigate to before showing this step */
  route?: string;
  /** CSS selector of the element to highlight. If omitted, popup is centered. */
  target?: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Force the sidebar to stay expanded for this step */
  forceSidebar?: boolean;
  /** Open ONLY this submenu in the sidebar (oportunidades|campanhas|crm|automacao|chat|dashboard). Implies forceSidebar. */
  sidebarSection?: "oportunidades" | "campanhas" | "crm" | "automacao" | "chat" | "dashboard";
  /** Inject the synthetic demo lead at the top of the gestão list */
  injectDemoLead?: boolean;
  /** Inject aspirational fake data into the cockpit (MainDashboard) */
  injectDemoCockpit?: boolean;
  /** Keep the viewport pinned to the top for this step */
  keepViewportTop?: boolean;
  /** Run an action right when this step becomes active (e.g. typing simulation) */
  onEnter?: () => void | Promise<void>;
  /** If true, run onEnter before waiting for the target to exist.
   * Useful for steps whose target is created/opened by onEnter itself (dialogs/tabs).
   */
  resolveTargetAfterEnter?: boolean;
  /** Wait this many ms before marking the step "ready" (after route transitions) */
  waitMs?: number;
  /** If true, body popup overlaps the highlighted area (for sidebar spotlight) */
  popupOffset?: number;
  /** Hide the current spotlight immediately and only restore it when the new target exists.
   * `true` applies while advancing; `"always"` also applies on back navigation.
   */
  hideSpotlightWhileTargetLoads?: boolean | "always";
};

interface GuidedTourContextValue {
  isActive: boolean;
  currentStepIndex: number;
  steps: TourStep[];
  direction: "next" | "prev";
  start: () => void;
  next: () => void;
  prev: () => void;
  finish: () => void;
}

// Per-user key so the tour shows for each new account on the same browser.
// Legacy global key is migrated/cleared at startup.
const LS_KEY_LEGACY = "wiize_tour_completed_v3";
const lsKeyFor = (userId: string) => `wiize_tour_completed_v3:${userId}`;

const GuidedTourContext = createContext<GuidedTourContextValue | undefined>(undefined);

// Helper to type into a real input
async function simulateTyping(selector: string, text: string, delay = 50) {
  const el = document.querySelector(selector) as HTMLInputElement | null;
  if (!el) return;
  el.focus();
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  for (let i = 1; i <= text.length; i++) {
    setter?.call(el, text.slice(0, i));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, delay));
  }
  el.blur();
}

function clearInput(selector: string) {
  const el = document.querySelector(selector) as HTMLInputElement | null;
  if (!el) return;
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, "");
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function resolveTargetSelectors(selector: string) {
  return selector
    .split("||")
    .map((part) => part.trim())
    .filter(Boolean);
}

function queryTargetElement<T extends Element = HTMLElement>(selector: string) {
  const selectors = resolveTargetSelectors(selector);
  for (const candidate of selectors) {
    const element = document.querySelector(candidate) as T | null;
    if (element) return element;
  }
  return null;
}

async function waitForElement<T extends Element = HTMLElement>(selector: string, attempts = 30, delay = 120) {
  for (let i = 0; i < attempts; i++) {
    const element = queryTargetElement<T>(selector);
    if (element) return element;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return null;
}

async function openDemoLeadDialog() {
  const existingLeadDialog = document
    .querySelector('[role="dialog"] [data-tour="lead-tab-dados"]')
    ?.closest('[role="dialog"]') as HTMLElement | null;
  if (existingLeadDialog) return existingLeadDialog;

  const openDialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
  if (openDialog) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 180));
  }

  const row = await waitForElement<HTMLElement>('[data-tour="lead-row-demo"]', 40, 120);
  row?.click();

  return waitForElement<HTMLElement>('[role="dialog"] [data-tour="lead-tab-dados"]', 25, 120).then(
    (tab) => (tab?.closest('[role="dialog"]') as HTMLElement | null) ?? null
  );
}

async function activateLeadTab(selector: string) {
  const tab = await waitForElement<HTMLElement>(selector, 25, 120);
  tab?.click();
  await new Promise((resolve) => setTimeout(resolve, 120));
}

function centerElementInScrollArea(element: HTMLElement, scrollAreaId = "lead-detail-scroll-area") {
  const scrollArea = document.getElementById(scrollAreaId);
  if (!scrollArea) {
    element.scrollIntoView({ block: "center", behavior: "auto" });
    return;
  }

  const elRect = element.getBoundingClientRect();
  const areaRect = scrollArea.getBoundingClientRect();
  const offsetWithinArea = elRect.top - areaRect.top + scrollArea.scrollTop;
  const targetTop = Math.max(0, offsetWithinArea - scrollArea.clientHeight / 3);
  scrollArea.scrollTo({ top: targetTop, behavior: "auto" });
}

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const startedRef = useRef(false);

  const steps: TourStep[] = [
    {
      id: "welcome",
      route: "/dashboard",
      title: "Bem-vindo à Wiize",
      body: "Vamos te apresentar a sua nova operação comercial em quatro pilares: captação, prospecção, atendimento e gestão. Em poucos minutos você entende exatamente como cada parte trabalha por você.",
      placement: "center",
      injectDemoCockpit: true,
    },

    // ---- Cockpit ----
    {
      id: "cockpit-overview",
      route: "/dashboard",
      target: '[data-tour="cockpit-hero"]',
      title: "Cockpit de Crescimento",
      body: "Esta é a sua central de comando. Aqui você acompanha o impacto financeiro gerado, a curva de leads captados e o resultado consolidado da sua operação em tempo real.",
      placement: "bottom",
      injectDemoCockpit: true,
      waitMs: 600,
    },
    {
      id: "cockpit-kpis",
      route: "/dashboard",
      target: '[data-tour="cockpit-kpis"]',
      title: "Indicadores executivos",
      body: "Receita potencial, leads quentes do dia, saúde da operação e o tempo que a IA economizou para você. Tudo o que precisa saber em quatro cartões.",
      placement: "top",
      injectDemoCockpit: true,
      waitMs: 400,
    },
    {
      id: "cockpit-forecast",
      route: "/dashboard",
      target: '[data-tour="cockpit-forecast"]',
      title: "Projeção e funil",
      body: "À esquerda, a projeção de receita por nível de score. À direita, o funil operacional completo: do lead captado à oportunidade gerada.",
      placement: "top",
      injectDemoCockpit: true,
      waitMs: 400,
    },

    // ---- Captação ----
    {
      id: "sidebar-oportunidades-intro",
      route: "/dashboard",
      target: '[data-tour="sidebar-oportunidades"]',
      title: "Captação de leads",
      body: "Tudo começa no menu Oportunidades. É aqui que você busca novas empresas e acompanha o que já foi captado. Vamos entrar nele agora.",
      placement: "right",
      sidebarSection: "oportunidades",
      waitMs: 700,
    },
    {
      id: "sidebar-oportunidades-buscar",
      route: "/dashboard",
      target: '[data-tour="sidebar-oportunidades-buscar"]',
      title: "Item Buscar",
      body: "Este é o ponto de entrada da sua captação. Em Buscar você encontra empresas reais do Google Maps prontas para serem prospectadas. Vamos abrir essa página.",
      placement: "right",
      sidebarSection: "oportunidades",
      waitMs: 700,
    },
    {
      id: "search-empty",
      route: "/oportunidades",
      target: '#keyword || [data-tour="search-keyword"]',
      title: "Defina o nicho",
      body: "Comece pela palavra-chave do nicho que você quer captar. Exemplo: clínicas, contabilidades, restaurantes ou imobiliárias.",
      placement: "top",
      waitMs: 1100,
      hideSpotlightWhileTargetLoads: "always",
    },
    {
      id: "search-typing",
      route: "/oportunidades",
      target: '#location || [data-tour="search-location"]',
      title: "Escolha a cidade",
      body: "Agora defina a localização que deseja prospectar. A busca pode ser local, nacional ou internacional.",
      placement: "top",
      waitMs: 500,
      hideSpotlightWhileTargetLoads: "always",
      onEnter: async () => {
        await waitForElement('#keyword', 40, 100);
        clearInput("#keyword");
        clearInput("#location");
        await simulateTyping("#keyword", "Clínicas de estética", 45);
        await new Promise((r) => setTimeout(r, 200));
        await simulateTyping("#location", "São Paulo, SP", 45);
      },
    },
    {
      id: "search-button",
      route: "/oportunidades",
      target: '[data-tour="search-button"] || button[type="submit"]',
      title: "Prospecte oportunidades",
      body: "Com os campos preenchidos, basta clicar aqui para a Wiize encontrar empresas qualificadas para sua abordagem.",
      placement: "top",
      waitMs: 500,
      hideSpotlightWhileTargetLoads: "always",
      onEnter: async () => {
        const btn = await waitForElement<HTMLElement>('[data-tour="search-button"]', 40, 100);
        if (btn) {
          btn.setAttribute("data-tour-loading", "true");
          btn.style.transition = "box-shadow 600ms ease";
          btn.style.boxShadow = "0 0 0 4px hsl(var(--primary) / 0.18), 0 0 40px hsl(var(--primary) / 0.45)";
          setTimeout(() => {
            btn.removeAttribute("data-tour-loading");
            btn.style.boxShadow = "";
          }, 2200);
        }
      },
    },

    // ---- Gestão / Diagnóstico ----
    {
      id: "sidebar-oportunidades-gestao",
      route: "/oportunidades",
      target: '[data-tour="sidebar-oportunidades-gestao"]',
      title: "Gestão de Oportunidades (Captação)",
      body: "Toda empresa captada vai parar aqui — ainda na etapa de Captação. É onde a IA analisa cada lead em profundidade antes de virar negócio. Vamos entrar.",
      placement: "right",
      sidebarSection: "oportunidades",
      waitMs: 700,
    },
    {
      id: "management",
      route: "/oportunidades/gestao",
      title: "Gestão de Oportunidades (Captação)",
      body: "Esta tela ainda faz parte da Captação: cada empresa recebe uma pontuação, um diagnóstico de pontos fortes e fracos e uma probabilidade de fechamento. A gestão do funil de vendas (CRM, pipeline e score de contatos) acontece em outro menu, que veremos mais à frente.",
      placement: "center",
      injectDemoLead: true,
      waitMs: 700,
    },
    {
      id: "diagnosis",
      route: "/oportunidades/gestao",
      target: '[data-tour="lead-score-summary"]',
      title: "Diagnóstico inteligente",
      body: "Abrimos um lead de exemplo. Veja o score total (0–100), a quebra por dimensão (estrutura digital, reputação e potencial) e a probabilidade de conversão.",
      placement: "right",
      injectDemoLead: true,
      waitMs: 120,
      resolveTargetAfterEnter: true,
      hideSpotlightWhileTargetLoads: "always",
      onEnter: async () => {
        const dialog = await openDemoLeadDialog();
        if (!dialog) return;

        await activateLeadTab('[data-tour="lead-tab-score"]');
        const summary = await waitForElement<HTMLElement>('[data-tour="lead-score-summary"]', 25, 70);
        if (summary) {
          centerElementInScrollArea(summary);
        }
      },
    },
    {
      id: "approach-message",
      route: "/oportunidades/gestao",
      target: '[data-tour="lead-approach-card"]',
      title: "Abordagem gerada por IA",
      body: "Com base no diagnóstico, a Wiize escreve uma mensagem personalizada para o primeiro contato. Você pode copiar, ajustar ou enviar direto pelo WhatsApp.",
      placement: "right",
      injectDemoLead: true,
      waitMs: 150,
      resolveTargetAfterEnter: true,
      hideSpotlightWhileTargetLoads: "always",
      onEnter: async () => {
        const dialog = await openDemoLeadDialog();
        if (!dialog) return;

        await activateLeadTab('[data-tour="lead-tab-dados"]');

        const section = await waitForElement<HTMLElement>('[data-tour="lead-approach-card"]', 30, 80);
        if (section) {
          centerElementInScrollArea(section);
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
      },
    },

    // ---- Prospecção (Campanhas) ----
    {
      id: "sidebar-campanhas-intro",
      route: "/dashboard",
      target: '[data-tour="sidebar-campanhas"]',
      title: "Prospecção em escala",
      body: "O menu Campanha concentra os dois modos de envio em volume. Vamos passar por cada um.",
      placement: "right",
      sidebarSection: "campanhas",
      waitMs: 700,
    },
    {
      id: "sidebar-campanhas-prospeccao",
      route: "/dashboard",
      target: '[data-tour="sidebar-campanhas-prospeccao"]',
      title: "Prospecção fria (Outbound)",
      body: "Use seus próprios números do WhatsApp para envios em massa, com aquecimento controlado e variações automáticas de mensagem.",
      placement: "right",
      sidebarSection: "campanhas",
      waitMs: 700,
    },
    {
      id: "sidebar-campanhas-relacionamento",
      route: "/dashboard",
      target: '[data-tour="sidebar-campanhas-relacionamento"]',
      title: "Relacionamento (API Oficial Meta)",
      body: "Envios oficiais via Meta Cloud API com templates aprovados. Ideal para nutrir e reativar quem já é seu cliente.",
      placement: "right",
      sidebarSection: "campanhas",
      waitMs: 500,
    },

    // ---- Gestão (CRM) ----
    {
      id: "sidebar-crm-intro",
      route: "/dashboard",
      target: '[data-tour="sidebar-crm"]',
      title: "Gestão do funil (CRM)",
      body: "No menu CRM você acompanha todo o funil de vendas e a qualificação automática dos seus leads.",
      placement: "right",
      sidebarSection: "crm",
      waitMs: 700,
    },
    {
      id: "sidebar-crm-pipeline",
      route: "/dashboard",
      target: '[data-tour="sidebar-crm-pipeline"]',
      title: "Pipeline visual",
      body: "Acompanhe cada lead pelas etapas do funil, do primeiro contato ao fechamento, com kanban e arrastar e soltar.",
      placement: "right",
      sidebarSection: "crm",
      waitMs: 700,
    },
    {
      id: "sidebar-crm-score",
      route: "/dashboard",
      target: '[data-tour="sidebar-crm-score"]',
      title: "Score de contatos",
      body: "Identifique os leads mais quentes em uma escala de 0 a 1.000, baseada em engajamento, intenção de compra e respostas no WhatsApp.",
      placement: "right",
      sidebarSection: "crm",
      waitMs: 500,
    },

    // ---- Atendimento ----
    {
      id: "sidebar-chat",
      route: "/dashboard",
      target: '[data-tour="sidebar-chat"]',
      title: "Atendimento unificado",
      body: "Todas as conversas em um único lugar. Responda manualmente ou deixe a IA conduzir o atendimento por você, 24 horas por dia.",
      placement: "right",
      sidebarSection: "chat",
      waitMs: 600,
    },

    // ---- Automação ----
    {
      id: "sidebar-automacao-intro",
      route: "/dashboard",
      target: '[data-tour="sidebar-automacao"]',
      title: "Automação completa",
      body: "Aqui você cria fluxos conversacionais, configura agentes de IA e prepara seus números para o envio em volume. Vamos passar por cada um.",
      placement: "right",
      sidebarSection: "automacao",
      waitMs: 700,
    },
    {
      id: "sidebar-automacao-fluxos",
      route: "/dashboard",
      target: '[data-tour="sidebar-automacao-fluxos"]',
      title: "Fluxos automáticos",
      body: "Construa jornadas conversacionais com mensagens, condições, esperas e integrações nativas com Google e WhatsApp.",
      placement: "right",
      sidebarSection: "automacao",
      waitMs: 600,
    },
    {
      id: "sidebar-automacao-agentes",
      route: "/dashboard",
      target: '[data-tour="sidebar-automacao-agentes"]',
      title: "Agentes de IA",
      body: "Configure um atendente virtual que conversa, qualifica e marca reuniões 24 horas por dia, mantendo o tom da sua marca.",
      placement: "right",
      sidebarSection: "automacao",
      waitMs: 600,
    },
    {
      id: "sidebar-automacao-aquecimento",
      route: "/dashboard",
      target: '[data-tour="sidebar-automacao-aquecimento"]',
      title: "Aquecimento de números",
      body: "Aqueça novos chips de WhatsApp com conversas naturais geradas por IA antes de iniciar campanhas em volume, reduzindo riscos de bloqueio.",
      placement: "right",
      sidebarSection: "automacao",
      waitMs: 500,
    },

    {
      id: "final",
      route: "/dashboard",
      title: "Tudo pronto para escalar",
      body: "Você já conhece toda a operação Wiize. Agora é com você: capte, prospecte, atenda e feche mais negócios com inteligência.",
      placement: "center",
    },
  ];

  // Auto-start on first dashboard visit.
  // Depend on user?.id (stable) instead of the whole user object (re-created on
  // every auth refresh, which was canceling the async start before it fired).
  const userId = user?.id;
  useEffect(() => {
    if (!userId || startedRef.current) return;
    if (location.pathname !== "/dashboard") return;
    const LS_KEY = lsKeyFor(userId);
    // One-time migration: clear the legacy global flag so it doesn't block new users
    if (localStorage.getItem(LS_KEY_LEGACY)) {
      localStorage.removeItem(LS_KEY_LEGACY);
    }
    if (localStorage.getItem(LS_KEY)) {
      startedRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_onboarding")
        .select("tour_completed_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.tour_completed_at) {
        startedRef.current = true;
        localStorage.setItem(LS_KEY, "1");
        return;
      }

      // Preload pages used in the tour for instant transitions
      try {
        await Promise.all([
          import("@/pages/Dashboard"),
          import("@/pages/OpportunitiesManagement"),
        ]);
      } catch (e) {
        console.warn("[tour] preload failed", e);
      }
      if (cancelled) return;

      // Mark started + persist BEFORE firing so refresh mid-tour doesn't restart it.
      startedRef.current = true;
      localStorage.setItem(LS_KEY, "1");
      try {
        await supabase
          .from("user_onboarding")
          .update({ tour_completed_at: new Date().toISOString() })
          .eq("user_id", userId);
      } catch (e) {
        console.error("[tour] mark-shown error", e);
      }

      setTimeout(() => {
        setCurrentStepIndex(0);
        setIsActive(true);
      }, 300);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, location.pathname]);

  useEffect(() => {
    const step = steps[currentStepIndex];
    const sections = ["oportunidades", "campanhas", "crm", "automacao", "chat", "dashboard"];

    sections.forEach((s) => document.body.classList.remove(`tour-open-${s}`));
    document.body.classList.remove("tour-sidebar-open", "tour-demo-lead", "tour-demo-cockpit");

    if (!isActive || !step) return;

    if (step.sidebarSection) {
      document.body.classList.add(`tour-open-${step.sidebarSection}`);
    } else if (step.forceSidebar) {
      document.body.classList.add("tour-sidebar-open");
    }

    if (step.injectDemoLead) {
      document.body.classList.add("tour-demo-lead");
    }
    if (step.injectDemoCockpit) {
      document.body.classList.add("tour-demo-cockpit");
    }
  }, [isActive, currentStepIndex, steps]);

  const goToStep = useCallback(
    async (index: number) => {
      const step = steps[index];
      if (!step) return;

      // PRE-APPLY sidebar classes BEFORE navigating/measuring so the sidebar
      // is already expanded with the CORRECT submenu open by the time the
      // spotlight measures the target. This prevents the "icon-then-expand"
      // flicker and the "wrong position" issue when collapsing other submenus.
      const sections = ["oportunidades", "campanhas", "crm", "automacao", "chat", "dashboard"];
      sections.forEach((s) => document.body.classList.remove(`tour-open-${s}`));
      document.body.classList.remove("tour-sidebar-open");
      if (step.sidebarSection) {
        document.body.classList.add(`tour-open-${step.sidebarSection}`);
      } else if (step.forceSidebar) {
        document.body.classList.add("tour-sidebar-open");
      }

      // Close any open lead dialog if we're moving away from diagnosis steps
      const isDialogStep = step.id === "diagnosis" || step.id === "approach-message";
      if (!isDialogStep) {
        const openDialog = document.querySelector('[role="dialog"]');
        if (openDialog) {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      // Navigate first
      if (step.route && location.pathname !== step.route) {
        navigate(step.route);
        await new Promise((r) => setTimeout(r, step.waitMs ?? 500));
      } else if (step.waitMs) {
        await new Promise((r) => setTimeout(r, step.waitMs));
      }

      const shouldResolveTargetAfterEnter = !!step.resolveTargetAfterEnter;

      if (shouldResolveTargetAfterEnter && step.onEnter) {
        await step.onEnter();
      }

      // Robust: if the step targets a real selector, wait for it to mount
      // (handles slower external environments where waitMs isn't enough).
      if (step.target) {
        await waitForElement(step.target, 60, 120);
      }

      if (step.keepViewportTop) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }

      // For sidebar steps, wait for the full sidebar expansion (300ms width)
      // + submenu expansion (300ms max-height) before measuring.
      if (step.sidebarSection) {
        await new Promise((r) => setTimeout(r, 450));
      }

      if (!shouldResolveTargetAfterEnter && step.onEnter) {
        await step.onEnter();
      }
    },
    [navigate, location.pathname, steps]
  );

  const start = useCallback(async () => {
    // Preload route chunks so navigation during the tour is instant
    try {
      await Promise.all([
        import("@/pages/Dashboard"),
        import("@/pages/OpportunitiesManagement"),
      ]);
    } catch (e) {
      console.warn("[tour] preload failed", e);
    }
    setCurrentStepIndex(0);
    setIsActive(true);
    goToStep(0);
  }, [goToStep]);

  const next = useCallback(() => {
    setDirection("next");
    setCurrentStepIndex((i) => {
      const ni = Math.min(i + 1, steps.length - 1);
      goToStep(ni);
      return ni;
    });
  }, [goToStep, steps.length]);

  const prev = useCallback(() => {
    setDirection("prev");
    setCurrentStepIndex((i) => {
      const ni = Math.max(i - 1, 0);
      goToStep(ni);
      return ni;
    });
  }, [goToStep]);

  const persistCompletion = useCallback(async () => {
    if (user) localStorage.setItem(lsKeyFor(user.id), "1");
    if (!user) return;
    try {
      await supabase
        .from("user_onboarding")
        .update({ tour_completed_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } catch (e) {
      console.error("[tour] persist error", e);
    }
  }, [user]);

  const finish = useCallback(() => {
    setIsActive(false);
    const sections = ["oportunidades", "campanhas", "crm", "automacao", "chat", "dashboard"];
    sections.forEach((s) => document.body.classList.remove(`tour-open-${s}`));
    document.body.classList.remove("tour-sidebar-open");
    document.body.classList.remove("tour-demo-lead");
    const openDialog = document.querySelector('[role="dialog"]');
    if (openDialog) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    persistCompletion();
  }, [persistCompletion]);

  return (
    <GuidedTourContext.Provider
      value={{ isActive, currentStepIndex, steps, direction, start, next, prev, finish }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error("useGuidedTour must be used within GuidedTourProvider");
  return ctx;
}

export async function resetGuidedTour(userId: string) {
  localStorage.removeItem(lsKeyFor(userId));
  localStorage.removeItem(LS_KEY_LEGACY);
  await supabase
    .from("user_onboarding")
    .update({ tour_completed_at: null })
    .eq("user_id", userId);
}
