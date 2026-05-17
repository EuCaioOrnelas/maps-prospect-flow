import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMainDashboard } from "@/hooks/useMainDashboard";
import { useCockpitForecast } from "@/hooks/useCockpitForecast";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SEO } from "@/components/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";

import { DashboardHero } from "@/components/dashboard/v2/DashboardHero";
import { ExecutiveKPIs } from "@/components/dashboard/v2/ExecutiveKPIs";
import { OpportunityRadar } from "@/components/dashboard/v2/OpportunityRadar";
import { OperationalFunnel } from "@/components/dashboard/v2/OperationalFunnel";
import { ExecutiveAlerts } from "@/components/dashboard/v2/ExecutiveAlerts";
import { ForecastChart } from "@/components/dashboard/v2/ForecastChart";
import { QuickActions } from "@/components/dashboard/v2/QuickActions";

import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { TrialAutoChargeBanner } from "@/components/dashboard/TrialAutoChargeBanner";
import { ExpiredSubscriptionDialog } from "@/components/ExpiredSubscriptionDialog";
// Checklist e modal de onboarding removidos — somente o tour guiado orienta o usuário.
import { buildTourDemoCockpit } from "@/lib/tourDemoCockpit";

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export default function MainDashboard() {
  const { profile } = useAuth();
  useAutoScoreTracking("main_dashboard");
  const [period, setPeriod] = useState('30');
  const periodDays = parseInt(period);
  const realData = useMainDashboard(periodDays);
  const realForecast = useCockpitForecast(periodDays);
  const realKpis = useDashboardKPIs(periodDays);

  // Tour mode: when active, replace cockpit with aspirational fake data
  const [tourCockpitActive, setTourCockpitActive] = useState(
    typeof document !== "undefined" && document.body.classList.contains("tour-demo-cockpit")
  );
  useEffect(() => {
    const update = () => setTourCockpitActive(document.body.classList.contains("tour-demo-cockpit"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const demo = tourCockpitActive ? buildTourDemoCockpit() : null;

  // Effective values used by the UI (real or demo)
  const data = demo ? { ...realData, ...demo, loading: false } : realData;
  const forecast = demo
    ? {
        ...realForecast,
        totalEstimatedRevenue: demo.financialImpact,
        prevTotalEstimatedRevenue: demo.financialImpact / (1 + demo.financialChange / 100),
        totalEstimatedSales: demo.estimatedSales,
        averageTicket: demo.averageTicket,
        opportunitySales: demo.opportunitySales,
        scoreSales: demo.scoreSales,
        scoreBuckets: demo.scoreBuckets,
      }
    : realForecast;
  const kpis = demo
    ? {
        ...realKpis,
        leadsGeradosPeriodo: demo.leadsGerados,
        conversasAtivasPeriodo: demo.conversasAtivas,
        oportunidadesQuentesPeriodo: demo.oportunidadesQuentes,
        receitaPotencial: demo.receitaPotencial,
        receitaPotencialGrowth: demo.receitaPotencialGrowth,
        leadsQuentesHoje: demo.leadsQuentesHoje,
        leadsQuentesOntem: demo.leadsQuentesOntem,
        healthStatus: demo.healthStatus,
        healthDetail: demo.healthDetail,
        aiMinutesSaved: demo.aiMinutesSaved,
      }
    : realKpis;

  const financialImpact = forecast.totalEstimatedRevenue;
  const financialChange = forecast.prevTotalEstimatedRevenue > 0
    ? ((forecast.totalEstimatedRevenue - forecast.prevTotalEstimatedRevenue) / forecast.prevTotalEstimatedRevenue) * 100
    : 0;

  const firstName = profile?.name?.split(' ')[0] || 'Usuário';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  if (data.loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
          <BackgroundGlow />
          <AppSidebar profile={profile} />
          <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
            <AppHeader profile={profile} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-9 w-40" />
                </div>
                <Skeleton className="h-48 rounded-2xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
                <Skeleton className="h-64 rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Skeleton className="h-80 rounded-2xl" />
                  <Skeleton className="h-80 rounded-2xl" />
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <SEO title="Cockpit de Crescimento | Wiize" description="Dashboard executivo de prospecção, receita e performance comercial" />
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <ExpiredSubscriptionDialog />
            
            <div className="max-w-7xl mx-auto space-y-6 relative z-10">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    {greeting}, {firstName} 👋
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[170px] h-9 text-xs border-border/50">
                    <Calendar size={13} className="mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TrialAutoChargeBanner />

              {/* 1 — Hero Impact */}
              <div data-tour="cockpit-hero">
                <DashboardHero
                  financialImpact={financialImpact}
                  financialChange={financialChange}
                  leadsGerados={kpis.leadsGeradosPeriodo}
                  conversasAtivas={kpis.conversasAtivasPeriodo}
                  oportunidadesQuentes={kpis.oportunidadesQuentesPeriodo}
                  cumulativeByMonth={data.cumulativeByMonth}
                  leadsByDay={data.leadsByDay}
                  estimatedSales={forecast.totalEstimatedSales}
                  averageTicket={forecast.averageTicket}
                  opportunitySales={forecast.opportunitySales}
                  scoreSales={forecast.scoreSales}
                  periodDays={periodDays}
                />
              </div>

              {/* 2 — Executive KPIs */}
              <div data-tour="cockpit-kpis">
                <ExecutiveKPIs
                  receitaPotencial={kpis.receitaPotencial}
                  receitaPotencialGrowth={kpis.receitaPotencialGrowth}
                  leadsQuentesHoje={kpis.leadsQuentesHoje}
                  leadsQuentesOntem={kpis.leadsQuentesOntem}
                  healthStatus={kpis.healthStatus}
                  healthDetail={kpis.healthDetail}
                  aiMinutesSaved={kpis.aiMinutesSaved}
                />
              </div>

              {/* 3 — Forecast + Funnel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-tour="cockpit-forecast">
                <ForecastChart
                  leadsProspected={data.leadsProspected}
                  totalResponses={data.totalResponses}
                  messagesSent={data.messagesSent}
                  averageTicket={forecast.averageTicket}
                  opportunitySales={forecast.opportunitySales}
                  scoreSales={forecast.scoreSales}
                  scoreBuckets={forecast.scoreBuckets}
                />
                <OperationalFunnel funnel={data.funnel} />
              </div>

              {/* 4 — Opportunity Radar */}
              <OpportunityRadar radarLeads={kpis.radarLeads} />

              {/* 5 — Alerts */}
              <ExecutiveAlerts
                alerts={kpis.executiveAlerts}
              />

              {/* 7 — Quick Actions */}
              <QuickActions />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
