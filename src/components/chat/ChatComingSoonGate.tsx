import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, MessageSquare, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ALLOWED_EMAILS = ["caiowiize@gmail.com"];

interface ChatComingSoonGateProps {
  children: ReactNode;
}

export const ChatComingSoonGate = ({ children }: ChatComingSoonGateProps) => {
  const { profile, loading } = useAuth() as any;
  const navigate = useNavigate();

  if (loading) {
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

          <div className="p-8 sm:p-10 space-y-6 text-center">
            {/* Icon */}
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-2xl bg-primary/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <MessageSquare size={28} className="text-primary" strokeWidth={2} />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center ring-4 ring-card">
                <Clock size={12} className="text-white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles size={10} /> Em breve
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Chat em desenvolvimento
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Estamos finalizando o chat integrado da Wiize. Por enquanto, responda seus leads pelo sistema oficial da Meta.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 pt-2">
              <Button asChild size="lg" className="w-full gap-2 h-11">
                <a href="https://business.facebook.com/wa/manage/home" target="_blank" rel="noopener noreferrer">
                  Acessar Meta Business Suite
                  <ExternalLink size={14} />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full gap-2 h-11 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft size={14} />
                Voltar ao dashboard
              </Button>
            </div>

            {/* Footer */}
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/50">
              Você será notificado por e-mail assim que o chat estiver disponível.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
