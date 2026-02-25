import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Smartphone,
  TrendingUp,
  Settings,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calculator,
  BarChart3,
  UserCheck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import logoIconNew from "@/assets/logo-icon-new.png";

const navItems = [
  { title: "Painel Geral", url: "/revenue", icon: LayoutDashboard },
  { title: "Leads", url: "/revenue/leads", icon: Users },
  { title: "Tendências", url: "/revenue/trends", icon: BarChart3 },
  { title: "Projeções", url: "/revenue/insights", icon: TrendingUp },
  { title: "Simulador", url: "/revenue/simulator", icon: Calculator },
  { title: "Relatórios", url: "/revenue/report", icon: FileText },
  { title: "Números", url: "/revenue/numbers", icon: Smartphone },
  { title: "Equipe", url: "/revenue/team", icon: UserCheck },
  { title: "Configurações", url: "/revenue/settings", icon: Settings },
];

export const RevenueSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const currentPath = location.pathname;

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-[width] duration-300 ease-out shrink-0",
        collapsed ? "w-[68px]" : "w-56"
      )}
    >
      {/* Header */}
      <div className="h-[58px] min-h-[58px] flex items-center border-b border-sidebar-border px-3 justify-between">
        <Link to="/revenue" className="flex items-center gap-1.5 group">
          <img
            src={logoIconNew}
            alt="Wiize"
            className="h-9 w-9 object-contain rounded-lg shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span
                className="text-base font-semibold text-foreground"
                style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
              >
                Revenue
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Inteligência de Receita
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive =
              item.url === "/revenue"
                ? currentPath === "/revenue"
                : currentPath.startsWith(item.url);

            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && (
                    <span className="whitespace-nowrap truncate">
                      {item.title}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="py-3 border-t border-sidebar-border px-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <ArrowLeft size={18} className="shrink-0" />
          {!collapsed && <span>Voltar ao Wiize</span>}
        </Link>
      </div>
    </aside>
  );
};
