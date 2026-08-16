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
  Users as UsersIcon,
  Flame,
  AlertTriangle,
  Bell,
  Bot,
  HelpCircle,
  Lightbulb,
  LayoutDashboard,
  DollarSign,
  Mail,
  Receipt,
  Trophy,
  MessageCircle,
  Workflow,
  LayoutDashboard as LayoutDashboardIcon,
  Megaphone as MegaphoneIcon,
  FileText,
  Phone,
  RotateCcw,
  CalendarDays,
  Settings as SettingsIcon,
} from "lucide-react";
import { MetaIcon } from "@/components/meta/MetaIcon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminCheck } from "@/hooks/useAdminCheck";


import { useUnreadAnnouncements } from "@/hooks/useUnreadAnnouncements";
import { useChatUnreadBadge } from "@/hooks/useChatUnreadBadge";
import { AnnouncementsDialog } from "@/components/notifications/AnnouncementsDialog";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarDivider } from "./SidebarDivider";
import logoIconNew from "@/assets/logo-icon-new.png";
import logoWordmark from "@/assets/logo-wordmark.png";
import logoWordmarkWhite from "@/assets/logo-wordmark-white.png";
import { profileHasFeature, type FeatureKey } from "@/lib/featurePermissions";

import { planHasFeature, isLegacyPlanUser } from "@/lib/planAccess";
import { useAccountRole } from "@/hooks/useAccountRole";
import { roleHasPermission, type AccountPermission } from "@/lib/accountPermissions";

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
  const [tourForceOpen, setTourForceOpen] = useState(false);
  const [tourSection, setTourSection] = useState<string | null>(null);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isCampaignsOpen, setIsCampaignsOpen] = useState(false);
  const [isOpportunitiesOpen, setIsOpportunitiesOpen] = useState(false);
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const location = useLocation();
  const { signOut, profile: authProfile } = useAuth();
  const { isAdmin } = useAdminCheck();
  const chatUnread = useChatUnreadBadge();
  const { role: accountRole } = useAccountRole();
  const canRole = (perm: AccountPermission) => roleHasPermission(accountRole, perm);
  const canSeeUsers = (isAdmin || accountRole === "owner" || accountRole === "admin") && canRole("usuarios");
  const can = (key: FeatureKey) =>
    isAdmin ||
    (profileHasFeature(authProfile as any, key) && planHasFeature(authProfile as any, key));

  const { unreadCount: unreadAnnouncements, disconnectedNumbers: disconnectedNumberAlerts, dismissDisconnectionAlert } = useUnreadAnnouncements();
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFreePlan = !profile?.plan || profile.plan === 'free';
  const currentPath = location.pathname;

  const isOnReportsPage = currentPath === "/dashboard" || currentPath === "/reports/prospeccao";
  const isOnCampaignsPage = currentPath === "/meta-campaigns";
  const isOnOpportunitiesPage = currentPath === "/oportunidades" || currentPath === "/oportunidades/gestao" || currentPath === "/oportunidades/sdr";
  const isOnCrmPage = currentPath === "/crm" || currentPath === "/crm/score";
  const isOnAutomationPage = currentPath.startsWith("/fluxos");
  const isOnMetaPage = currentPath === "/meta" || currentPath.startsWith("/meta/") || currentPath === "/meta-campaigns";

  // Watch body class to force expand and select active submenu during guided tour
  useEffect(() => {
    const update = () => {
      const cls = document.body.classList;
      const sections = ["oportunidades", "campanhas", "meta", "crm", "automacao", "chat", "dashboard"];
      const active = sections.find((s) => cls.contains(`tour-open-${s}`)) ?? null;
      const anyOpen = active !== null || cls.contains("tour-sidebar-open");
      setTourForceOpen(anyOpen);
      setTourSection(active);
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Sync expanded state with hover, but with delay to prevent glitches
  useEffect(() => {
    if (tourForceOpen) {
      setIsExpanded(true);
      setIsOpportunitiesOpen(tourSection === "oportunidades");
      setIsCampaignsOpen(tourSection === "campanhas");
      setIsMetaOpen(tourSection === "meta");
      setIsCrmOpen(tourSection === "crm");
      setIsAutomationOpen(tourSection === "automacao");
      setIsReportsOpen(tourSection === "dashboard");
      return;
    }
    if (isHovered) {
      expandTimeoutRef.current = setTimeout(() => {
        setIsExpanded(true);
      }, 50);
    } else {
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
  }, [isHovered, tourForceOpen, tourSection]);

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

  const handleMetaClick = () => {
    if (isExpanded) {
      setIsMetaOpen(!isMetaOpen);
    }
  };

  // Reset reports submenu when sidebar closes
  const handleMouseLeave = () => {
    if (tourForceOpen) return; // don't collapse while tour is driving the sidebar
    setIsHovered(false);
    setIsReportsOpen(false);
    setIsCampaignsOpen(false);
    setIsOpportunitiesOpen(false);
    setIsCrmOpen(false);
    setIsAutomationOpen(false);
    setIsMetaOpen(false);
  };

  // Upgrade só faz sentido para o plano Atendimento (novo "start", pós-cutoff).
  const showUpgrade =
    (profile?.plan || "").toLowerCase() === "start" && !isLegacyPlanUser(profile);

  return (
    <div
      className="fixed left-0 top-0 h-screen z-[60] hidden lg:flex"
      onMouseEnter={() => {
        if (document.body.classList.contains("tour-active")) return;
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (document.body.classList.contains("tour-active")) return;
        handleMouseLeave();
      }}
    >
      {/* Sidebar */}
      <aside
        className={cn(
          "h-full bg-sidebar border-r border-sidebar-border flex flex-col",
          "transition-[width] duration-300 ease-out overflow-hidden",
          (isHovered || tourForceOpen) ? "w-[268px]" : "w-[72px]"
        )}
      >
        {/* Logo area - aligned with navbar height */}
        <div className="h-[58px] min-h-[58px] flex items-center px-4">
          <Link 
            to="/dashboard"
            className="flex items-center gap-0 h-12 group cursor-pointer"
          >
            {/* Icon logo - always visible and fixed position */}
            <img 
              src={logoIconNew} 
              alt="Wiize" 
              className="h-10 w-10 object-contain rounded-hover transition-all duration-200 ease-out group-hover:scale-105 group-hover:brightness-110 group-hover:drop-shadow-[0_0_12px_hsl(158,72%,38%,0.6)] shrink-0"
            />
            {/* Wordmark - fade in/out when expanded */}
            <span
              className={cn(
                "transition-all duration-200 ease-out flex items-center ml-1.5",
                (isHovered || tourForceOpen)
                  ? "opacity-100 translate-x-0" 
                  : "opacity-0 -translate-x-2 w-0 ml-0 overflow-hidden"
              )}
            >
              <img src={logoWordmark} alt="Wiize" className="h-6 w-auto object-contain dark:hidden" />
              <img src={logoWordmarkWhite} alt="Wiize" className="h-6 w-auto object-contain hidden dark:block" />
            </span>
          </Link>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 px-4">

            {/* Dashboard - single page, no submenu */}
            {canRole("dashboard_main") && (
            <li>
              <SidebarNavItem
                title="Dashboard"
                icon={LayoutDashboard}
                url="/dashboard"
                isActive={currentPath === "/dashboard"}
                isExpanded={isExpanded}
                tooltip="Dashboard"
              />
            </li>
            )}


            {/* Agenda - single page */}
            {can("crm") && (
            <li data-tour="sidebar-agenda">
              <SidebarNavItem
                title="Agenda"
                icon={CalendarDays}
                url="/agenda"
                isActive={currentPath === "/agenda"}
                isExpanded={isExpanded}
                tooltip="Agenda"
              />
            </li>
            )}


            {/* Oportunidades with submenu */}
            {can("oportunidades") && canRole("prospeccao") && (
            <li data-tour="sidebar-oportunidades">
              <SidebarNavItem
                title="Prospecção IA"
                icon={Search}
                onClick={handleOpportunitiesClick}
                isActive={isOnOpportunitiesPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isOpportunitiesOpen}
                tooltip="Prospecção IA"
              />

              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isOpportunitiesOpen
                      ? "max-h-40 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full before:transition-all before:duration-300 before:origin-top">
                    <li data-tour="sidebar-oportunidades-buscar">
                      <Link
                        to="/oportunidades"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-hover transition-colors duration-200",
                          currentPath === "/oportunidades"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Search size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Buscar</span>
                      </Link>
                    </li>
                    <li data-tour="sidebar-oportunidades-gestao">
                      <Link
                        to="/oportunidades/gestao"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-hover transition-colors duration-200",
                          currentPath === "/oportunidades/gestao"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <BarChart3 size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Gestão</span>
                      </Link>
                    </li>
                    {can("sdr_inteligente") && (
                    <li data-tour="sidebar-oportunidades-sdr">
                      <Link
                        to="/oportunidades/sdr"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-hover transition-colors duration-200",
                          currentPath === "/oportunidades/sdr"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Bot size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">SDR Inteligente</span>
                      </Link>
                    </li>
                    )}

                  </ul>
                </div>
              )}
            </li>
            )}

            {/* Meta */}
            {canRole("dashboard_meta") && (
            <li data-tour="sidebar-meta">
              <SidebarNavItem
                title="Meta"
                icon={MetaIcon as any}
                onClick={handleMetaClick}
                isActive={isOnMetaPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isMetaOpen}
                tooltip="Meta"
              />
              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isMetaOpen ? "max-h-[420px] opacity-100 mt-1" : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full">
                    {[
                      { title: "Dashboard", url: "/meta", icon: LayoutDashboardIcon, tour: "sidebar-meta-dashboard" },
                      { title: "Campanhas", url: "/meta/campanhas", icon: MegaphoneIcon, tour: "sidebar-meta-campanhas" },
                      { title: "Números & WABA", url: "/meta/numeros", icon: Phone, tour: "sidebar-meta-numeros" },
                      { title: "Configurações", url: "/meta/configuracoes", icon: SettingsIcon, tour: "sidebar-meta-configuracoes" },
                    ].map((item) => {
                      const active = item.url === "/meta" ? currentPath === "/meta" : currentPath === item.url;
                      return (
                        <li key={item.url} data-tour={item.tour}>
                          <Link
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3 px-2.5 h-10 rounded-hover transition-colors duration-200",
                              active
                                ? "bg-sidebar-accent/60 text-primary font-medium"
                                : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            )}
                          >
                            <item.icon size={20} className="shrink-0" />
                            <span className="whitespace-nowrap truncate">{item.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
            )}


            {/* Campanhas Evolution removida do menu — página continua acessível via /whatsapp */}


            {/* CRM with submenu */}
            {can("crm") && (
            <li data-tour="sidebar-crm">
              <SidebarNavItem
                title="Contatos"
                icon={Users}
                onClick={handleCrmClick}
                isActive={isOnCrmPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isCrmOpen}
                tooltip="Contatos"
              />

              {isExpanded && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isCrmOpen
                      ? "max-h-40 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full before:transition-all before:duration-300 before:origin-top">
                    <li data-tour="sidebar-crm-pipeline">
                      <Link
                        to="/crm"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-hover transition-colors duration-200",
                          currentPath === "/crm"
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Users size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">CRM</span>
                      </Link>
                    </li>
                    <li data-tour="sidebar-crm-score">
                      <Link
                        to="/crm/score"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-hover transition-colors duration-200",
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
            )}

            {/* Chat */}
            {can("chat") && (
            <li data-tour="sidebar-chat">
              <SidebarNavItem
                title="Chat"
                icon={MessageCircle}
                url="/chat"
                isActive={currentPath === "/chat"}
                isExpanded={isExpanded}
                tooltip="Chat"
                badge={chatUnread > 0 ? (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center leading-none">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </div>
                ) : undefined}
              />
            </li>
            )}

            {/* Automação with submenu */}
            {(can("flows") || can("agents")) && (
            <li data-tour="sidebar-automacao">
              <SidebarNavItem
                title="Automação"
                icon={Workflow}
                onClick={handleAutomationClick}
                isActive={isOnAutomationPage}
                isExpanded={isExpanded}
                hasSubmenu
                isSubmenuOpen={isAutomationOpen}
                badge={undefined}
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
                    {can("flows") && (
                    <li data-tour="sidebar-automacao-fluxos">
                      <Link
                        to="/fluxos"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-hover transition-colors duration-200",
                          currentPath.startsWith("/fluxos")
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Workflow size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Fluxos</span>
                      </Link>
                    </li>
                    )}
                    {can("agents") && (
                    <li data-tour="sidebar-automacao-agentes">
                      <Link
                        to="/equipe-ia"
                        className={cn(
                          "flex items-center gap-3 px-2.5 h-10 rounded-hover transition-colors duration-200",
                          currentPath.startsWith("/equipe-ia") || currentPath.startsWith("/ai-workforce")
                            ? "bg-sidebar-accent/60 text-primary font-medium"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Bot size={20} className="shrink-0" />
                        <span className="whitespace-nowrap truncate">Equipe IA</span>
                      </Link>
                    </li>
                    )}
                    {/* Aquecimento removido do menu — página continua acessível via /warming */}

                  </ul>
                </div>
              )}
            </li>
            )}

          </ul>
        </nav>

        <SidebarDivider className="my-2" />

        {/* Bottom navigation */}
        <div className="py-4">
          <ul className="space-y-1 px-4">
            {/* Upgrade */}
            {/* Upgrade — só para quem tem acesso a assinaturas (esconde para operacional) */}
            {showUpgrade && canRole("assinaturas") && (
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
            <li className="relative">
              <SidebarNavItem
                title="Avisos"
                icon={Bell}
                onClick={() => setAnnouncementsOpen(true)}
                isExpanded={isExpanded}

                badge={unreadAnnouncements > 0 ? (
                  <span className={cn(
                    "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full",
                    "flex items-center justify-center text-[9px] font-bold leading-none tabular-nums text-white",
                    "ring-2 ring-background shadow-sm",
                    disconnectedNumberAlerts.length > 0
                      ? "bg-amber-500"
                      : "bg-primary"
                  )}>
                    {unreadAnnouncements > 99 ? "+99" : unreadAnnouncements}
                  </span>
                ) : undefined}
                tooltip={disconnectedNumberAlerts.length > 0 ? (
                  <div>
                    <p className="font-medium text-amber-500">⚠️ Número Meta desconectado</p>
                    <p className="text-xs opacity-90">{disconnectedNumberAlerts.length} número(s) Meta precisa(m) reconectar</p>
                  </div>
                ) : "Avisos"}
              />
            </li>

            {/* Usuários — visível apenas para Owner/Admin */}
            {canSeeUsers && (
              <li>
                <SidebarNavItem
                  title="Usuários"
                  icon={UsersIcon}
                  url="/usuarios"
                  isActive={currentPath === "/usuarios"}
                  isExpanded={isExpanded}
                  tooltip="Usuários da conta"
                />
              </li>
            )}

            {/* Sugestões */}
            <li>
              <SidebarNavItem
                title="Sugestões"
                icon={Lightbulb}
                url="/sugestoes"
                isActive={currentPath === "/sugestoes"}
                isExpanded={isExpanded}
                tooltip="Sugestões de Melhorias"
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
                  "relative flex items-center rounded-hover overflow-hidden transition-[background-color,color,width] duration-300 ease-out",
                  "h-10 justify-start",
                  isExpanded ? "w-full pl-12 pr-2.5" : "w-10",

                  currentPath === "/profile"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground/60 hover:text-primary hover:bg-primary/[0.07]"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 inset-y-0 w-[3px] bg-primary",
                    "transition-[opacity,transform] duration-300 ease-out origin-left",
                    currentPath === "/profile" && isExpanded
                      ? "opacity-100 scale-x-100"
                      : "opacity-0 scale-x-0"
                  )}
                />
                <span className="absolute left-0 top-0 w-10 h-10 flex items-center justify-center shrink-0">
                  <Avatar
                    className="h-8 w-8 rounded-hover overflow-hidden"
                  >
                    <AvatarImage
                      className="h-full w-full object-cover rounded-none"
                      src={profile?.avatar_url || undefined}
                      alt={profile?.name || 'Perfil'}
                    />
                    <AvatarFallback className="rounded-none bg-primary/10 text-primary text-[11px] font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </span>

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
