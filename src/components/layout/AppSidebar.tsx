import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, 
  BarChart3, 
  Crown, 
  LogOut,
  FileSearch,
  Send,
  MessageCircle,
  Megaphone,
  Users,
  Flame,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTotalUnread } from "@/hooks/useTotalUnread";
import { useWarmingConnectionAlert } from "@/hooks/useWarmingConnectionAlert";
import { useUnreadAnnouncements } from "@/hooks/useUnreadAnnouncements";
import { AnnouncementsDialog } from "@/components/notifications/AnnouncementsDialog";
import { SidebarNavItem } from "./SidebarNavItem";
import logoIcon from "@/assets/logo-icon.png";
import logoBranca from "@/assets/logo-branca.png";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { totalUnread } = useTotalUnread();
  const { hasDisconnectedWarming, disconnectedNumbers } = useWarmingConnectionAlert();
  const { unreadCount: unreadAnnouncements } = useUnreadAnnouncements();
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isFreePlan = !profile?.plan || profile.plan === 'free';
  const currentPath = location.pathname;

  // Keep reports submenu open if on a reports page
  const isOnReportsPage = currentPath === "/reports" || currentPath === "/whatsapp/reports" || currentPath === "/warming/reports";

  // Sync expanded state with hover, but with delay to prevent glitches
  useEffect(() => {
    if (isHovered) {
      // Expand immediately when hovering
      expandTimeoutRef.current = setTimeout(() => {
        setIsExpanded(true);
      }, 50);
    } else {
      // Collapse after animation completes
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
      setIsExpanded(false);
    }
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
    };
  }, [isHovered]);

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
    {
      title: "Relatórios de Aquecimento",
      url: "/warming/reports",
      icon: Flame,
      active: currentPath === "/warming/reports"
    },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  const handleReportsClick = () => {
    if (isExpanded) {
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

  const showUpgrade = profile?.plan !== 'scale';

  return (
    <div
      className="fixed left-0 top-0 h-screen z-40 hidden lg:flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Sidebar */}
      <aside
        className={cn(
          "h-full bg-sidebar border-r border-sidebar-border flex flex-col",
          "transition-[width] duration-300 ease-out overflow-hidden",
          isHovered ? "w-56" : "w-[72px]"
        )}
      >
        {/* Logo area - aligned with navbar height */}
        <div className="h-[57px] min-h-[57px] flex items-center border-b border-sidebar-border px-4">
          <Link 
            to="/dashboard"
            className="relative flex items-center justify-center h-11 group cursor-pointer"
          >
            {/* Icon logo - visible when collapsed */}
            <img 
              src={logoIcon} 
              alt="Wiize" 
              className={cn(
                "h-11 w-11 object-contain transition-all duration-300 ease-out group-hover:scale-105 group-hover:brightness-110",
                isHovered 
                  ? "opacity-0 scale-90 absolute pointer-events-none" 
                  : "opacity-100 scale-100"
              )}
            />
            {/* Full logo - visible when expanded */}
            <img 
              src={logoBranca} 
              alt="Wiize" 
              className={cn(
                "h-10 w-auto object-contain transition-all duration-300 ease-out group-hover:scale-[1.02] group-hover:brightness-110 ml-0.5",
                isHovered 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-95 absolute pointer-events-none"
              )}
            />
          </Link>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 px-4">
            {/* Prospecção */}
            <li>
              <SidebarNavItem
                title="Prospecção"
                icon={Search}
                url="/dashboard"
                isActive={currentPath === "/dashboard"}
                isExpanded={isExpanded}
                tooltip="Prospecção"
              />
            </li>

            {/* Relatórios with submenu */}
            <li>
              <SidebarNavItem
                title="Relatórios"
                icon={BarChart3}
                onClick={handleReportsClick}
                isActive={isOnReportsPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isReportsOpen || isOnReportsPage}
                tooltip="Relatórios"
              />

              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
                    (isReportsOpen || isOnReportsPage)
                      ? "max-h-32 opacity-100 mt-1"
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
                              ? "bg-sidebar-accent/60 text-primary font-medium"
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
              )}
            </li>

            {/* Disparos */}
            <li>
              <SidebarNavItem
                title="Disparos"
                icon={Megaphone}
                url={isFreePlan ? undefined : "/whatsapp"}
                onClick={isFreePlan ? onWhatsAppClick : undefined}
                isActive={currentPath === "/whatsapp"}
                isExpanded={isExpanded}
                tooltip="Disparos"
              />
            </li>

            {/* Aquecimento */}
            <li>
              <SidebarNavItem
                title="Aquecimento"
                icon={Flame}
                url="/warming"
                isActive={currentPath === "/warming"}
                isExpanded={isExpanded}
                badge={hasDisconnectedWarming ? (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center animate-pulse">
                    <AlertTriangle size={8} className="text-destructive-foreground" />
                  </div>
                ) : undefined}
                tooltip={
                  hasDisconnectedWarming ? (
                    <div>
                      <p className="font-medium">Número desconectado</p>
                      <p className="text-xs opacity-90">
                        {disconnectedNumbers.length} número(s) precisa(m) reconectar
                      </p>
                    </div>
                  ) : "Aquecimento"
                }
              />
            </li>

            {/* CRM */}
            <li>
              <SidebarNavItem
                title="CRM"
                icon={Users}
                url="/crm"
                isActive={currentPath === "/crm"}
                isExpanded={isExpanded}
                tooltip="CRM"
              />
            </li>

            {/* Chat */}
            <li>
              <SidebarNavItem
                title="Chat"
                icon={MessageCircle}
                url="/chat"
                isActive={currentPath === "/chat"}
                isExpanded={isExpanded}
                tooltip="Chat"
              />
            </li>
          </ul>
        </nav>

        {/* Bottom navigation */}
        <div className="py-4 border-t border-sidebar-border">
          <ul className="space-y-1 px-4">
            {/* Upgrade */}
            {showUpgrade && (
              <li>
                <SidebarNavItem
                  title="Upgrade"
                  icon={Crown}
                  url="/upgrade"
                  isActive={currentPath === "/upgrade"}
                  isExpanded={isExpanded}
                  highlight
                  tooltip="Upgrade"
                />
              </li>
            )}
            
            {/* Notifications */}
            <li>
              <SidebarNavItem
                title="Novidades"
                icon={Bell}
                onClick={() => setAnnouncementsOpen(true)}
                isExpanded={isExpanded}
                badge={unreadAnnouncements > 0 ? (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary-foreground">{unreadAnnouncements}</span>
                  </div>
                ) : undefined}
                tooltip="Novidades"
              />
            </li>

            {/* Profile */}
            <li>
              <Link
                to="/profile"
                className={cn(
                  "flex items-center rounded-lg transition-colors duration-200",
                  "w-10 h-10 justify-center",
                  isExpanded && "w-full px-2.5 justify-start gap-3",
                  currentPath === "/profile"
                    ? "bg-sidebar-accent/60 text-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Avatar className="h-5 w-5 shrink-0 border border-sidebar-border">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Perfil'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {isExpanded && (
                  <span className="whitespace-nowrap truncate overflow-hidden flex-1">
                    {profile?.name || 'Meu Perfil'}
                  </span>
                )}
              </Link>
            </li>

            {/* Logout */}
            <li>
              <SidebarNavItem
                title="Sair"
                icon={LogOut}
                onClick={handleLogout}
                isExpanded={isExpanded}
                className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                tooltip="Sair"
              />
            </li>
          </ul>
        </div>
      </aside>

      {/* Announcements Dialog */}
      <AnnouncementsDialog 
        open={announcementsOpen} 
        onOpenChange={setAnnouncementsOpen} 
      />
    </div>
  );
};
