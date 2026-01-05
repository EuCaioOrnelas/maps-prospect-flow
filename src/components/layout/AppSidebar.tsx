import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, 
  BarChart3, 
  MessageSquare, 
  Crown, 
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppSidebarProps {
  profile?: {
    plan?: string;
    name?: string | null;
    email?: string;
    avatar_url?: string | null;
  } | null;
  onWhatsAppClick?: () => void;
}

export const AppSidebar = ({ profile, onWhatsAppClick }: AppSidebarProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const isFreePlan = !profile?.plan || profile.plan === 'free';
  const currentPath = location.pathname;

  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  const mainNavItems = [
    { 
      title: "Prospecção", 
      url: "/dashboard", 
      icon: Search,
      active: currentPath === "/dashboard"
    },
    { 
      title: "Relatórios", 
      url: "/reports", 
      icon: BarChart3,
      active: currentPath === "/reports"
    },
    { 
      title: "Disparos", 
      url: isFreePlan ? "#" : "/whatsapp", 
      icon: MessageSquare,
      onClick: isFreePlan ? onWhatsAppClick : undefined,
      active: currentPath.startsWith("/whatsapp")
    },
  ];

  const bottomNavItems = [
    ...(profile?.plan !== 'scale' ? [{
      title: "Upgrade",
      url: "/upgrade",
      icon: Crown,
      highlight: true,
      active: currentPath === "/upgrade"
    }] : []),
    {
      title: "Configurações",
      url: "/profile",
      icon: Settings,
      active: currentPath === "/profile"
    },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="fixed left-0 top-0 h-screen z-40 hidden lg:flex"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Sidebar */}
        <aside
          className={cn(
            "h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden",
            "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isHovered ? "w-56" : "w-14"
          )}
        >
          {/* Logo area - aligned with header height */}
          <div className="h-[57px] flex items-center px-3 border-b border-sidebar-border">
            <Logo size="sm" showText={isHovered} />
          </div>

          {/* Main navigation */}
          <nav className="flex-1 py-4 px-2">
            <ul className="space-y-1">
              {mainNavItems.map((item, index) => (
                <li 
                  key={item.title}
                  className="transition-all duration-300"
                  style={{
                    transitionDelay: isHovered ? `${index * 50}ms` : '0ms',
                    transform: isHovered ? 'translateX(0)' : 'translateX(0)',
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {item.onClick ? (
                        <button
                          onClick={item.onClick}
                          className={cn(
                            "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200",
                            item.active 
                              ? "bg-primary/20 text-primary font-medium" 
                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <item.icon size={20} className="shrink-0" />
                          {isHovered && (
                            <span 
                              className="whitespace-nowrap animate-fade-in"
                              style={{
                                animationDelay: `${index * 50}ms`,
                              }}
                            >
                              {item.title}
                            </span>
                          )}
                        </button>
                      ) : (
                        <Link
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200",
                            item.active 
                              ? "bg-primary/20 text-primary font-medium" 
                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <item.icon size={20} className="shrink-0" />
                          {isHovered && (
                            <span 
                              className="whitespace-nowrap animate-fade-in"
                              style={{
                                animationDelay: `${index * 50}ms`,
                              }}
                            >
                              {item.title}
                            </span>
                          )}
                        </Link>
                      )}
                    </TooltipTrigger>
                    {!isHovered && (
                      <TooltipContent side="right" className="font-medium">
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
              ))}
            </ul>
          </nav>

          {/* Bottom navigation */}
          <div className="py-4 px-2 border-t border-sidebar-border">
            <ul className="space-y-1">
                {bottomNavItems.map((item, index) => (
                <li 
                  key={item.title}
                  className="transition-all duration-300"
                  style={{
                    transitionDelay: isHovered ? `${(index + mainNavItems.length) * 50}ms` : '0ms',
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200",
                          item.active 
                            ? "bg-primary/20 text-primary font-medium" 
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                          item.highlight && !item.active && "text-primary hover:text-primary"
                        )}
                      >
                        <item.icon size={20} className="shrink-0" />
                        {isHovered && (
                          <span 
                            className="whitespace-nowrap animate-fade-in"
                            style={{
                              animationDelay: `${(index + mainNavItems.length) * 50}ms`,
                            }}
                          >
                            {item.title}
                          </span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    {!isHovered && (
                      <TooltipContent side="right" className="font-medium">
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
              ))}
              
              {/* Profile */}
              <li
                className="transition-all duration-300"
                style={{
                  transitionDelay: isHovered ? `${(bottomNavItems.length + mainNavItems.length) * 50}ms` : '0ms',
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/profile"
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200",
                        currentPath === "/profile" 
                          ? "bg-primary/20 text-primary font-medium" 
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <Avatar className="h-6 w-6 shrink-0 border border-sidebar-border">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Perfil'} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      {isHovered && (
                        <span 
                          className="whitespace-nowrap truncate animate-fade-in"
                          style={{
                            animationDelay: `${(bottomNavItems.length + mainNavItems.length) * 50}ms`,
                          }}
                        >
                          {profile?.name || 'Meu Perfil'}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {!isHovered && (
                    <TooltipContent side="right" className="font-medium">
                      {profile?.name || 'Meu Perfil'}
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>

              {/* Logout */}
              <li
                className="transition-all duration-300"
                style={{
                  transitionDelay: isHovered ? `${(bottomNavItems.length + mainNavItems.length + 1) * 50}ms` : '0ms',
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleLogout}
                      className={cn(
                        "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200",
                        "text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      )}
                    >
                      <LogOut size={20} className="shrink-0" />
                      {isHovered && (
                        <span 
                          className="whitespace-nowrap animate-fade-in"
                          style={{
                            animationDelay: `${(bottomNavItems.length + mainNavItems.length + 1) * 50}ms`,
                          }}
                        >
                          Sair
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {!isHovered && (
                    <TooltipContent side="right" className="font-medium">
                      Sair
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </TooltipProvider>
  );
};
