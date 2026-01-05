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
            {mainNavItems.map((item) => (
              <li key={item.title}>
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    className={cn(
                      "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-200 relative group",
                      !item.active && "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5",
                      item.active && "bg-gradient-to-r from-primary/20 to-primary/5 text-primary"
                    )}
                  >
                    {item.active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                      item.active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "group-hover:bg-white/10"
                    )}>
                      <item.icon size={18} className="shrink-0" />
                    </div>
                    <span className={cn(
                      "whitespace-nowrap font-medium transition-all duration-300",
                      isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                    )}>
                      {item.title}
                    </span>
                  </button>
                ) : (
                  <Link
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-200 relative group",
                      !item.active && "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5",
                      item.active && "bg-gradient-to-r from-primary/20 to-primary/5 text-primary"
                    )}
                  >
                    {item.active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                      item.active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "group-hover:bg-white/10"
                    )}>
                      <item.icon size={18} className="shrink-0" />
                    </div>
                    <span className={cn(
                      "whitespace-nowrap font-medium transition-all duration-300",
                      isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                    )}>
                      {item.title}
                    </span>
                  </Link>
                )}
              </li>
            ))}
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
                    "flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-200 relative group",
                    !item.active && "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5",
                    item.active && "bg-gradient-to-r from-primary/20 to-primary/5 text-primary",
                    item.highlight && !item.active && "text-amber-400 hover:text-amber-300"
                  )}
                >
                  {item.active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                    item.active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : 
                    item.highlight ? "bg-amber-400/20 group-hover:bg-amber-400/30" : "group-hover:bg-white/10"
                  )}>
                    <item.icon size={18} className="shrink-0" />
                  </div>
                  <span className={cn(
                    "whitespace-nowrap font-medium transition-all duration-300",
                    isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                  )}>
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
                  "flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-200 relative group",
                  currentPath !== "/profile" && "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5",
                  currentPath === "/profile" && "bg-gradient-to-r from-primary/20 to-primary/5 text-primary"
                )}
              >
                {currentPath === "/profile" && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}
                <Avatar className={cn(
                  "h-8 w-8 shrink-0 transition-all duration-200 ring-2 ring-offset-2 ring-offset-sidebar",
                  currentPath === "/profile" ? "ring-primary" : "ring-transparent group-hover:ring-white/20"
                )}>
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Perfil'} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "whitespace-nowrap font-medium transition-all duration-300 truncate",
                  isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                )}>
                  {profile?.name || 'Meu Perfil'}
                </span>
              </Link>
            </li>

            {/* Logout */}
            <li>
              <button
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200",
                  "text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                )}
              >
                <LogOut size={20} className="shrink-0" />
                <span className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                )}>
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
