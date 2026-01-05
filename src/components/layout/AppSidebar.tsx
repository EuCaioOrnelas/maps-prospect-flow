import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, 
  BarChart3, 
  MessageSquare, 
  Crown, 
  LogOut,
  ChevronDown,
  FileSearch,
  Send,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    { 
      title: "Chat", 
      url: "/chat", 
      icon: MessageCircle,
      active: currentPath === "/chat"
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
    <div
      className="fixed left-0 top-0 h-screen z-40 hidden lg:flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Sidebar */}
      <aside
        className={cn(
          "h-full w-14 bg-sidebar border-r border-sidebar-border flex flex-col",
          "transition-[width] duration-300 ease-out",
          isHovered && "w-56"
        )}
        style={{ overflow: 'hidden' }}
      >
        {/* Logo area - fixed height and consistent padding */}
        <div className="h-14 min-h-[56px] flex items-center px-2.5 border-b border-sidebar-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 bg-primary rounded-xl p-1.5">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span 
              className={cn(
                "font-display font-bold text-lg text-foreground whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300",
                isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
              )}
            >
              WiizeProspect
            </span>
          </div>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1">
            {/* Prospecção */}
            <li>
              <Link
                to={mainNavItems[0].url}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-200",
                  mainNavItems[0].active 
                    ? "bg-primary/20 text-primary font-medium" 
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Search size={20} className="shrink-0" />
                <span 
                  className={cn(
                    "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300",
                    isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
                  )}
                >
                  {mainNavItems[0].title}
                </span>
              </Link>
            </li>

            {/* Relatórios with submenu */}
            <li>
              <button
                onClick={handleReportsClick}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-200",
                  isOnReportsPage
                    ? "bg-primary/20 text-primary font-medium" 
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <BarChart3 size={20} className="shrink-0" />
                <span 
                  className={cn(
                    "whitespace-nowrap overflow-hidden flex-1 text-left transition-[opacity,max-width] duration-300",
                    isHovered ? "opacity-100 max-w-32" : "opacity-0 max-w-0"
                  )}
                >
                  Relatórios
                </span>
                <ChevronDown 
                  size={16} 
                  className={cn(
                    "shrink-0 transition-all duration-300",
                    isHovered ? "opacity-100" : "opacity-0 w-0",
                    (isReportsOpen || isOnReportsPage) && "rotate-180"
                  )}
                />
              </button>

              {/* Submenu */}
              <div
                className={cn(
                  "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
                  isHovered && (isReportsOpen || isOnReportsPage)
                    ? "max-h-24 opacity-100 mt-1"
                    : "max-h-0 opacity-0"
                )}
              >
                <ul className="pl-4 space-y-0.5">
                  {reportsSubItems.map((subItem) => (
                    <li key={subItem.title}>
                      <Link
                        to={subItem.url}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors duration-200",
                          subItem.active 
                            ? "bg-primary/15 text-primary font-medium" 
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
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
            <li>
              {mainNavItems[1].onClick ? (
                <button
                  onClick={mainNavItems[1].onClick}
                  className={cn(
                    "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-200",
                    mainNavItems[1].active 
                      ? "bg-primary/20 text-primary font-medium" 
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <MessageSquare size={20} className="shrink-0" />
                  <span 
                    className={cn(
                      "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300",
                      isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
                    )}
                  >
                    {mainNavItems[1].title}
                  </span>
                </button>
              ) : (
                <Link
                  to={mainNavItems[1].url}
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-200",
                    mainNavItems[1].active 
                      ? "bg-primary/20 text-primary font-medium" 
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <MessageSquare size={20} className="shrink-0" />
                  <span 
                    className={cn(
                      "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300",
                      isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
                    )}
                  >
                    {mainNavItems[1].title}
                  </span>
                </Link>
              )}
            </li>

            {/* Chat */}
            <li>
              <Link
                to={mainNavItems[2].url}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-200",
                  mainNavItems[2].active 
                    ? "bg-primary/20 text-primary font-medium" 
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <MessageCircle size={20} className="shrink-0" />
                <span 
                  className={cn(
                    "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300",
                    isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
                  )}
                >
                  {mainNavItems[2].title}
                </span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Bottom navigation */}
        <div className="py-4 px-2 border-t border-sidebar-border">
          <ul className="space-y-1">
            {bottomNavItems.map((item) => (
              <li key={item.title}>
                <Link
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-200",
                    item.active 
                      ? "bg-primary/20 text-primary font-medium" 
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    item.highlight && !item.active && "text-primary hover:text-primary"
                  )}
                >
                  <item.icon size={20} className="shrink-0" />
                  <span 
                    className={cn(
                      "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300",
                      isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
                    )}
                  >
                    {item.title}
                  </span>
                </Link>
              </li>
            ))}
            
            {/* Profile */}
            <li>
              <Link
                to="/profile"
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-200",
                  currentPath === "/profile" 
                    ? "bg-primary/20 text-primary font-medium" 
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Avatar className="h-5 w-5 shrink-0 border border-sidebar-border">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Perfil'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span 
                  className={cn(
                    "whitespace-nowrap truncate overflow-hidden transition-[opacity,max-width] duration-300",
                    isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
                  )}
                >
                  {profile?.name || 'Meu Perfil'}
                </span>
              </Link>
            </li>

            {/* Logout */}
            <li>
              <button
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-200",
                  "text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                )}
              >
                <LogOut size={20} className="shrink-0" />
                <span 
                  className={cn(
                    "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300",
                    isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
                  )}
                >
                  Sair
                </span>
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};
