import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft, Zap, Clock, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

type Card = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route?: string;
  badge?: string;
  disabled?: boolean;
};

const CARDS: Card[] = [
  {
    id: "quick-replies",
    title: "Mensagens rápidas",
    description: "Crie atalhos como /preco com texto, emojis, variáveis do CRM e mídia. Digite no chat /atalho para usar.",
    icon: Zap,
    route: "/chat/configuracoes/mensagens-rapidas",
  },
  {
    id: "auto-reply",
    title: "Resposta automática",
    description: "Configure mensagens automáticas para fora do horário comercial.",
    icon: Clock,
    badge: "Em breve",
    disabled: true,
  },
  {
    id: "ai-summary",
    title: "Resumo de conversas (IA)",
    description: "Gere um resumo executivo da conversa com um clique.",
    icon: Sparkles,
    badge: "Em breve",
    disabled: true,
  },
];

export default function ChatSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, name, email, avatar_url").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <div className="lg:hidden">
            <AppHeader profile={profile} />
          </div>
          <div className="flex-1 overflow-auto">
            <div className="max-w-5xl mx-auto px-6 py-10">
              <div className="flex items-center gap-3 mb-8">
                <Button variant="ghost" size="sm" onClick={() => navigate("/chat")} className="gap-2">
                  <ArrowLeft size={16} /> Voltar ao chat
                </Button>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare size={20} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Configurações do Chat</h1>
              </div>
              <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
                Otimize o atendimento ativando funcionalidades extras como mensagens rápidas, respostas automáticas e IA.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CARDS.map(card => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.id}
                      disabled={card.disabled}
                      onClick={() => card.route && navigate(card.route)}
                      className="group text-left rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:shadow-none"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                          <Icon size={18} className="text-primary" />
                        </div>
                        {card.badge && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            {card.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1.5">{card.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
