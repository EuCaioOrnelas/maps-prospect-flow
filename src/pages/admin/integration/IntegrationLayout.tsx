import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BookOpen, Boxes, Radio, Filter, Shield, Gauge, ScrollText,
  PlayCircle, History, AlertOctagon, Layers, Rocket, Fingerprint,
} from "lucide-react";

const NAV = [
  { to: ".", label: "Visão geral", icon: BookOpen, end: true },
  { to: "developer-center", label: "Developer Center", icon: Rocket },
  { to: "hmac", label: "Assinatura HMAC", icon: Fingerprint },
  { to: "registry", label: "Provider Registry", icon: Layers },
  { to: "providers", label: "Providers", icon: Boxes },
  { to: "endpoints", label: "Endpoints", icon: Radio },
  { to: "filters", label: "Filtros", icon: Filter },
  { to: "errors", label: "Erros", icon: AlertOctagon },
  { to: "security", label: "Segurança", icon: Shield },
  { to: "rate-limits", label: "Rate Limits", icon: Gauge },
  { to: "audit", label: "Auditoria", icon: ScrollText },
  { to: "playground", label: "Playground", icon: PlayCircle },
  { to: "changelog", label: "Changelog", icon: History },
];

export default function IntegrationLayout() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-6 p-6">
      <aside className="w-60 shrink-0 border-r border-border pr-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Integration Layer</h2>
          <p className="text-xs text-muted-foreground">Developer Portal · v1</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
