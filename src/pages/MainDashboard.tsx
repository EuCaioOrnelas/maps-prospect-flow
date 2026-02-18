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
import { Calendar, LayoutDashboard } from "lucide-react";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel";
import { DashboardMediaEquivalence } from "@/components/dashboard/DashboardMediaEquivalence";
import { DashboardCampaignPerformance } from "@/components/dashboard/DashboardCampaignPerformance";
import { DashboardOperationalHealth } from "@/components/dashboard/DashboardOperationalHealth";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export default function MainDashboard() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState('30');
  const periodDays = parseInt(period);
  const data = useMainDashboard(periodDays);

  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || '';

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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
                </div>
                <Skeleton className="h-72" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Skeleton className="h-80" />
                  <Skeleton className="h-80" />
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const messagesDelivered = data.messagesSent; // delivered = sent (failed already excluded from sent_count)
  const prevMessagesDelivered = data.prevMessagesSent;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <SEO title="Dashboard | Wiize" description="Visão geral da sua operação de prospecção e vendas" />
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Visão geral da sua operação</p>
                  </div>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <Calendar size={16} className="mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* KPIs */}
              <DashboardKPIs
                leadsProspected={data.leadsProspected}
                prevLeadsProspected={data.prevLeadsProspected}
                messagesSent={data.messagesSent}
                prevMessagesSent={data.prevMessagesSent}
                deliverabilityRate={data.deliverabilityRate}
                prevDeliverabilityRate={data.prevDeliverabilityRate}
                responseRate={data.responseRate}
                prevResponseRate={data.prevResponseRate}
              />

              {/* Funnel + Media Equivalence */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                  <DashboardFunnel
                    leadsProspected={data.leadsProspected}
                    messagesSent={data.messagesSent + data.messagesFailed}
                    messagesDelivered={data.messagesSent}
                    totalResponses={data.totalResponses}
                    prevLeadsProspected={data.prevLeadsProspected}
                    prevMessagesSent={data.prevMessagesSent + data.prevMessagesFailed}
                    prevMessagesDelivered={data.prevMessagesSent}
                    prevTotalResponses={data.prevTotalResponses}
                  />
                </div>
                <div className="lg:col-span-2">
                  <DashboardMediaEquivalence
                    leadsProspected={data.leadsProspected}
                    cplBenchmark={data.cplBenchmark}
                    periodLabel={periodLabel}
                  />
                </div>
              </div>

              {/* Campaign Performance */}
              <DashboardCampaignPerformance
                campaigns={data.campaigns}
                responsesByDay={data.responsesByDay}
              />

              {/* Operational Health + Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardOperationalHealth
                  numbers={data.numbers}
                  warmingSessions={data.warmingSessions}
                  incidents={data.incidents}
                />
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
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
