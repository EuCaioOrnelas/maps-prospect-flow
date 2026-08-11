import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { AppointmentEmailSettingsPanel } from "@/components/crm/AppointmentEmailSettingsPanel";

export default function AgendaEmailSettings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: sidebarProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <SEO
        title="Lembretes de compromissos | Agenda Wiize"
        description="Configure os e-mails automáticos de lembrete dos compromissos da sua Agenda comercial."
      />
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="flex flex-col h-screen">
          <div className="flex-shrink-0 border-b border-border/50">
            <div className="px-3 pt-2 pb-3 sm:p-4 lg:p-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Lembretes de compromissos</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    E-mails automáticos enviados antes de cada compromisso da Agenda
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/agenda")}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            <AppointmentEmailSettingsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
