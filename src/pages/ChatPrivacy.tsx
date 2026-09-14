import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft, EyeOff, Image, MessageSquare, User, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useChatPrivacy, type ChatPrivacySettings } from "@/hooks/useChatPrivacy";

type Option = {
  key: keyof ChatPrivacySettings;
  title: string;
  description: string;
  icon: LucideIcon;
};

const OPTIONS: Option[] = [
  {
    key: "avatar",
    title: "Foto do contato",
    description: "Desfoca as fotos de perfil na lista de conversas.",
    icon: Image,
  },
  {
    key: "name",
    title: "Nome do contato",
    description: "Desfoca o nome e o telefone exibidos na lista de conversas.",
    icon: User,
  },
  {
    key: "preview",
    title: "Prévia da mensagem",
    description: "Desfoca o trecho da última mensagem na lista de conversas.",
    icon: MessageSquare,
  },
  {
    key: "messages",
    title: "Mensagens da conversa",
    description: "Desfoca o conteúdo das mensagens dentro da conversa aberta.",
    icon: EyeOff,
  },
];

export default function ChatPrivacy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const { settings, set, setAll, anyEnabled } = useChatPrivacy();

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
            <div className="max-w-3xl mx-auto px-6 py-10">
              <div className="flex items-center gap-3 mb-8">
                <Button variant="ghost" size="sm" onClick={() => navigate("/chat/configuracoes")} className="gap-2">
                  <ArrowLeft size={16} /> Configurações do chat
                </Button>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <EyeOff size={20} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Privacidade na tela</h1>
              </div>
              <p className="text-sm text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                Proteja a conversa de olhares por perto. Os itens escolhidos ficam desfocados e voltam ao normal
                assim que você passa o mouse. A preferência fica salva neste dispositivo.
              </p>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Modo discreto</p>
                    <p className="text-xs text-muted-foreground">Ativa ou desativa todos os desfoques de uma vez.</p>
                  </div>
                  <Switch checked={anyEnabled} onCheckedChange={(v) => setAll(v)} />
                </div>

                <div className="divide-y divide-border">
                  {OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = settings[opt.key];
                    return (
                      <div key={opt.key} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            active ? "bg-primary/10" : "bg-muted"
                          )}>
                            <Icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                          </div>
                        </div>
                        <Switch checked={active} onCheckedChange={(v) => set(opt.key, v)} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O desfoque é apenas visual: ele não altera as mensagens nem a forma como elas são guardadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
