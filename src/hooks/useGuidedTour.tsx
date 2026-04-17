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
  /** Run an action right when this step becomes active (e.g. typing simulation) */
  onEnter?: () => void | Promise<void>;
  /** Wait this many ms before marking the step "ready" (after route transitions) */
  waitMs?: number;
  /** If true, body popup overlaps the highlighted area (for sidebar spotlight) */
  popupOffset?: number;
};

interface GuidedTourContextValue {
  isActive: boolean;
  currentStepIndex: number;
  steps: TourStep[];
  start: () => void;
  next: () => void;
  prev: () => void;
  finish: () => void;
}

const LS_KEY = "wiize_tour_completed_v3";

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

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const startedRef = useRef(false);

  const steps: TourStep[] = [
    {
      id: "welcome",
      route: "/dashboard",
      title: "Bem-vindo à Wiize",
      body: "Sua operação comercial em 4 pilares: Captação, Prospecção, Atendimento e Gestão. Vamos te guiar por dentro da própria ferramenta.",
      placement: "center",
    },

    // ---- Captação ----
    {
      id: "sidebar-oportunidades-intro",
      route: "/dashboard",
      target: '[data-tour="sidebar-oportunidades"]',
      title: "Captação fica aqui",
      body: "No menu Oportunidades você acessa a Busca de leads e a Gestão de oportunidades. Vamos abrir a Busca agora.",
      placement: "right",
      sidebarSection: "oportunidades",
      waitMs: 500,
    },
    {
      id: "search-empty",
      route: "/oportunidades",
      target: '[data-tour="search-fields"]',
      title: "Captação de leads reais",
      body: "Aqui você define um nicho e uma localização. A Wiize traz empresas reais do Google Maps já organizadas para você.",
      placement: "bottom",
      waitMs: 500,
    },
    {
      id: "search-typing",
      route: "/oportunidades",
      target: '[data-tour="search-fields"]',
      title: "Preenchendo nicho e cidade",
      body: "Estamos preenchendo automaticamente como demonstração — você só precisa escrever o seu nicho e a cidade que quer prospectar.",
      placement: "bottom",
      onEnter: async () => {
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
      target: '[data-tour="search-button"]',
      title: "Prospecção em segundos",
      body: "Com um clique, a Wiize encontra dezenas de empresas qualificadas. Vamos simular o resultado a seguir — sem disparar a busca real.",
      placement: "top",
      onEnter: async () => {
        // Visual loading hint on the real button
        const btn = document.querySelector('[data-tour="search-button"]') as HTMLElement | null;
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
      id: "sidebar-gestao-intro",
      route: "/oportunidades",
      target: '[data-tour="sidebar-oportunidades"]',
      title: "Os leads chegam na Gestão",
      body: "Toda empresa captada cai em Oportunidades → Gestão. É lá que a IA analisa cada lead. Vamos abrir agora.",
      placement: "right",
      sidebarSection: "oportunidades",
      waitMs: 300,
    },
    {
      id: "management",
      route: "/oportunidades/gestao",
      title: "Gestão de oportunidades",
      body: "Cada empresa recebe um score, um diagnóstico de pontos fortes/fracos e uma probabilidade de fechamento — tudo automático.",
      placement: "center",
      injectDemoLead: true,
      waitMs: 700,
    },
    {
      id: "diagnosis",
      route: "/oportunidades/gestao",
      target: '[data-tour="lead-score-panel"]',
      title: "Diagnóstico inteligente do lead",
      body: "Abrimos um lead de exemplo. Veja o score, a quebra por dimensão (estrutura, reputação, potencial) e a probabilidade de fechamento.",
      placement: "left",
      injectDemoLead: true,
      waitMs: 400,
      onEnter: async () => {
        // 1. Open the demo lead row
        for (let i = 0; i < 30; i++) {
          const row = document.querySelector('[data-tour="lead-row-first"]') as HTMLElement | null;
          if (row) {
            row.click();
            break;
          }
          await new Promise((r) => setTimeout(r, 120));
        }
        // 2. Wait for dialog and switch to Score tab
        for (let i = 0; i < 30; i++) {
          const tab = document.querySelector('[data-tour="lead-tab-score"]') as HTMLElement | null;
          if (tab) {
            tab.click();
            await new Promise((r) => setTimeout(r, 250));
            return;
          }
          await new Promise((r) => setTimeout(r, 120));
        }
      },
    },
    {
      id: "approach-message",
      route: "/oportunidades/gestao",
      target: '[data-tour="lead-approach-section"]',
      title: "Mensagem de abordagem com IA",
      body: "Com base no diagnóstico, a Wiize gera uma mensagem personalizada pronta para enviar. Você pode copiar, editar ou disparar direto pelo WhatsApp.",
      placement: "left",
      injectDemoLead: true,
      onEnter: async () => {
        // Make sure dialog is open
        if (!document.querySelector('[role="dialog"]')) {
          const row = document.querySelector('[data-tour="lead-row-first"]') as HTMLElement | null;
          row?.click();
          await new Promise((r) => setTimeout(r, 300));
        }
        // Switch to "Dados" tab where the approach message lives
        const tab = document.querySelector('[data-tour="lead-tab-dados"]') as HTMLElement | null;
        tab?.click();
        await new Promise((r) => setTimeout(r, 250));
        // Scroll the approach section into view inside the dialog
        const section = document.querySelector('[data-tour="lead-approach-section"]') as HTMLElement | null;
        section?.scrollIntoView({ block: "center", behavior: "smooth" });
      },
    },

    // ---- Prospecção (Campanhas) ----
    {
      id: "sidebar-campanhas",
      route: "/dashboard",
      target: '[data-tour="sidebar-campanhas"]',
      title: "Prospecção — Campanhas",
      body: "Em Campanha você dispara mensagens em escala. Prospecção (Outbound) usa números próprios. Relacionamento usa a API oficial da Meta.",
      placement: "right",
      sidebarSection: "campanhas",
      waitMs: 500,
    },

    // ---- Gestão (CRM) ----
    {
      id: "sidebar-crm",
      route: "/dashboard",
      target: '[data-tour="sidebar-crm"]',
      title: "Gestão — CRM e Score",
      body: "Todo lead entra automaticamente no Pipeline. O Score mostra quem está mais quente para comprar com base em engajamento e respostas.",
      placement: "right",
      sidebarSection: "crm",
      waitMs: 400,
    },

    // ---- Atendimento ----
    {
      id: "sidebar-chat",
      route: "/dashboard",
      target: '[data-tour="sidebar-chat"]',
      title: "Atendimento — Chat unificado",
      body: "Todas as conversas em um único lugar. Responda manualmente ou deixe a IA conduzir o atendimento por você.",
      placement: "right",
      sidebarSection: "chat",
      waitMs: 400,
    },

    // ---- Automação ----
    {
      id: "sidebar-automacao",
      route: "/dashboard",
      target: '[data-tour="sidebar-automacao"]',
      title: "Automação — Fluxos e Agentes IA",
      body: "Crie fluxos automáticos ou configure um Agente de IA que conversa, qualifica e marca reuniões 24/7 — sem perder o tom da sua marca.",
      placement: "right",
      sidebarSection: "automacao",
      waitMs: 400,
    },

    {
      id: "final",
      route: "/dashboard",
      title: "Tudo pronto para escalar",
      body: "Você já conhece toda a operação Wiize. Agora é com você: capte, prospecte, atenda e feche mais negócios.",
      placement: "center",
    },
  ];

  // Auto-start on first dashboard visit
  useEffect(() => {
    if (!user || startedRef.current) return;
    if (location.pathname !== "/dashboard") return;
    if (localStorage.getItem(LS_KEY)) return;

    startedRef.current = true;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_onboarding")
        .select("tour_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.tour_completed_at) {
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
        setTimeout(() => {
          setCurrentStepIndex(0);
          setIsActive(true);
        }, 400);
      } else {
        localStorage.setItem(LS_KEY, "1");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  // Toggle body classes for sidebar force-open
  useEffect(() => {
    const step = steps[currentStepIndex];
    if (isActive && step?.forceSidebar) {
      document.body.classList.add("tour-sidebar-open");
    } else {
      document.body.classList.remove("tour-sidebar-open");
    }
    return () => {
      document.body.classList.remove("tour-sidebar-open");
    };
  }, [isActive, currentStepIndex]);

  const goToStep = useCallback(
    async (index: number) => {
      const step = steps[index];
      if (!step) return;
      // Close any open lead dialog if we're moving away from diagnosis steps
      const isDialogStep = step.id === "diagnosis" || step.id === "approach-message";
      if (!isDialogStep) {
        const openDialog = document.querySelector('[role="dialog"]');
        if (openDialog) {
          // Press Escape to close dialog cleanly
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
      // Run side-effect
      if (step.onEnter) {
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
    setCurrentStepIndex((i) => {
      const ni = Math.min(i + 1, steps.length - 1);
      goToStep(ni);
      return ni;
    });
  }, [goToStep, steps.length]);

  const prev = useCallback(() => {
    setCurrentStepIndex((i) => {
      const ni = Math.max(i - 1, 0);
      goToStep(ni);
      return ni;
    });
  }, [goToStep]);

  const persistCompletion = useCallback(async () => {
    localStorage.setItem(LS_KEY, "1");
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
    document.body.classList.remove("tour-sidebar-open");
    // Close any open lead dialog
    const openDialog = document.querySelector('[role="dialog"]');
    if (openDialog) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    persistCompletion();
  }, [persistCompletion]);

  return (
    <GuidedTourContext.Provider
      value={{ isActive, currentStepIndex, steps, start, next, prev, finish }}
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
  localStorage.removeItem(LS_KEY);
  await supabase
    .from("user_onboarding")
    .update({ tour_completed_at: null })
    .eq("user_id", userId);
}
