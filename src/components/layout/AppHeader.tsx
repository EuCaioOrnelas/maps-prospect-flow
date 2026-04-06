import { Link } from "react-router-dom";
import { Search, User, Settings, LogOut } from "lucide-react";
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
          {/* Credits indicator */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <Search size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Oportunidades:</span>
            <span className="font-semibold text-primary">{profile?.searches_used || 0}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{profile?.searches_limit || 10}</span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden ml-1">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(((profile?.searches_used || 0) / (profile?.searches_limit || 10)) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground ml-1 px-2 py-0.5 bg-secondary rounded">
              {getPlanName(profile?.plan || 'free')}
            </span>
          </div>

          {/* Mobile compact credits */}
          <div className="flex sm:hidden items-center gap-1.5 text-xs bg-secondary/50 px-2 py-1 rounded-lg">
            <Search size={12} className="text-primary" />
            <span className="font-semibold text-primary">{profile?.searches_used || 0}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{profile?.searches_limit || 10}</span>
          </div>

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
