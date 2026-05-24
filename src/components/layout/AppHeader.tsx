import { Link } from "react-router-dom";
import { Search, User, Settings, LogOut, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import ThemeSwitch from "@/components/ui/theme-switch";
import { hasOpportunitiesAccess } from "@/lib/planAccess";

interface AppHeaderProps {
  profile?: {
    name?: string | null;
    email?: string;
    avatar_url?: string | null;
    plan?: string;
    searches_used?: number;
    searches_limit?: number;
    trial_start_at?: string | null;
    trial_auto_charge_cancelled?: boolean | null;
    created_at?: string | null;
  } | null;
  onWhatsAppClick?: () => void;
}

export const AppHeader = ({ profile, onWhatsAppClick }: AppHeaderProps) => {
  const { signOut, trialDaysRemaining, isTrialing } = useAuth();
  const trialCancelled = profile?.trial_auto_charge_cancelled === true;
  const isPaidPlan = !!profile?.plan && profile.plan !== 'free';
  // Para quem pagou: não é "trial grátis", e sim janela de garantia/teste pago.
  const isUrgent = isTrialing && trialDaysRemaining <= 2 && !isPaidPlan;
  const trialToneClass = isPaidPlan
    ? "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 transition-colors cursor-pointer"
    : trialCancelled
      ? "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 hover:bg-primary/15 transition-colors cursor-pointer"
      : isUrgent
        ? "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/15 border border-destructive/40 hover:bg-destructive/25 transition-colors cursor-pointer"
        : "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/15 border border-warning/30 hover:bg-warning/25 transition-colors cursor-pointer";

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'start': return 'Start';
      case 'growth': return 'Growth';
      case 'scale': return 'Scale';
      default: return 'Free';
    }
  };

  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-[57px] flex items-center px-3 sm:px-4">
        {/* Logo - visible on mobile, spacer on desktop for sidebar */}
        <div className="lg:hidden">
          <Logo size="md" mobileSize="sm" mobileInitialsOnly variant="dark" />
        </div>

        {/* Right side content */}
        <div className="flex items-center gap-4 sm:gap-6 ml-auto">
          {/* Trial countdown badge — aparece em qualquer plano enquanto durar o trial */}
          {isTrialing && (
            <Link
              to="/profile"
              className={trialToneClass}
              title={
                trialCancelled
                  ? "Sua cobrança automática já foi cancelada e o teste segue ativo até o fim do período"
                  : isUrgent
                    ? "Seu teste está acabando — clique para cancelar a ativação automática se não quiser continuar"
                    : "Você está no teste gratuito — clique para gerenciar"
              }
            >
              <Clock
                size={14}
                className={trialCancelled ? "text-primary" : isUrgent ? "text-destructive animate-pulse" : "text-warning animate-pulse"}
              />
              <span
                className={trialCancelled ? "text-xs font-semibold text-primary" : isUrgent ? "text-xs font-semibold text-destructive" : "text-xs font-semibold text-warning"}
              >
                {trialDaysRemaining <= 0
                  ? "Teste expirado"
                  : trialDaysRemaining === 1
                    ? "Vence amanhã"
                    : `${trialDaysRemaining}d restantes`}
              </span>
              <span
                className={trialCancelled ? "text-[10px] text-primary/80 hidden sm:inline" : isUrgent ? "text-[10px] text-destructive/80 hidden sm:inline" : "text-[10px] text-warning/70 hidden sm:inline"}
              >
                · {trialCancelled ? "Cobrança cancelada" : isUrgent ? "cancele se não quiser continuar" : "Teste grátis"}
              </span>
            </Link>
          )}

          {/* Credits indicator — só aparece para quem tem módulo de Oportunidades */}
          {hasOpportunitiesAccess(profile as any) && (() => {
            const baseLimit = profile?.searches_limit || 10;
            const extraPacks = ((profile as any)?.extra_opportunities_packs || 0) as number;
            const bonus = ((profile as any)?.bonus_searches || 0) as number;
            const effectiveLimit = baseLimit + extraPacks * 1000 + bonus;
            const used = profile?.searches_used || 0;
            return (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <Search size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Oportunidades:</span>
                  <span className="font-semibold text-primary">{used.toLocaleString('pt-BR')}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground" title={extraPacks > 0 || bonus > 0 ? `${baseLimit.toLocaleString('pt-BR')} plano${extraPacks > 0 ? ` + ${(extraPacks*1000).toLocaleString('pt-BR')} expansão` : ''}${bonus > 0 ? ` + ${bonus.toLocaleString('pt-BR')} bônus` : ''}` : undefined}>
                    {effectiveLimit.toLocaleString('pt-BR')}
                  </span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden ml-1">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min((used / Math.max(effectiveLimit, 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground ml-1 px-2 py-0.5 bg-secondary rounded">
                    {getPlanName(profile?.plan || 'free')}
                  </span>
                </div>

                {/* Mobile compact credits */}
                <div className="flex sm:hidden items-center gap-1.5 text-xs bg-secondary/50 px-2 py-1 rounded-lg">
                  <Search size={12} className="text-primary" />
                  <span className="font-semibold text-primary">{used.toLocaleString('pt-BR')}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">{effectiveLimit.toLocaleString('pt-BR')}</span>
                </div>
              </>
            );
          })()}

          {/* Theme toggle - between credits and avatar */}
          <ThemeSwitch />

          {/* Desktop Avatar dropdown */}
          <div className="hidden lg:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-9 w-9 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Perfil'} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg z-50">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/profile" className="flex items-center gap-2">
                    <User size={16} />
                    Ver perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/profile" className="flex items-center gap-2">
                    <Settings size={16} />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut size={16} className="mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile: Avatar + Hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-8 w-8 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Perfil'} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg z-50">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/profile" className="flex items-center gap-2">
                    <User size={16} />
                    Ver perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/profile" className="flex items-center gap-2">
                    <Settings size={16} />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut size={16} className="mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hamburger menu */}
            <MobileNav profile={profile} onWhatsAppClick={onWhatsAppClick} />
          </div>
        </div>
      </div>
    </header>
  );
};
