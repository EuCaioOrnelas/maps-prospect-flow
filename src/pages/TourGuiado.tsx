import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import MainDashboard from "@/pages/MainDashboard";
import Dashboard from "@/pages/Dashboard";
import OpportunitiesManagement from "@/pages/OpportunitiesManagement";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { installPublicDemoNetworkGuard } from "@/lib/publicDemo";
import { useTheme } from "@/contexts/ThemeContext";

export default function TourGuiado() {
  const { currentStepIndex, steps } = useGuidedTour();
  const { setTheme } = useTheme();

  // Hard network isolation: nothing leaves the browser during the public demo.
  useEffect(() => installPublicDemoNetworkGuard(), []);

  // Public demo always renders in the light (white) theme.
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const route = steps[currentStepIndex]?.route;
  const screen = route === "/oportunidades"
    ? <Dashboard />
    : route === "/oportunidades/gestao"
      ? <OpportunitiesManagement />
      : <MainDashboard />;

  return (
    <>
      <SEO
        title="Tour guiado da Wiize | Veja a plataforma por dentro"
        description="Percorra o mesmo tour guiado que os clientes veem ao entrar na Wiize: cockpit, prospecção com IA, SDR Inteligente, agenda, WhatsApp oficial, CRM e automações."
      />

      <div data-tour-scroll-root className="fixed inset-0 overflow-auto bg-background">{screen}</div>

      <PublicDemoCloseButton />

    </>
  );
}
