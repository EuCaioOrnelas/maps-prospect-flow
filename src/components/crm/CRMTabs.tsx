import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutGrid, DollarSign } from "lucide-react";

export function CRMTabs() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/crm", label: "Pipeline", icon: LayoutGrid, exact: true },
    { to: "/crm/vendas", label: "Vendas & Receita", icon: DollarSign, exact: false },
  ];
  return (
    <div className="mt-4 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/50 p-0.5">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
              active
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn(
              "inline-flex items-center justify-center w-5 h-5 rounded-md",
              active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
            )}>
              <tab.icon className="w-3 h-3" />
            </span>
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
