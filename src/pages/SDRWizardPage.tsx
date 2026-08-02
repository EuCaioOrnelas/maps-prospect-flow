import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { SDRWizard } from "@/components/sdr/SDRWizard";
import { Bot } from "lucide-react";

export default function SDRWizardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
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
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bot className="text-primary" size={22} />
                </span>
                <div>
                  <h1 className="font-display text-2xl font-bold">
                    {id ? "Editar SDR" : "Criar novo SDR Inteligente"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Configure o cérebro do seu agente em poucas etapas.
                  </p>
                </div>
              </div>

              <Card className="p-5 sm:p-7">
                {loading ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>
                ) : (
                  <SDRWizard
                    variant="page"
                    open
                    editing={editing}
                    onClose={back}
                    onCreated={back}
                  />
                )}
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
