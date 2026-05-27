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
    <div className="flex items-center gap-2 mt-4">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium border transition-all",
              active
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
