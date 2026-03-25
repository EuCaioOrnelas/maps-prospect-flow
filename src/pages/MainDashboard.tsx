import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMainDashboard } from "@/hooks/useMainDashboard";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SEO } from "@/components/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import { DashboardImpactAccumulated } from "@/components/dashboard/DashboardImpactAccumulated";
import { DashboardEvolutionChart } from "@/components/dashboard/DashboardEvolutionChart";
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

  const hasData = data.leadsProspected > 0 || data.messagesSent > 0 || data.allTimeLeads > 0;

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
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-9 w-40" />
                </div>
                <Skeleton className="h-52" />
                <div className="grid grid-cols-2 gap-3">
                  {[1,2].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-48" />
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
        <SEO title="Visão Geral | Wiize" description="Visão geral da sua operação de prospecção e vendas" />
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <ExpiredSubscriptionDialog />
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">

              <RenewalBanner />
              <ActivationChecklistInline />

              {/* 1️⃣ Impacto Financeiro */}
              <DashboardImpactAccumulated
                allTimeLeads={data.allTimeLeads}
                cumulativeByMonth={data.cumulativeByMonth}
                periodDays={periodDays}
                leadsProspected={data.leadsProspected}
                prevLeadsProspected={data.prevLeadsProspected}
                totalResponses={data.totalResponses}
                prevTotalResponses={data.prevTotalResponses}
                periodFilter={
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[170px] h-8 text-xs">
                      <Calendar size={13} className="mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />

              {/* 2️⃣ KPIs Estratégicos */}
              <DashboardKPIs
                leadsProspected={data.leadsProspected}
                prevLeadsProspected={data.prevLeadsProspected}
                totalResponses={data.totalResponses}
                prevTotalResponses={data.prevTotalResponses}
                messagesSent={data.messagesSent}
                prevMessagesSent={data.prevMessagesSent}
                responseRate={data.responseRate}
                prevResponseRate={data.prevResponseRate}
              />

              {/* 3️⃣ Funil + Potencial */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardFunnel
                  leadsProspected={data.leadsProspected}
                  totalResponses={data.totalResponses}
                  prevLeadsProspected={data.prevLeadsProspected}
                  prevTotalResponses={data.prevTotalResponses}
                  messagesSent={data.messagesSent}
                  prevMessagesSent={data.prevMessagesSent}
                  periodDays={periodDays}
                />
                <DashboardEvolutionChart
                  monthlyData={data.monthlyBreakdown}
                />
              </div>

              {/* 4️⃣ Insights */}
              <DashboardInsights
                leadsProspected={data.leadsProspected}
                prevLeadsProspected={data.prevLeadsProspected}
                responseRate={data.responseRate}
                prevResponseRate={data.prevResponseRate}
                totalResponses={data.totalResponses}
                campaigns={data.campaigns}
                messagesSent={data.messagesSent}
                prevMessagesSent={data.prevMessagesSent}
              />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
