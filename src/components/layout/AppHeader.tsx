import { Link } from "react-router-dom";
import { Search, Clock, AlertCircle, User, Settings, LogOut } from "lucide-react";
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

interface AppHeaderProps {
  profile?: {
    name?: string | null;
    email?: string;
    avatar_url?: string | null;
    plan?: string;
    searches_used?: number;
    searches_limit?: number;
    trial_start_at?: string | null;
  } | null;
  onWhatsAppClick?: () => void;
}

export const AppHeader = ({ profile, onWhatsAppClick }: AppHeaderProps) => {
  const { signOut } = useAuth();

  const isFreePlan = !profile?.plan || profile.plan === 'free';

  // Calculate trial days
  const getTrialDaysRemaining = () => {
    if (!profile?.trial_start_at || !isFreePlan) return 0;
    const trialStart = new Date(profile.trial_start_at);
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 14);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  const trialDaysRemaining = getTrialDaysRemaining();
  const showTrialIndicator = isFreePlan && profile?.trial_start_at && trialDaysRemaining > 0;
  const isTrialExpired = isFreePlan && profile?.trial_start_at && trialDaysRemaining <= 0;

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
      <div className="container mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo - visible on mobile, hidden on desktop (sidebar has it) */}
          <div className="lg:hidden">
            <Logo size="md" mobileSize="sm" mobileInitialsOnly />
          </div>
          
          {/* Spacer for desktop */}
          <div className="hidden lg:block lg:pl-14" />

          {/* Desktop: Trial + Credits + Avatar */}
          <div className="hidden lg:flex items-center gap-4 sm:gap-6 ml-auto">
            {/* Trial indicator */}
            {showTrialIndicator && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                trialDaysRemaining <= 3 
                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                  : trialDaysRemaining <= 7 
                    ? 'bg-warning/10 text-warning border border-warning/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
              }`}>
                <Clock size={14} />
                <span>
                  {trialDaysRemaining === 1 
                    ? 'Último dia de trial' 
                    : `${trialDaysRemaining} dias restantes`}
                </span>
              </div>
            )}
            
            {/* Trial expired indicator */}
            {isTrialExpired && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle size={14} />
                <span>Trial expirado</span>
              </div>
            )}

            {/* Credits indicator */}
            <div className="flex items-center gap-2 text-sm">
              <Search size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Buscas:</span>
              <span className="font-semibold text-primary">{profile?.searches_used || 0}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{profile?.searches_limit || 10}</span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden ml-1">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${((profile?.searches_used || 0) / (profile?.searches_limit || 10)) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground ml-1 px-2 py-0.5 bg-secondary rounded">
                {getPlanName(profile?.plan || 'free')}
              </span>
            </div>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border border-border hover:border-primary/50 transition-colors cursor-pointer">
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

          {/* Mobile: Credits + Avatar + Hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Compact credits indicator */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm bg-secondary/50 px-2 py-1 rounded-lg">
              <Search size={12} className="text-primary" />
              <span className="font-semibold text-primary">{profile?.searches_used || 0}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{profile?.searches_limit || 10}</span>
            </div>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border hover:border-primary/50 transition-colors cursor-pointer">
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
