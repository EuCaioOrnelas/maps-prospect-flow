import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Users, DollarSign } from "lucide-react";

export function CRMTabs() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/crm", label: "Pipeline", icon: Users, exact: true },
    { to: "/crm/vendas", label: "Vendas & Receita", icon: DollarSign, exact: false },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border/50 px-3 sm:px-4 lg:px-6">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px",
              active
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
