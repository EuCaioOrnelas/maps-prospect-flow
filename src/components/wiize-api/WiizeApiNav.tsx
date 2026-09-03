import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  KeyRound,
  Wallet,
  BarChart3,
  BookOpen,
  CreditCard,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import wiizeLogo from "@/assets/logo-icon-new.png";

export const wiizeApiNavItems = [
  { to: "/api/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/api/apis", label: "APIs", icon: Boxes },
  { to: "/api/keys", label: "API Keys", icon: KeyRound },
  { to: "/api/credits", label: "Credits", icon: Wallet },
  { to: "/api/usage", label: "Usage", icon: BarChart3 },
  { to: "/api/docs", label: "Documentation", icon: BookOpen },
  { to: "/api/billing", label: "Billing", icon: CreditCard },
  { to: "/api/settings", label: "Settings", icon: Settings },
];

/**
 * Navegação do Wiize API — mesma linguagem visual do navbar interno da Wiize
 * (marca no topo, itens com ícone + label, estado ativo em primary/10).
 */
export function WiizeApiNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <img src={wiizeLogo} alt="Wiize" className="h-9 w-9 shrink-0 object-contain" />
        <div className="min-w-0 leading-tight">
          <div className="text-base font-bold tracking-tight">Wiize</div>
          <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            API
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {wiizeApiNavItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <it.icon size={17} strokeWidth={1.75} className="shrink-0" />
            <span className="truncate">{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Voltar para Wiize
        </NavLink>
      </div>
    </div>
  );
}
