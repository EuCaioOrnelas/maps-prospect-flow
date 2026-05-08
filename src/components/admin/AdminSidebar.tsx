import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import ThemeSwitch from "@/components/ui/theme-switch";
import logoIconNew from "@/assets/logo-icon-new.png";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Bot,
  Rocket,
  Shield,
  CreditCard,
  TrendingUp,
  UserCheck,
  Zap,
  Globe,
  Server,
  Wifi,
  Webhook,
  Mail,
  Workflow,
  FlaskConical,
  Trophy,
  Target,
  Bell,
  ScrollText,
  Lock,
  Receipt,
  ArrowLeft,
  PieChart,
  Activity,
  FileText,
  ClipboardList,
  Handshake,
  Users2,
  TrendingUp as TrendingUpIcon,
  Wallet as WalletIcon,
  CheckCircle2,
  Settings as SettingsIcon,
  Award,
  LifeBuoy,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Receita",
    icon: DollarSign,
    items: [
      { title: "Billing", url: "/admin/pix-billing", icon: Receipt },
      
      { title: "Assinaturas", url: "/admin/assinaturas", icon: FileText },
      { title: "Auditoria MRR", url: "/admin/mrr-audit", icon: ClipboardList },
      { title: "Churn", url: "/admin/churn", icon: TrendingUp },
      { title: "Forecast", url: "/admin/forecast", icon: PieChart },
    ],
  },
  {
    title: "Produto",
    icon: Users,
    items: [
      { title: "Usuários", url: "/admin/usuarios", icon: Users },
      { title: "Ativação", url: "/admin/ativacao", icon: UserCheck },
      { title: "Retenção", url: "/admin/retencao", icon: Activity },
      { title: "Onboarding", url: "/admin/onboarding", icon: ClipboardList },
      { title: "Landing Pages", url: "/admin/landing-pages", icon: Globe },
    ],
  },
  {
    title: "IA",
    icon: Bot,
    items: [
      { title: "Agentes IA", url: "/admin/ia/agentes", icon: Bot },
      { title: "Performance", url: "/admin/ia/performance", icon: Zap },
      { title: "Custos", url: "/admin/ia/custos", icon: DollarSign },
    ],
  },
  {
    title: "Operações",
    icon: Server,
    items: [
      { title: "APIs", url: "/admin/operacoes/apis", icon: Wifi },
      { title: "Proxies", url: "/admin/operacoes/proxies", icon: Server },
      { title: "Webhooks", url: "/admin/operacoes/webhooks", icon: Webhook },
    ],
  },
  {
    title: "Growth",
    icon: Rocket,
    items: [
      { title: "Growth Intel", url: "/admin/growth-intel", icon: Target },
      { title: "Emails", url: "/admin/email-tests", icon: Mail },
      { title: "Fluxos", url: "/admin/email-flows", icon: Workflow },
      { title: "Score Usuários", url: "/admin/user-scoring", icon: Trophy },
      { title: "Trial Automação", url: "/admin/trial-automation", icon: Zap },
      { title: "Testes", url: "/admin/tests", icon: FlaskConical },
    ],
  },
  {
    title: "Partners",
    icon: Handshake,
    items: [
      { title: "Dashboard", url: "/admin/partners", icon: LayoutDashboard },
      { title: "Candidaturas", url: "/admin/partners/candidaturas", icon: ClipboardList },
      { title: "Parceiros", url: "/admin/partners/parceiros", icon: Users2 },
      { title: "Leads Indicados", url: "/admin/partners/leads", icon: TrendingUpIcon },
      { title: "Vendas / Comissões", url: "/admin/partners/vendas", icon: DollarSign },
      { title: "Saques", url: "/admin/partners/saques", icon: WalletIcon },
      { title: "Pagamentos", url: "/admin/partners/pagamentos", icon: CheckCircle2 },
      { title: "Metas", url: "/admin/partners/metas", icon: Target },
      { title: "Links Campanha", url: "/admin/partners/links", icon: Workflow },
      { title: "Materiais", url: "/admin/partners/materiais", icon: FileText },
      { title: "Configurações", url: "/admin/partners/configuracoes", icon: SettingsIcon },
    ],
  },
  {
    title: "Admin",
    icon: Shield,
    items: [
      { title: "Avisos", url: "/admin/announcements", icon: Bell },
      { title: "Termos", url: "/admin/termos", icon: ScrollText },
      { title: "Auditoria", url: "/admin/auditoria", icon: Lock },
    ],
  },
];

export function AdminSidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const currentPath = location.pathname;
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-open section containing active route
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach((section) => {
      if (section.items.some((item) => isItemActive(item.url))) {
        initial[section.title] = true;
      }
    });
    setOpenSections(initial);
  }, [currentPath]);

  useEffect(() => {
    if (isHovered) {
      expandTimeoutRef.current = setTimeout(() => setIsExpanded(true), 50);
    } else {
      if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
      setIsExpanded(false);
    }
    return () => {
      if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
    };
  }, [isHovered]);

  const isItemActive = (url: string) => {
    if (url === "/admin") return currentPath === "/admin";
    return currentPath === url || currentPath.startsWith(url + "/");
  };

  const toggleSection = (title: string) => {
    if (isExpanded) {
      setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      className="fixed left-0 top-0 h-screen z-[60] flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <aside
        className={cn(
          "h-full bg-sidebar border-r border-sidebar-border flex flex-col",
          "transition-[width] duration-300 ease-out overflow-hidden",
          isHovered ? "w-60" : "w-[72px]"
        )}
      >
        {/* Logo */}
        <div className="h-[58px] min-h-[58px] flex items-center border-b border-sidebar-border px-4">
          <Link to="/admin" className="flex items-center gap-0 h-12 group cursor-pointer">
            <img
              src={logoIconNew}
              alt="Wiize"
              className="h-10 w-10 object-contain rounded-lg transition-all duration-200 ease-out group-hover:scale-105 shrink-0"
            />
            <span
              className={cn(
                "tracking-tight text-foreground whitespace-nowrap transition-all duration-200 ease-out flex items-center gap-2",
                isHovered ? "opacity-100 translate-x-0 text-[1.5rem]" : "opacity-0 -translate-x-2 w-0 overflow-hidden"
              )}
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 500, lineHeight: 1 }}
            >
              wiize
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                Admin
              </span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 px-4">
            {/* Dashboard - top level */}
            <li>
              <SidebarNavItem
                title="Cockpit"
                icon={LayoutDashboard}
                url="/admin"
                isActive={currentPath === "/admin"}
                isExpanded={isExpanded}
                tooltip="Cockpit Executivo"
              />
            </li>

            {/* Sections */}
            {NAV_SECTIONS.map((section) => {
              const isOpen = openSections[section.title] ?? false;
              const hasActiveChild = section.items.some((item) => isItemActive(item.url));

              return (
                <li key={section.title}>
                  <SidebarNavItem
                    title={section.title}
                    icon={section.icon}
                    onClick={() => toggleSection(section.title)}
                    isActive={hasActiveChild}
                    isExpanded={isExpanded}
                    hasSubmenu
                    isSubmenuOpen={isOpen}
                    tooltip={section.title}
                  />

                  {isExpanded && (
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        isOpen ? "max-h-[600px] opacity-100 mt-1" : "max-h-0 opacity-0"
                      )}
                    >
                      <ul className="pl-4 space-y-0.5 relative before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-foreground/10 before:rounded-full">
                        {section.items.map((item) => {
                          const active = isItemActive(item.url);
                          return (
                            <li key={item.url}>
                              <Link
                                to={item.url}
                                className={cn(
                                  "flex items-center gap-3 px-2.5 h-10 rounded-lg transition-colors duration-200 text-[14px]",
                                  active
                                    ? "bg-sidebar-accent/60 text-primary font-medium"
                                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                )}
                              >
                                <item.icon size={18} className="shrink-0" />
                                <span className="whitespace-nowrap truncate">{item.title}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="py-4 border-t border-sidebar-border">
          <ul className="space-y-1 px-4">
            <li className="flex items-center justify-center px-2.5 py-1">
              {isExpanded ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Tema</span>
                  <ThemeSwitch />
                </div>
              ) : (
                <ThemeSwitch className="[&_[role=switch]]:h-6 [&_[role=switch]]:w-10 [&_[role=switch]>span]:h-5 [&_[role=switch]>span]:w-5 [&_[role=switch]]:data-[state=checked]:[&>span]:translate-x-[16px] [&_.absolute]:hidden" />
              )}
            </li>
            <li>
              <SidebarNavItem
                title="Voltar ao app"
                icon={ArrowLeft}
                url="/dashboard"
                isActive={false}
                isExpanded={isExpanded}
                tooltip="Voltar ao app"
              />
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
