import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SDRWizard } from "@/components/sdr/SDRWizard";
import { Loader2 } from "lucide-react";

export default function SDRWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile } = useAuth() as any;
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("sdr_agents" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setEditing(data ?? null);
        setLoading(false);
      });
  }, [id]);

  const back = () => navigate("/oportunidades/sdr");

  return (
    <SidebarProvider>
      <SEO
        title={id ? "Editar SDR | Wiize" : "Novo SDR Inteligente | Wiize"}
        description="Configure seu agente de IA para conduzir negociações no WhatsApp."
      />
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px] h-screen">
          <AppHeader profile={profile} />
          <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-hidden">
            <div className="max-w-5xl mx-auto h-full min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <SDRWizard
                  variant="page"
                  open
                  editing={editing}
                  onClose={back}
                  onCreated={back}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
