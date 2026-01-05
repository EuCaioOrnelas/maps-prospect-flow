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
                      "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200",
                      "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      item.active && "bg-primary/20 text-primary font-medium"
                    )}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className={cn(
                      "whitespace-nowrap transition-all duration-300",
                      isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                    )}>
                      {item.title}
                    </span>
                  </button>
                ) : (
                  <Link
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200",
                      "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      item.active && "bg-primary/20 text-primary font-medium"
                    )}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className={cn(
                      "whitespace-nowrap transition-all duration-300",
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
                    "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    item.active && "bg-primary/20 text-primary font-medium",
                    item.highlight && !item.active && "text-primary hover:text-primary"
                  )}
                >
                  <item.icon size={20} className="shrink-0" />
                  <span className={cn(
                    "whitespace-nowrap transition-all duration-300",
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
                  "flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200",
                  "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  currentPath === "/profile" && "bg-primary/20 text-primary font-medium"
                )}
              >
                <Avatar className="h-6 w-6 shrink-0 border border-sidebar-border">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Perfil'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "whitespace-nowrap transition-all duration-300 truncate",
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
