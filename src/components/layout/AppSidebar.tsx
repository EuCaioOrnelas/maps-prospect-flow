import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, 
  BarChart3, 
  MessageSquare, 
  Crown, 
  User, 
  Settings,
  LogOut,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface AppSidebarProps {
  profile?: {
    plan?: string;
  } | null;
  onWhatsAppClick?: () => void;
}

export const AppSidebar = ({ profile, onWhatsAppClick }: AppSidebarProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const isFreePlan = !profile?.plan || profile.plan === 'free';
  const currentPath = location.pathname;

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
      title: "Perfil",
      url: "/profile",
      icon: User,
      active: currentPath === "/profile"
    },
    {
      title: "Configurações",
      url: "/profile",
      icon: Settings,
      active: false
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
          "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          isHovered ? "w-56" : "w-14"
        )}
      >
        {/* Logo area */}
        <div className="h-14 flex items-center px-3 border-b border-sidebar-border">
          <div className={cn(
            "flex items-center gap-2 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-sidebar-foreground whitespace-nowrap">LeadPilot</span>
          </div>
          {!isHovered && (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
          )}
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
                      "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors",
                      "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      item.active && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className={cn(
                      "whitespace-nowrap transition-opacity duration-200",
                      isHovered ? "opacity-100" : "opacity-0"
                    )}>
                      {item.title}
                    </span>
                  </button>
                ) : (
                  <Link
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors",
                      "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      item.active && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className={cn(
                      "whitespace-nowrap transition-opacity duration-200",
                      isHovered ? "opacity-100" : "opacity-0"
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
                    "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    item.active && "bg-sidebar-accent text-sidebar-foreground font-medium",
                    item.highlight && "text-primary hover:text-primary"
                  )}
                >
                  <item.icon size={20} className="shrink-0" />
                  <span className={cn(
                    "whitespace-nowrap transition-opacity duration-200",
                    isHovered ? "opacity-100" : "opacity-0"
                  )}>
                    {item.title}
                  </span>
                </Link>
              </li>
            ))}
            
            {/* Logout */}
            <li>
              <button
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors",
                  "text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                )}
              >
                <LogOut size={20} className="shrink-0" />
                <span className={cn(
                  "whitespace-nowrap transition-opacity duration-200",
                  isHovered ? "opacity-100" : "opacity-0"
                )}>
                  Sair
                </span>
              </button>
            </li>
          </ul>
        </div>

        {/* Expand indicator */}
        <div className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 transition-opacity duration-200",
          isHovered ? "opacity-0" : "opacity-50"
        )}>
          <ChevronRight size={16} className="text-sidebar-foreground/50" />
        </div>
      </aside>
    </div>
  );
};
