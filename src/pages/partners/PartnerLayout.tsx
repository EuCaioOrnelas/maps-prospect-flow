import { useEffect, useState } from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, DollarSign, Wallet, Building2, LogOut, Award, Megaphone, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import wiizeLogo from "@/assets/logos/wiize-logo.png";

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
    { to: "/partners/materiais", label: "Materiais", icon: Megaphone },
    { to: "/partners/ranking", label: "Ranking", icon: Trophy },
    { to: "/partners/banco", label: "Dados bancários", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="px-5 py-5 border-b flex items-center gap-3">
          <img src={wiizeLogo} alt="Wiize" className="h-9 w-9 object-contain shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="text-base font-bold tracking-tight">Wiize</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5 uppercase tracking-wider">Partners</div>
          </div>
        </div>
        <div className="px-5 py-4 border-b">
          <div className="text-sm font-medium truncate">{partner.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">{partner.email}</div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary">
            <Award size={12} /> <span className="capitalize">{partner.level}</span>
          </div>
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
      <main className="flex-1 overflow-auto">
        <Outlet context={{ partner }} />
      </main>
    </div>
  );
}
