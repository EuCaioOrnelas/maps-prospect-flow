import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  KeyRound,
  BarChart3,
  BookOpen,
  CreditCard,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import wiizeLogo from "@/assets/logo-icon-new.png";

export const wiizeApiNavItems: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/api/dashboard", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/api/keys", label: "Chaves de API", icon: KeyRound },
  { to: "/api/usage", label: "Consumo", icon: BarChart3 },
  { to: "/api/billing", label: "Cobrança", icon: CreditCard },
  { to: "/api/docs", label: "Documentação da API", icon: BookOpen },
];

interface WiizeApiNavProps {
  /** Rail expandido (hover no desktop, sempre true no mobile). */
  isExpanded: boolean;
  email?: string | null;
  name?: string | null;
  onNavigate?: () => void;
  onLogout?: () => void;
}

/**
 * Navegação do Wiize API — mesma linguagem do sidebar interno da Wiize:
 * rail colapsado que expande no hover, item ativo em primary/10 e
 * perfil logo abaixo de Configurações.
 */
export function WiizeApiNav({ isExpanded, email, name, onNavigate, onLogout }: WiizeApiNavProps) {
  const { pathname } = useLocation();
  const initials = (name || email || "?").trim().charAt(0).toUpperCase();

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Marca */}
      <div className="flex h-[58px] min-h-[58px] items-center px-4">
        <Link to="/api/dashboard" onClick={onNavigate} className="flex items-center gap-0">
          <img src={wiizeLogo} alt="Wiize" className="h-9 w-9 shrink-0 rounded-hover object-contain" />
          <span
            className={cn(
              "ml-2 flex flex-col leading-tight transition-all duration-200 ease-out",
              isExpanded ? "translate-x-0 opacity-100" : "ml-0 w-0 -translate-x-2 overflow-hidden opacity-0",
            )}
          >
            <span className="whitespace-nowrap text-sm font-bold tracking-tight">Wiize</span>
            <span className="-mt-0.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              API
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <ul className="space-y-1 px-4">
          {wiizeApiNavItems.map((it) => (
            <li key={it.to} onClick={onNavigate}>
              <SidebarNavItem
                title={it.label}
                icon={it.icon}
                url={it.to}
                isActive={isActive(it.to, it.end)}
                isExpanded={isExpanded}
                tooltip={it.label}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border py-3">
        <ul className="space-y-1 px-4">
          <li onClick={onNavigate}>
            <SidebarNavItem
              title="Configurações"
              icon={Settings}
              url="/api/settings"
              isActive={isActive("/api/settings")}
              isExpanded={isExpanded}
              tooltip="Configurações"
            />
          </li>

          {/* Perfil — logo abaixo de Configurações, avatar quadrado arredondado */}
          <li>
            <Link
              to="/api/settings"
              onClick={onNavigate}
              className={cn(
                "relative flex h-10 items-center justify-start overflow-hidden rounded-hover transition-[background-color,color,width] duration-300 ease-out",
                isExpanded ? "w-full pl-12 pr-2.5" : "w-10",
                "text-sidebar-foreground/60 hover:bg-primary/[0.07] hover:text-primary",
              )}
            >
              <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-hover bg-primary/10 text-[11px] font-semibold text-primary">
                  {initials}
                </span>
              </span>
              {isExpanded && (
                <span className="flex-1 truncate whitespace-nowrap text-sm">{name || email || "Minha conta"}</span>
              )}
            </Link>
          </li>

          {onLogout && (
            <li>
              <button
                type="button"
                onClick={onLogout}
                title="Sair"
                aria-label="Sair"
                className={cn(
                  "relative flex h-10 items-center justify-start overflow-hidden rounded-hover transition-[background-color,color,width] duration-300 ease-out",
                  isExpanded ? "w-full pl-12 pr-2.5" : "w-10",
                  "text-sidebar-foreground/60 hover:bg-destructive/[0.07] hover:text-destructive",
                )}
              >
                <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center">
                  <LogOut size={18} strokeWidth={1.75} />
                </span>
                {isExpanded && (
                  <span className="flex-1 truncate whitespace-nowrap text-sm">Sair</span>
                )}
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
