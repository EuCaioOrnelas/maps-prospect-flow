import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { hasOpportunitiesAccess, hasAIAgentsAccess, planHasFeature } from "@/lib/planAccess";
import { TOUR_CONTENT } from "@/lib/tourContent";
import { uninstallPublicDemoNetworkGuard } from "@/lib/publicDemo";

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
  /** Open ONLY this submenu in the sidebar. Implies forceSidebar. */
  sidebarSection?: "oportunidades" | "campanhas" | "meta" | "crm" | "automacao" | "chat" | "dashboard";
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
  /** True when the user manually restarted the tour (Perfil → refazer tutorial) */
  isReplay: boolean;
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

/** Scrolls the window AND the public-demo scroll container back to the top. */
export function scrollTourViewportTop() {
  if (typeof window === "undefined") return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {}
  document.querySelectorAll<HTMLElement>("[data-tour-scroll-root]").forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
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
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isReplay, setIsReplay] = useState(false);
  const startedRef = useRef(false);
  const pendingTourPathRef = useRef<string | null>(null);
  const publicDemoSessionRef = useRef(false);
  const [onboardingTick, setOnboardingTick] = useState(0);
  const isPublicDemo = location.pathname === "/tour-guiado";

  // Re-check tour eligibility when onboarding modal closes
  useEffect(() => {
    const handler = () => setOnboardingTick((t) => t + 1);
    window.addEventListener("wiize:onboarding-done", handler);
    return () => window.removeEventListener("wiize:onboarding-done", handler);
  }, []);


  // Comportamento (rota, seletor, animações) de cada passo do tour interno.
  // O CONTEÚDO (título, texto, ordem) vem de `src/lib/tourContent.ts`,
  // compartilhado com o tour público em /tour-guiado.
  type StepBehavior = Omit<TourStep, "id" | "title" | "body">;

  const BEHAVIOR: Record<string, StepBehavior> = {
    welcome: { route: "/dashboard", injectDemoCockpit: true },

    // ---- Cockpit ----
    "cockpit-overview": {
      route: "/dashboard",
      target: '[data-tour="cockpit-hero"]',
      injectDemoCockpit: true,
      waitMs: 600,
    },
    "cockpit-kpis": {
      route: "/dashboard",
      target: '[data-tour="cockpit-kpis"]',
      injectDemoCockpit: true,
      waitMs: 400,
    },
    "cockpit-forecast": {
      route: "/dashboard",
      target: '[data-tour="cockpit-forecast"]',
      injectDemoCockpit: true,
      waitMs: 400,
    },

    // ---- Captação ----
    "sidebar-oportunidades-intro": {
      route: "/dashboard",
      target: '[data-tour="sidebar-oportunidades"]',
      sidebarSection: "oportunidades",
      waitMs: 700,
    },
    "sidebar-oportunidades-buscar": {
      route: "/dashboard",
      target: '[data-tour="sidebar-oportunidades-buscar"]',
      sidebarSection: "oportunidades",
      waitMs: 700,
    },
    "search-empty": {
      route: "/oportunidades",
      target: '#keyword || [data-tour="search-keyword"]',
      waitMs: 1100,
      keepViewportTop: true,
      hideSpotlightWhileTargetLoads: "always",
      onEnter: async () => {
        await waitForElement("#keyword", 40, 100);
        clearInput("#keyword");
        clearInput("#location");
        await simulateTyping("#keyword", "Clínicas de estética", 45);
      },
    },
    "search-typing": {
      route: "/oportunidades",
      target: '#location || [data-tour="search-location"]',
      waitMs: 500,
      keepViewportTop: true,
      hideSpotlightWhileTargetLoads: "always",
      onEnter: async () => {
        const keyword = await waitForElement<HTMLInputElement>("#keyword", 40, 100);
        if (keyword && !keyword.value) {
          await simulateTyping("#keyword", "Clínicas de estética", 30);
        }
        clearInput("#location");
        await simulateTyping("#location", "São Paulo, SP", 45);
      },
    },
    "search-button": {
      route: "/oportunidades",
      target: '[data-tour="search-button"] || button[type="submit"]',
      waitMs: 500,
      keepViewportTop: true,
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
    "sidebar-oportunidades-gestao": {
      route: "/oportunidades",
      target: '[data-tour="sidebar-oportunidades-gestao"]',
      sidebarSection: "oportunidades",
      waitMs: 700,
    },
    management: {
      route: "/oportunidades/gestao",
      injectDemoLead: true,
      waitMs: 700,
    },
    diagnosis: {
      route: "/oportunidades/gestao",
      target: '[data-tour="lead-score-summary"]',
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
    "approach-message": {
      route: "/oportunidades/gestao",
      target: '[data-tour="lead-approach-card"]',
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

    // ---- SDR Inteligente ----
    "sidebar-oportunidades-sdr": {
      route: "/dashboard",
      target: '[data-tour="sidebar-oportunidades-sdr"]',
      sidebarSection: "oportunidades",
      waitMs: 700,
    },

    // ---- Agenda ----
    "sidebar-agenda": {
      route: "/dashboard",
      target: '[data-tour="sidebar-agenda"]',
      forceSidebar: true,
      waitMs: 700,
    },

    // ---- Meta (API Oficial) ----
    "sidebar-meta-intro": {
      route: "/dashboard",
      target: '[data-tour="sidebar-meta"]',
      sidebarSection: "meta",
      waitMs: 700,
    },
    "sidebar-meta-campanhas": {
      route: "/dashboard",
      target: '[data-tour="sidebar-meta-campanhas"]',
      sidebarSection: "meta",
      waitMs: 500,
    },
    "sidebar-meta-numeros": {
      route: "/dashboard",
      target: '[data-tour="sidebar-meta-numeros"]',
      sidebarSection: "meta",
      waitMs: 500,
    },

    // ---- Atendimento ----
    "sidebar-chat": {
      route: "/dashboard",
      target: '[data-tour="sidebar-chat"]',
      sidebarSection: "chat",
      waitMs: 600,
    },

    // ---- Automação ----
    "sidebar-automacao-intro": {
      route: "/dashboard",
      target: '[data-tour="sidebar-automacao"]',
      sidebarSection: "automacao",
      waitMs: 700,
    },
    "sidebar-automacao-fluxos": {
      route: "/dashboard",
      target: '[data-tour="sidebar-automacao-fluxos"]',
      sidebarSection: "automacao",
      waitMs: 600,
    },

    // ---- Gestão (CRM) ----
    "sidebar-crm-intro": {
      route: "/dashboard",
      target: '[data-tour="sidebar-crm"]',
      sidebarSection: "crm",
      waitMs: 700,
    },
    "sidebar-crm-pipeline": {
      route: "/dashboard",
      target: '[data-tour="sidebar-crm-pipeline"]',
      sidebarSection: "crm",
      waitMs: 700,
    },
    "sidebar-crm-score": {
      route: "/dashboard",
      target: '[data-tour="sidebar-crm-score"]',
      sidebarSection: "crm",
      waitMs: 500,
    },

    final: { route: "/dashboard" },
  };

  const allSteps: TourStep[] = TOUR_CONTENT.map((content) => ({
    id: content.id,
    title: content.title,
    body: content.body,
    placement: content.placement,
    ...(BEHAVIOR[content.id] ?? {}),
  }));


  // Filter steps based on plan capabilities. New "start" (Atendimento) users
  // don't have Oportunidades, Agentes IA or Aquecimento — skip those steps so
  // the tour doesn't redirect to /upgrade mid-walkthrough.
  const steps = useMemo<TourStep[]>(() => {
    if (isPublicDemo) return allSteps;
    const skipOpps = !hasOpportunitiesAccess(profile as any);
    const skipAgents = !hasAIAgentsAccess(profile as any);
    const skipWarming = true;
    // Atendimento (novo "start") não tem Cockpit/Dashboard com as métricas
    // de receita/funil — pulamos esses passos para evitar tela vazia.
    const skipCockpit = skipOpps;

    const OPP_IDS = new Set([
      "sidebar-oportunidades-intro",
      "sidebar-oportunidades-buscar",
      "search-empty",
      "search-typing",
      "search-button",
      "sidebar-oportunidades-gestao",
      "management",
      "diagnosis",
      "approach-message",
      "sidebar-oportunidades-sdr",
    ]);
    const COCKPIT_IDS = new Set(["cockpit-overview", "cockpit-kpis", "cockpit-forecast"]);

    return allSteps.filter((s) => {
      if (skipOpps && OPP_IDS.has(s.id)) return false;
      if (skipCockpit && COCKPIT_IDS.has(s.id)) return false;
      if (skipAgents && s.id === "sidebar-automacao-agentes") return false;
      if (skipWarming && s.id === "sidebar-automacao-aquecimento") return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.plan, profile?.created_at, isPublicDemo]);

  useEffect(() => {
    if (!isPublicDemo || startedRef.current) return;
    publicDemoSessionRef.current = true;
    document.body.classList.add("public-demo-mode");
    document.body.classList.add("tour-demo-cockpit");
    let cancelled = false;
    (async () => {
      // Wait until the real cockpit is mounted (and give it a frame to paint)
      // so the welcome card never appears over a blank white screen.
      await waitForElement('[data-tour="cockpit-hero"]', 70, 100);
      await new Promise((r) => setTimeout(r, 450));
      if (cancelled) return;
      scrollTourViewportTop();
      // Mark as started only when the tour actually opens — otherwise a
      // cancelled first run (StrictMode / remount) would block it forever.
      startedRef.current = true;
      setCurrentStepIndex(0);
      setIsActive(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPublicDemo]);

  // A route change initiated outside the tour (browser Back/Forward, redirects
  // after login/payment, links, etc.) must tear the tour down completely. Tour
  // navigation is valid only when the URL matches the active step's route.
  useEffect(() => {
    if (!isActive) return;
    const activeStep = steps[currentStepIndex];
    const expectedPath = isPublicDemo ? "/tour-guiado" : activeStep?.route;
    if (pendingTourPathRef.current === location.pathname) {
      pendingTourPathRef.current = null;
      return;
    }
    if (!expectedPath || location.pathname === expectedPath) return;

    setIsActive(false);
    const sections = ["oportunidades", "campanhas", "meta", "crm", "automacao", "chat", "dashboard"];
    sections.forEach((section) => document.body.classList.remove(`tour-open-${section}`));
    document.body.classList.remove(
      "tour-active",
      "tour-sidebar-open",
      "tour-demo-lead",
      "tour-demo-cockpit",
      "public-demo-mode"
    );
    if (publicDemoSessionRef.current) {
      uninstallPublicDemoNetworkGuard();
      publicDemoSessionRef.current = false;
    }
  }, [isActive, currentStepIndex, steps, isPublicDemo, location.pathname]);


  // Auto-start on first dashboard visit.
  // Depend on user?.id (stable) instead of the whole user object (re-created on
  // every auth refresh, which was canceling the async start before it fired).
  const userId = user?.id;
  useEffect(() => {
    if (isPublicDemo || !userId || startedRef.current) return;
    // Sub usuários (parent_owner_id) usam a conta do owner — nunca disparar o tour.
    if ((profile as any)?.parent_owner_id) {
      startedRef.current = true;
      return;
    }
    // Se o usuário ainda precisa redefinir a senha (account_members), espera o fluxo
    // de senha terminar antes de iniciar o guia para evitar conflito visual.
    if ((profile as any)?.must_change_password) return;
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
      // Aguarda o onboarding (modal inicial) terminar antes de iniciar o tour,
      // senão o guia aparece por cima do onboarding em novos usuários.
      const { data: ob } = await supabase
        .from("user_onboarding")
        .select("tour_completed_at, completed_at, skipped")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      const onboardingDone = !!ob && (!!ob.completed_at || ob.skipped === true);
      if (!onboardingDone) {
        // não marca startedRef — vai re-tentar quando o usuário concluir o onboarding
        // (esse efeito roda novamente em mudanças de rota / userId)
        return;
      }
      if (ob?.tour_completed_at) {
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

      window.setTimeout(() => {
        if (cancelled || window.location.pathname !== "/dashboard") return;
        setCurrentStepIndex(0);
        setIsActive(true);
      }, 300);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, location.pathname, onboardingTick, isPublicDemo]);

  useEffect(() => {
    const step = steps[currentStepIndex];
    const sections = ["oportunidades", "campanhas", "meta", "crm", "automacao", "chat", "dashboard"];

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
    // Sempre injeta os dados aspiracionais do cockpit enquanto o tour roda em
    // qualquer step que fique na /dashboard — assim o fundo do guide nunca
    // aparece vazio (especialmente para Atendimento, que pula os passos do
    // cockpit). Steps que explicitamente desativam isso continuam funcionando.
    if (step.injectDemoCockpit || (step.route === "/dashboard" && step.injectDemoCockpit !== false as any)) {
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
      const sections = ["oportunidades", "campanhas", "meta", "crm", "automacao", "chat", "dashboard"];
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

      // Always start each step from the top of the page so the highlighted
      // card is never hidden below a leftover scroll position.
      const isDialogAnchoredStep = step.id === "diagnosis" || step.id === "approach-message";
      if (!isDialogAnchoredStep) scrollTourViewportTop();

      // Navigate first
      const targetRoute = isPublicDemo ? "/tour-guiado" : step.route;
      if (targetRoute && location.pathname !== targetRoute) {
        pendingTourPathRef.current = targetRoute;
        navigate(targetRoute);
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
        scrollTourViewportTop();
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
    [navigate, location.pathname, steps, isPublicDemo]
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
    setIsReplay(true);
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
    if (isPublicDemo) return;
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
  }, [user, isPublicDemo]);

  const finish = useCallback(() => {
    setIsActive(false);
    pendingTourPathRef.current = null;
    const sections = ["oportunidades", "campanhas", "meta", "crm", "automacao", "chat", "dashboard"];
    sections.forEach((s) => document.body.classList.remove(`tour-open-${s}`));
    document.body.classList.remove(
      "tour-active",
      "tour-sidebar-open",
      "tour-demo-lead",
      "tour-demo-cockpit",
      "public-demo-mode"
    );
    if (publicDemoSessionRef.current) {
      uninstallPublicDemoNetworkGuard();
      publicDemoSessionRef.current = false;
    }
    const openDialog = document.querySelector('[role="dialog"]');
    if (openDialog) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    persistCompletion();
  }, [persistCompletion]);

  return (
    <GuidedTourContext.Provider
      value={{ isActive, currentStepIndex, steps, direction, isReplay, start, next, prev, finish }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
}

const NOOP_TOUR_CTX: GuidedTourContextValue = {
  isActive: false,
  currentStepIndex: 0,
  steps: [],
  direction: "next",
  isReplay: false,
  start: () => {
    if (typeof console !== "undefined") {
      console.warn("[useGuidedTour] start() called outside GuidedTourProvider — no-op");
    }
  },
  next: () => {},
  prev: () => {},
  finish: () => {},
};

export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) {
    if (typeof console !== "undefined") {
      console.warn("[useGuidedTour] Used outside GuidedTourProvider — returning no-op context");
    }
    return NOOP_TOUR_CTX;
  }
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
