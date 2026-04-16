import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeSwitch from "@/components/ui/theme-switch";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Bot,
  Settings,
  Rocket,
  Shield,
  ChevronDown,
  BarChart3,
  AlertTriangle,
  FileText,
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
  Lock,
  ScrollText,
  ClipboardList,
  Receipt,
  ArrowLeft,
  PieChart,
  Activity,
} from "lucide-react";
import logoIconNew from "@/assets/logo-icon-new.png";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Painel Executivo",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "KPIs", href: "/admin/kpis", icon: BarChart3 },
      { label: "Alertas", href: "/admin/alertas", icon: AlertTriangle },
      { label: "Relatórios", href: "/admin/relatorios", icon: FileText },
    ],
  },
  {
    label: "Receita",
    icon: DollarSign,
    items: [
      { label: "Billing PIX", href: "/admin/pix-billing", icon: Receipt },
      { label: "Stripe", href: "/admin/stripe", icon: CreditCard },
      { label: "Assinaturas", href: "/admin/assinaturas", icon: ClipboardList },
      { label: "Churn", href: "/admin/churn", icon: TrendingUp },
      { label: "Forecast", href: "/admin/forecast", icon: PieChart },
    ],
  },
  {
    label: "Produto",
    icon: Users,
    items: [
      { label: "Usuários", href: "/admin/usuarios", icon: Users },
      { label: "Ativação", href: "/admin/ativacao", icon: UserCheck },
      { label: "Retenção", href: "/admin/retencao", icon: Activity },
      { label: "Score Leads", href: "/admin/score-leads", icon: Target },
      { label: "Landing Pages", href: "/admin/landing-pages", icon: Globe },
    ],
  },
  {
    label: "IA",
    icon: Bot,
    items: [
      { label: "Agentes IA", href: "/admin/ia/agentes", icon: Bot },
      { label: "Performance", href: "/admin/ia/performance", icon: Zap },
      { label: "Custos", href: "/admin/ia/custos", icon: DollarSign },
    ],
  },
  {
    label: "Operações",
    icon: Server,
    items: [
      { label: "APIs", href: "/admin/operacoes/apis", icon: Wifi },
      { label: "Proxies", href: "/admin/operacoes/proxies", icon: Server },
      { label: "Webhooks", href: "/admin/operacoes/webhooks", icon: Webhook },
    ],
  },
  {
    label: "Growth",
    icon: Rocket,
    items: [
      { label: "Growth Intel", href: "/admin/growth-intel", icon: Target },
      { label: "Emails", href: "/admin/email-tests", icon: Mail },
      { label: "Fluxos", href: "/admin/email-flows", icon: Workflow },
      { label: "Score Usuários", href: "/admin/user-scoring", icon: Trophy },
      { label: "Trial Automação", href: "/admin/trial-automation", icon: Zap },
      { label: "Testes", href: "/admin/tests", icon: FlaskConical },
    ],
  },
  {
    label: "Admin",
    icon: Shield,
    items: [
      { label: "Avisos", href: "/admin/announcements", icon: Bell },
      { label: "Termos", href: "/admin/termos", icon: ScrollText },
      { label: "Auditoria", href: "/admin/auditoria", icon: Lock },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach((section) => {
      if (section.items.some((item) => currentPath === item.href || currentPath.startsWith(item.href + "/"))) {
        initial[section.label] = true;
      }
    });
    initial["Painel Executivo"] = true;
    return initial;
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isItemActive = (href: string) => {
    if (href === "/admin") return currentPath === "/admin";
    return currentPath === href || currentPath.startsWith(href + "/");
  };

  return (
    <aside className="w-[260px] min-h-screen border-r border-border/40 bg-card/50 flex flex-col shrink-0">
      <div className="h-16 flex items-center px-5 border-b border-border/30">
        <Link to="/admin" className="flex items-center gap-2.5">
          <img src={logoIconNew} alt="Wiize" className="h-7 w-7" />
          <span className="font-semibold text-foreground text-[15px] tracking-tight">Wiize</span>
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">Admin</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV_SECTIONS.map((section) => {
          const isOpen = openSections[section.label] ?? false;
          const SectionIcon = section.icon;
          const hasActiveChild = section.items.some((item) => isItemActive(item.href));

          return (
            <div key={section.label}>
              <button
                onClick={() => toggleSection(section.label)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                  hasActiveChild
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <SectionIcon size={16} className={cn(hasActiveChild && "text-primary")} />
                <span className="flex-1 text-left">{section.label}</span>
                <ChevronDown
                  size={14}
                  className={cn("transition-transform duration-200", isOpen && "rotate-180")}
                />
              </button>

              {isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/30 pl-3">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = isItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                      >
                        <ItemIcon size={14} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border/30 p-3 space-y-2">
        <div className="flex items-center justify-between px-2.5 py-1">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Tema</span>
          <ThemeSwitch />
        </div>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao app</span>
        </Link>
      </div>
    </aside>
  );
}
