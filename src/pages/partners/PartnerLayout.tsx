import { useEffect, useState } from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, DollarSign, Wallet, LogOut, Megaphone, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/partners/LevelBadge";
import wiizeLogo from "@/assets/logo-icon-new.png";

export default function PartnerLayout() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/partners/login", { replace: true }); return; }
      const { data } = await supabase.from("partners").select("id, full_name, email, level, referral_code").eq("user_id", user.id).maybeSingle();
      if (!data) { navigate("/partners/login", { replace: true }); return; }
      setPartner(data);
      setLoading(false);
    })();
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/partners/login", { replace: true });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>;

  const items = [
    { to: "/partners", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/partners/leads", label: "Meus leads", icon: Users },
    { to: "/partners/comissoes", label: "Comissões", icon: DollarSign },
    { to: "/partners/saques", label: "Saques", icon: Wallet },
    { to: "/partners/metas", label: "Metas", icon: Target },
    { to: "/partners/niveis", label: "Níveis", icon: Sparkles },
    { to: "/partners/materiais", label: "Materiais", icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-border bg-card flex flex-col z-40">
        <div className="px-5 py-5 border-b flex items-center gap-3">
          <img src={wiizeLogo} alt="Wiize" className="h-9 w-9 object-contain shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="text-base font-bold tracking-tight">Wiize</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5 uppercase tracking-wider">Partners</div>
          </div>
        </div>
        <div className="px-5 py-4 border-b space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium truncate flex-1">{partner.full_name}</div>
            <LevelBadge level={partner.level} size="sm" showLabel={false} />
          </div>
          <div className="text-xs text-muted-foreground truncate">{partner.email}</div>
          <NavLink to="/partners/niveis" className="block">
            <LevelBadge level={partner.level} size="md" className="w-full justify-center hover:scale-[1.02] transition-transform cursor-pointer" />
          </NavLink>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <it.icon size={16} /> {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={logout}>
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </aside>
      <main className="ml-64 min-h-screen">
        <Outlet context={{ partner }} />
      </main>
    </div>
  );
}
