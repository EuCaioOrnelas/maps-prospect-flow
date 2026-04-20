import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, MessageSquare, Loader2, Sparkles, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const ALLOWED_EMAILS = ["caiowiize@gmail.com"];

interface ChatComingSoonGateProps {
  children: ReactNode;
}

export const ChatComingSoonGate = ({ children }: ChatComingSoonGateProps) => {
  const { profile, user, loading } = useAuth() as any;
  const navigate = useNavigate();

  // Aguarda auth E profile (profile é carregado em setTimeout após loading=false)
  if (loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const email = (profile?.email || "").toLowerCase().trim();
  const isAllowed = ALLOWED_EMAILS.includes(email);

  if (isAllowed) return <>{children}</>;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar profile={profile} />
        <main className="flex-1 flex flex-col min-w-0 lg:pl-[72px] relative">
          {/* Decorative background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl" />
          </div>

          {/* Page header */}
          <header className="relative border-b border-border bg-background/60 backdrop-blur-sm">
            <div className="px-6 sm:px-10 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground">Chat</h1>
                <p className="text-xs text-muted-foreground">Conversas integradas WhatsApp Business</p>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="relative flex-1 flex items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-2xl">
              <div className="grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-start">
                {/* Visual */}
                <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 items-center justify-center shrink-0">
                  <div className="relative">
                    <MessageSquare size={36} className="text-primary" strokeWidth={1.75} />
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center ring-4 ring-background">
                      <Clock size={11} className="text-white" strokeWidth={2.75} />
                    </div>
                  </div>
                </div>

                {/* Text & actions */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
                      <Sparkles size={10} /> Em breve
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                      Chat integrado em desenvolvimento
                    </h2>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Estamos finalizando o módulo de chat da Wiize para você responder seus leads sem sair da plataforma. Enquanto isso, atenda seus contatos diretamente pelo sistema oficial da Meta.
                    </p>
                  </div>

                  {/* Feature list */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <FeatureItem text="Respostas em tempo real" />
                    <FeatureItem text="Histórico unificado por contato" />
                    <FeatureItem text="Atribuição de conversas ao time" />
                    <FeatureItem text="Integração com CRM e tags" />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button asChild size="lg" className="gap-2">
                      <a href="https://business.facebook.com/wa/manage/home" target="_blank" rel="noopener noreferrer">
                        Acessar Meta Business Suite
                        <ExternalLink size={14} />
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate("/dashboard")}>
                      Voltar ao dashboard
                    </Button>
                  </div>

                  {/* Notify */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
                    <Bell size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Você será notificado por e-mail assim que o chat integrado estiver disponível.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

const FeatureItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 text-sm text-foreground/80">
    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
    {text}
  </div>
);
