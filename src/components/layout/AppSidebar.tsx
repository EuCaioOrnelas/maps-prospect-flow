import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, 
  BarChart3, 
  Crown, 
  LogOut,
  FileSearch,
  Send,
  Handshake,
  Megaphone,
  Users,
  Flame,
  AlertTriangle,
  Bell,
  Bot,
  HelpCircle,
  LayoutDashboard,
  DollarSign,
  Mail,
  Receipt,
  Trophy,
  MessageCircle,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminCheck } from "@/hooks/useAdminCheck";

import { useWarmingConnectionAlert } from "@/hooks/useWarmingConnectionAlert";
import { useUnreadAnnouncements } from "@/hooks/useUnreadAnnouncements";
import { AnnouncementsDialog } from "@/components/notifications/AnnouncementsDialog";
import { SidebarNavItem } from "./SidebarNavItem";
import logoIconNew from "@/assets/logo-icon-new.png";

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
  const [isCampaignsOpen, setIsCampaignsOpen] = useState(false);
  const [isOpportunitiesOpen, setIsOpportunitiesOpen] = useState(false);
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  
  const { hasDisconnectedWarming, disconnectedNumbers } = useWarmingConnectionAlert();
  const { unreadCount: unreadAnnouncements, disconnectedNumbers: disconnectedNumberAlerts, dismissDisconnectionAlert } = useUnreadAnnouncements();
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFreePlan = !profile?.plan || profile.plan === 'free';
  const currentPath = location.pathname;

  const isOnReportsPage = currentPath === "/dashboard" || currentPath === "/reports/prospeccao" || currentPath === "/whatsapp/reports" || currentPath === "/warming/reports" || currentPath === "/agents/reports";
  const isOnCampaignsPage = currentPath === "/whatsapp" || currentPath === "/meta-campaigns";
  const isOnOpportunitiesPage = currentPath === "/oportunidades" || currentPath === "/oportunidades/gestao";
  const isOnCrmPage = currentPath === "/crm" || currentPath === "/crm/score";
  const isOnAutomationPage = currentPath === "/agents" || currentPath.startsWith("/fluxos") || currentPath === "/warming";

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

  const dashboardSubItems = [
    {
      title: "Visão Geral",
      url: "/dashboard",
      icon: LayoutDashboard,
      active: currentPath === "/dashboard"
    },
    {
      title: "Disparos",
      url: "/whatsapp/reports",
      icon: Send,
      active: currentPath === "/whatsapp/reports"
    },
    {
      title: "Agentes IA",
      url: "/agents/reports",
      icon: Bot,
      active: currentPath === "/agents/reports"
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

  const handleCampaignsClick = () => {
    if (isExpanded) {
      setIsCampaignsOpen(!isCampaignsOpen);
    }
  };

  const handleOpportunitiesClick = () => {
    if (isExpanded) {
      setIsOpportunitiesOpen(!isOpportunitiesOpen);
    }
  };

  const handleCrmClick = () => {
    if (isExpanded) {
      setIsCrmOpen(!isCrmOpen);
    }
  };

  const handleAutomationClick = () => {
    if (isExpanded) {
      setIsAutomationOpen(!isAutomationOpen);
    }
  };

  // Reset reports submenu when sidebar closes
  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsReportsOpen(false);
    setIsCampaignsOpen(false);
    setIsOpportunitiesOpen(false);
    setIsCrmOpen(false);
    setIsAutomationOpen(false);
  };

  const showUpgrade = profile?.plan !== 'scale';

  return (
    <div
      className="fixed left-0 top-0 h-screen z-[60] hidden lg:flex"
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
        {/* Logo area - aligned with navbar height (58px = 57px + 1px border) */}
        <div className="h-[58px] min-h-[58px] flex items-center border-b border-sidebar-border px-4">
          <Link 
            to="/dashboard"
            className="flex items-center gap-0 h-12 group cursor-pointer"
          >
            {/* Icon logo - always visible and fixed position */}
            <img 
              src={logoIconNew} 
              alt="Wiize" 
              className="h-10 w-10 object-contain rounded-lg transition-all duration-200 ease-out group-hover:scale-105 group-hover:brightness-110 group-hover:drop-shadow-[0_0_12px_hsl(158,72%,38%,0.6)] shrink-0"
            />
            {/* Text "wiize" - fade in/out when expanded */}
            <span
              className={cn(
                "text-[1.7rem] tracking-tight text-foreground whitespace-nowrap transition-all duration-200 ease-out flex items-center",
                isHovered 
                  ? "opacity-100 translate-x-0" 
                  : "opacity-0 -translate-x-2 w-0 overflow-hidden"
              )}
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 500, lineHeight: 1 }}
            >
              wiize
            </span>
          </Link>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 px-4">
            {/* Dashboard with submenu */}
            <li>
              <SidebarNavItem
                title="Dashboard"
                icon={LayoutDashboard}
                onClick={handleReportsClick}
                isActive={isOnReportsPage || currentPath === "/dashboard"}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isReportsOpen}
                tooltip="Dashboard"
              />

              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    (isReportsOpen)
                      ? "max-h-56 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full before:transition-all before:duration-300 before:origin-top">
                    {dashboardSubItems.map((subItem) => (
                      <li key={subItem.title}>
                        <Link
                          to={subItem.url}
                          className={cn(
                            "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                            subItem.active
                              ? "bg-sidebar-accent/60 text-primary font-medium"
                              : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          )}
                        >
                          <subItem.icon size={20} className="shrink-0" />
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

            {/* Oportunidades with submenu */}
            <li>
              <SidebarNavItem
                title="Oportunidades"
                icon={Search}
                onClick={handleOpportunitiesClick}
                isActive={isOnOpportunitiesPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isOpportunitiesOpen}
                tooltip="Oportunidades"
              />

              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isOpportunitiesOpen
                      ? "max-h-28 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full before:transition-all before:duration-300 before:origin-top">
                    <li>
                      <Link
                        to="/oportunidades"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath === "/oportunidades"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Search size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Buscar</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/oportunidades/gestao"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath === "/oportunidades/gestao"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <BarChart3 size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Gestão</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </li>

            {/* Campanhas with submenu */}
            <li>
              <SidebarNavItem
                title="Campanha"
                icon={Megaphone}
                onClick={handleCampaignsClick}
                isActive={isOnCampaignsPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isCampaignsOpen}
                tooltip="Campanha"
              />

              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isCampaignsOpen
                      ? "max-h-28 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full before:transition-all before:duration-300 before:origin-top">
                    <li>
                      <Link
                        to="/whatsapp"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath === "/whatsapp"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Send size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Prospecção</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/meta-campaigns"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath === "/meta-campaigns"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Handshake size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Relacionamento</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </li>

            {/* CRM with submenu */}
            <li>
              <SidebarNavItem
                title="CRM"
                icon={Users}
                onClick={handleCrmClick}
                isActive={isOnCrmPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isCrmOpen}
                tooltip="CRM"
              />

              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isCrmOpen
                      ? "max-h-28 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full before:transition-all before:duration-300 before:origin-top">
                    <li>
                      <Link
                        to="/crm"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath === "/crm"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Users size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Pipeline</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/crm/score"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath === "/crm/score"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Trophy size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Score</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
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

            {/* Automação with submenu */}
            <li>
              <SidebarNavItem
                title="Automação"
                icon={Workflow}
                onClick={handleAutomationClick}
                isActive={isOnAutomationPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isAutomationOpen}
                badge={hasDisconnectedWarming ? (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center animate-pulse">
                    <AlertTriangle size={8} className="text-destructive-foreground" />
                  </div>
                ) : undefined}
                tooltip="Automação"
              />

              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isAutomationOpen
                      ? "max-h-40 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full before:transition-all before:duration-300 before:origin-top">
                    <li>
                      <Link
                        to="/fluxos"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath.startsWith("/fluxos")
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Workflow size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Fluxos</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/agents"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath === "/agents"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Bot size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Agentes IA</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/warming"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200",
                          currentPath === "/warming"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Flame size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Aquecimento</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
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
            
            {/* Avisos */}
            <li>
              <SidebarNavItem
                title="Avisos"
                icon={Bell}
                onClick={() => setAnnouncementsOpen(true)}
                isExpanded={isExpanded}
                badge={unreadAnnouncements > 0 ? (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
                    disconnectedNumberAlerts.length > 0 
                      ? "bg-destructive animate-pulse" 
                      : "bg-primary"
                  )}>
                    <span className={cn(
                      "text-[10px] font-bold",
                      disconnectedNumberAlerts.length > 0 
                        ? "text-destructive-foreground" 
                        : "text-primary-foreground"
                    )}>{unreadAnnouncements}</span>
                  </div>
                ) : undefined}
                tooltip={disconnectedNumberAlerts.length > 0 ? (
                  <div>
                    <p className="font-medium">⚠️ Número desconectado</p>
                    <p className="text-xs opacity-90">{disconnectedNumberAlerts.length} número(s) precisa(m) reconectar</p>
                  </div>
                ) : "Avisos"}
              />
            </li>

            {/* Ajuda */}
            <li>
              <SidebarNavItem
                title="Ajuda"
                icon={HelpCircle}
                url="/ajuda"
                isActive={currentPath === "/ajuda" || currentPath === "/ajuda/faq"}
                isExpanded={isExpanded}
                tooltip="Central de Ajuda"
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
          </ul>
        </div>
      </aside>

      {/* Announcements Dialog */}
      <AnnouncementsDialog 
        open={announcementsOpen} 
        onOpenChange={setAnnouncementsOpen}
        disconnectedNumbers={disconnectedNumberAlerts}
        onDismissDisconnection={dismissDisconnectionAlert}
      />
    </div>
  );
};
