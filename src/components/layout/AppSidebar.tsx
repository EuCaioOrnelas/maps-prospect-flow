import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, 
  BarChart3, 
  MessageSquare, 
  Crown, 
  Settings,
  LogOut,
  ChevronDown,
  FileSearch,
  Send,
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
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const isFreePlan = !profile?.plan || profile.plan === 'free';
  const currentPath = location.pathname;

  // Keep reports submenu open if on a reports page
  const isOnReportsPage = currentPath === "/reports" || currentPath === "/whatsapp/reports";

  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  const reportsSubItems = [
    {
      title: "Relatórios de Buscas",
      url: "/reports",
      icon: FileSearch,
      active: currentPath === "/reports"
    },
    {
      title: "Relatórios de Disparos",
      url: "/whatsapp/reports",
      icon: Send,
      active: currentPath === "/whatsapp/reports"
    },
  ];

  const mainNavItems = [
    { 
      title: "Prospecção", 
      url: "/dashboard", 
      icon: Search,
      active: currentPath === "/dashboard"
    },
    { 
      title: "Disparos", 
      url: isFreePlan ? "#" : "/whatsapp", 
      icon: MessageSquare,
      onClick: isFreePlan ? onWhatsAppClick : undefined,
      active: currentPath === "/whatsapp"
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

  const handleReportsClick = () => {
    if (isHovered) {
      setIsReportsOpen(!isReportsOpen);
    }
  };

  // Reset reports submenu when sidebar closes
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isOnReportsPage) {
      setIsReportsOpen(false);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="fixed left-0 top-0 h-screen z-40 hidden lg:flex"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Sidebar */}
        <aside
          className={cn(
            "h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden",
            "transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            isHovered ? "w-56" : "w-14"
          )}
        >
          {/* Logo area - aligned with header height */}
          <div className="h-[57px] flex items-center px-3 border-b border-sidebar-border">
            <Logo size="sm" showText={isHovered} />
          </div>

          {/* Main navigation */}
          <nav className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden">
            <ul className="space-y-1">
              {/* Prospecção */}
              <li className="transition-all duration-500 ease-out">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={mainNavItems[0].url}
                      className={cn(
                        "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-300",
                        mainNavItems[0].active 
                          ? "bg-primary/20 text-primary font-medium" 
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <Search size={20} className="shrink-0 transition-transform duration-300" />
                      {isHovered && (
                        <span className="whitespace-nowrap animate-fade-in">
                          {mainNavItems[0].title}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {!isHovered && (
                    <TooltipContent side="right" className="font-medium">
                      {mainNavItems[0].title}
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>

              {/* Relatórios with submenu */}
              <li className="transition-all duration-500 ease-out">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleReportsClick}
                      className={cn(
                        "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-300",
                        isOnReportsPage
                          ? "bg-primary/20 text-primary font-medium" 
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <BarChart3 size={20} className="shrink-0 transition-transform duration-300" />
                      {isHovered && (
                        <>
                          <span className="whitespace-nowrap animate-fade-in flex-1 text-left">
                            Relatórios
                          </span>
                          <ChevronDown 
                            size={16} 
                            className={cn(
                              "shrink-0 transition-transform duration-300",
                              (isReportsOpen || isOnReportsPage) && "rotate-180"
                            )}
                          />
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {!isHovered && (
                    <TooltipContent side="right" className="font-medium">
                      Relatórios
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Submenu */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isHovered && (isReportsOpen || isOnReportsPage)
                      ? "max-h-24 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5">
                    {reportsSubItems.map((subItem, subIndex) => (
                      <li key={subItem.title}>
                        <Link
                          to={subItem.url}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all duration-300",
                            subItem.active 
                              ? "bg-primary/15 text-primary font-medium" 
                              : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          )}
                          style={{
                            animationDelay: `${subIndex * 50}ms`,
                          }}
                        >
                          <subItem.icon size={16} className="shrink-0" />
                          <span className="whitespace-nowrap truncate">
                            {subItem.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>

              {/* Disparos */}
              <li className="transition-all duration-500 ease-out">
                <Tooltip>
                  <TooltipTrigger asChild>
                    {mainNavItems[1].onClick ? (
                      <button
                        onClick={mainNavItems[1].onClick}
                        className={cn(
                          "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-300",
                          mainNavItems[1].active 
                            ? "bg-primary/20 text-primary font-medium" 
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <MessageSquare size={20} className="shrink-0 transition-transform duration-300" />
                        {isHovered && (
                          <span className="whitespace-nowrap animate-fade-in">
                            {mainNavItems[1].title}
                          </span>
                        )}
                      </button>
                    ) : (
                      <Link
                        to={mainNavItems[1].url}
                        className={cn(
                          "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-300",
                          mainNavItems[1].active 
                            ? "bg-primary/20 text-primary font-medium" 
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <MessageSquare size={20} className="shrink-0 transition-transform duration-300" />
                        {isHovered && (
                          <span className="whitespace-nowrap animate-fade-in">
                            {mainNavItems[1].title}
                          </span>
                        )}
                      </Link>
                    )}
                  </TooltipTrigger>
                  {!isHovered && (
                    <TooltipContent side="right" className="font-medium">
                      {mainNavItems[1].title}
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            </ul>
          </nav>

          {/* Bottom navigation */}
          <div className="py-4 px-2 border-t border-sidebar-border">
            <ul className="space-y-1">
              {bottomNavItems.map((item) => (
                <li 
                  key={item.title}
                  className="transition-all duration-500 ease-out"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-300",
                          item.active 
                            ? "bg-primary/20 text-primary font-medium" 
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                          item.highlight && !item.active && "text-primary hover:text-primary"
                        )}
                      >
                        <item.icon size={20} className="shrink-0 transition-transform duration-300" />
                        {isHovered && (
                          <span className="whitespace-nowrap animate-fade-in">
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
              <li className="transition-all duration-500 ease-out">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/profile"
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-300",
                        currentPath === "/profile" 
                          ? "bg-primary/20 text-primary font-medium" 
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <Avatar className="h-6 w-6 shrink-0 border border-sidebar-border transition-transform duration-300">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Perfil'} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      {isHovered && (
                        <span className="whitespace-nowrap truncate animate-fade-in">
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
              <li className="transition-all duration-500 ease-out">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleLogout}
                      className={cn(
                        "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-300",
                        "text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      )}
                    >
                      <LogOut size={20} className="shrink-0 transition-transform duration-300" />
                      {isHovered && (
                        <span className="whitespace-nowrap animate-fade-in">
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
