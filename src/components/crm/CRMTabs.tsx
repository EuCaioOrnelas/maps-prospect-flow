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
    <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 p-1">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all",
              active
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
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
