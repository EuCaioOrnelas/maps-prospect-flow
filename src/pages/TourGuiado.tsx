import { SEO } from "@/components/SEO";
import MainDashboard from "@/pages/MainDashboard";
import Dashboard from "@/pages/Dashboard";
import OpportunitiesManagement from "@/pages/OpportunitiesManagement";
import { useGuidedTour } from "@/hooks/useGuidedTour";

export default function TourGuiado() {
  const { currentStepIndex, steps } = useGuidedTour();
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

      <div className="fixed inset-0 overflow-auto bg-background">{screen}</div>
    </>
  );
}
