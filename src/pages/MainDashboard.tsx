import { useState } from "react";
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
import { ExecutiveAlerts } from "@/components/dashboard/v2/ExecutiveAlerts";
import { ForecastChart } from "@/components/dashboard/v2/ForecastChart";

import { QuickActions } from "@/components/dashboard/v2/QuickActions";

import { ActivationChecklistInline } from "@/components/dashboard/ActivationChecklist";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { RenewalBanner } from "@/components/dashboard/RenewalBanner";
import { ExpiredSubscriptionDialog } from "@/components/ExpiredSubscriptionDialog";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { TrialFeedbackModal } from "@/components/onboarding/TrialFeedbackModal";
import { useOnboardingModals } from "@/hooks/useOnboardingModals";

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export default function MainDashboard() {
  const { profile } = useAuth();
  useAutoScoreTracking("main_dashboard");
  const { showOnboarding, showTrialFeedback, closeOnboarding, closeTrialFeedback } = useOnboardingModals();
  const [period, setPeriod] = useState('30');
  const periodDays = parseInt(period);
  const data = useMainDashboard(periodDays);
  const forecast = useCockpitForecast(periodDays);
  const kpis = useDashboardKPIs(periodDays);

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
            <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />
            <TrialFeedbackModal isOpen={showTrialFeedback} onClose={closeTrialFeedback} />
            
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

              <RenewalBanner />
              <ActivationChecklistInline />

              {/* 1 — Hero Impact */}
              <DashboardHero
                financialImpact={financialImpact}
                financialChange={financialChange}
                leadsGerados={kpis.leadsGeradosPeriodo}
                conversasAtivas={kpis.conversasAtivasPeriodo}
                oportunidadesQuentes={kpis.oportunidadesQuentesPeriodo}
                cumulativeByMonth={data.cumulativeByMonth}
                estimatedSales={forecast.totalEstimatedSales}
                averageTicket={forecast.averageTicket}
                opportunitySales={forecast.opportunitySales}
                scoreSales={forecast.scoreSales}
                periodDays={periodDays}
              />

              {/* 2 — Executive KPIs */}
              <ExecutiveKPIs
                receitaPotencial={kpis.receitaPotencial}
                receitaPotencialGrowth={kpis.receitaPotencialGrowth}
                leadsQuentesHoje={kpis.leadsQuentesHoje}
                leadsQuentesOntem={kpis.leadsQuentesOntem}
                healthStatus={kpis.healthStatus}
                healthDetail={kpis.healthDetail}
                aiMinutesSaved={kpis.aiMinutesSaved}
              />

              {/* 3 — Forecast */}
              <ForecastChart
                leadsProspected={data.leadsProspected}
                totalResponses={data.totalResponses}
                messagesSent={data.messagesSent}
                averageTicket={forecast.averageTicket}
                opportunitySales={forecast.opportunitySales}
                scoreSales={forecast.scoreSales}
                scoreBuckets={forecast.scoreBuckets}
              />

              {/* 4 — Opportunity Radar */}
              <OpportunityRadar radarLeads={kpis.radarLeads} />

              {/* 5 — Alerts */}

              {/* 6 — Alerts */}
              <ExecutiveAlerts
                leadsProspected={data.leadsProspected}
                totalResponses={data.totalResponses}
                responseRate={data.responseRate}
                prevResponseRate={data.prevResponseRate}
                campaigns={data.campaigns}
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
