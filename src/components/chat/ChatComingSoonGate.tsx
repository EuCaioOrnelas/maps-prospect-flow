import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, MessageSquare, Loader2 } from "lucide-react";

const ALLOWED_EMAILS = ["caiowiize@gmail.com"];

interface ChatComingSoonGateProps {
  children: ReactNode;
}

/**
 * Gates the chat module behind a "coming soon" screen for everyone except
 * allow-listed emails (e.g., the founder for QA).
 */
export const ChatComingSoonGate = ({ children }: ChatComingSoonGateProps) => {
  const { profile, loading } = useAuth() as any;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const email = (profile?.email || "").toLowerCase().trim();
  const isAllowed = ALLOWED_EMAILS.includes(email);

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-lg w-full glass rounded-2xl p-8 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <MessageSquare size={32} className="text-primary" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <Clock size={12} /> Em breve
          </div>
          <h1 className="text-2xl font-bold">Chat em desenvolvimento</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            O módulo de chat integrado está em desenvolvimento. Por enquanto, você pode usar o sistema oficial da Meta
            para responder leads diretamente do WhatsApp Business.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild size="lg" className="gap-2">
            <a href="https://business.facebook.com/wa/manage/home" target="_blank" rel="noopener noreferrer">
              Acessar Meta Business Suite
              <ExternalLink size={14} />
            </a>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <a href="/dashboard">Voltar ao dashboard</a>
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground pt-2">
          Avisaremos por e-mail assim que o chat integrado estiver pronto.
        </p>
      </div>
    </div>
  );
};
