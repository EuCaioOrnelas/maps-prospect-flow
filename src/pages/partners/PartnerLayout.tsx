import { useEffect, useMemo, useState } from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Coins,
  LogOut,
  Megaphone,
  Target,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LevelBadge, LEVEL_META, type PartnerLevel } from "@/components/partners/LevelBadge";
import wiizeLogo from "@/assets/logo-icon-new.png";

const LEVEL_ORDER: PartnerLevel[] = ["bronze", "silver", "gold", "platinum"];

export default function PartnerLayout() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeClients, setActiveClients] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/partners/login", { replace: true }); return; }
      const { data } = await supabase
        .from("partners")
        .select("id, full_name, email, level, referral_code, verification_code, status, created_at, custom_commission_percent")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) { navigate("/partners/login", { replace: true }); return; }
      setPartner(data);

      const [sRes, leadsRes] = await Promise.all([
        supabase.from("partner_settings").select("*").eq("id", 1).maybeSingle(),
        supabase
          .from("partner_leads")
          .select("id, is_paid, is_cancelled")
          .eq("partner_id", data.id),
      ]);
      setSettings(sRes.data);
      setActiveClients((leadsRes.data || []).filter((l: any) => l.is_paid && !l.is_cancelled).length);
      setLoading(false);
    })();
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/partners/login", { replace: true });
  };

  const { currentCommission, nextTier, progressPct, clientsRemaining } = useMemo(() => {
    if (!partner || !settings) {
      return { currentCommission: 0, nextTier: null as any, progressPct: 0, clientsRemaining: 0 };
    }
    const lvl = (partner.level || "bronze") as PartnerLevel;
    const tiers = [
      { key: "bronze" as PartnerLevel, threshold: 0, percent: Number(settings.bronze_commission_percent) },
      { key: "silver" as PartnerLevel, threshold: settings.silver_threshold_clients, percent: Number(settings.silver_commission_percent) },
      { key: "gold" as PartnerLevel, threshold: settings.gold_threshold_clients, percent: Number(settings.gold_commission_percent) },
      { key: "platinum" as PartnerLevel, threshold: settings.platinum_threshold_clients ?? Math.max(settings.gold_threshold_clients * 2, 500), percent: Number(settings.platinum_commission_percent) },
    ];
    const idx = LEVEL_ORDER.indexOf(lvl);
    const cur = tiers[idx];
    const next = tiers[idx + 1] ?? null;
    const eff = partner.custom_commission_percent != null
      ? Number(partner.custom_commission_percent)
      : cur?.percent ?? 0;
    const pct = next ? Math.min(100, (activeClients / Math.max(1, next.threshold)) * 100) : 100;
    const rem = next ? Math.max(0, next.threshold - activeClients) : 0;
    return { currentCommission: eff, nextTier: next, progressPct: pct, clientsRemaining: rem };
  }, [partner, settings, activeClients]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  const items = [
    { to: "/partners", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/partners/leads", label: "Meus leads", icon: Users },
    { to: "/partners/comissoes", label: "Comissões", icon: Coins },
    { to: "/partners/saques", label: "Saques", icon: Wallet },
    { to: "/partners/metas", label: "Metas", icon: Target },
    { to: "/partners/niveis", label: "Níveis & progresso", icon: Sparkles },
    { to: "/partners/materiais", label: "Materiais", icon: Megaphone },
  ];

  const currentMeta = LEVEL_META[(partner.level || "bronze") as PartnerLevel] ?? LEVEL_META.bronze;
  const initial = (partner.full_name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-border bg-card flex flex-col z-40">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-border flex items-center gap-3">
          <img src={wiizeLogo} alt="Wiize" className="h-9 w-9 object-contain shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="text-base font-bold tracking-tight">Wiize</div>
            <div className="text-[10px] text-muted-foreground -mt-0.5 uppercase tracking-[0.18em] font-semibold">Partners</div>
          </div>
        </div>

        {/* Profile + level snapshot */}
        <NavLink
          to="/partners/niveis"
          className="block px-4 py-4 border-b border-border hover:bg-muted/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="h-10 w-10 rounded-[11px] bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-border flex items-center justify-center text-sm font-bold text-foreground">
                {initial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-[2px] bg-card ring-2 ring-card flex items-center justify-center">
                <currentMeta.icon size={9} className={cn(currentMeta.fg.replace("text-", "text-"), "stroke-[2.5]")} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate leading-tight">{partner.full_name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{partner.email}</div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-primary/25 bg-gradient-to-br from-primary/[0.10] via-primary/[0.04] to-transparent p-2.5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <LevelBadge level={partner.level} size="sm" />
              <div className="text-right leading-tight">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Comissão</div>
                <div className="text-sm font-bold text-primary">{currentCommission.toFixed(0)}%</div>
              </div>
            </div>

            {nextTier ? (
              <div className="space-y-1.5">
                <Progress value={progressPct} className="h-1.5 bg-primary/15 [&>div]:bg-primary" />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp size={10} className="text-primary" />
                    {clientsRemaining > 0
                      ? <>Faltam <span className="text-foreground font-semibold">{clientsRemaining}</span></>
                      : <span className="text-foreground font-semibold">Meta atingida</span>}
                  </span>
                  <span className="font-semibold text-primary">→ {LEVEL_META[nextTier.key].label}</span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-primary font-semibold text-center">
                Topo da carreira atingido
              </div>
            )}
          </div>
        </NavLink>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <it.icon size={17} strokeWidth={1.75} className="shrink-0" />
              <span className="truncate">{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut size={16} strokeWidth={1.75} /> Sair
          </Button>
        </div>
      </aside>
      <main className="ml-64 min-h-screen">
        <Outlet context={{ partner }} />
      </main>
    </div>
  );
}
