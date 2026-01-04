import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Search,
  MessageSquare,
  BarChart3,
  Crown,
  User,
  LogOut,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface InternalHeaderProps {
  showCredits?: boolean;
  creditsUsed?: number;
  creditsLimit?: number;
  onShowWhatsAppUpgrade?: () => void;
}

export const InternalHeader = ({
  showCredits = true,
  creditsUsed = 0,
  creditsLimit = 10,
  onShowWhatsAppUpgrade,
}: InternalHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isTrialExpired, trialDaysRemaining } = useAuth();

  const isFreePlan = profile?.plan === "free" || !profile?.plan;
  const showTrialIndicator =
    isFreePlan && trialDaysRemaining > 0 && !isTrialExpired;

  const getPlanName = (plan: string) => {
    const planNames: Record<string, string> = {
      free: "Trial",
      start: "Start",
      growth: "Growth",
      scale: "Scale",
    };
    return planNames[plan] || "Trial";
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { href: "/dashboard", label: "Buscar Leads", icon: Search },
    { href: "/whatsapp", label: "Disparos WhatsApp", icon: MessageSquare, requiresPaid: true },
    { href: "/reports", label: "Relatórios", icon: BarChart3 },
    { href: "/profile", label: "Meu Perfil", icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/dashboard">
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {navItems.map((item) => {
              if (item.requiresPaid && isFreePlan) {
                return (
                  <button
                    key={item.href}
                    onClick={onShowWhatsAppUpgrade}
                    className={`flex items-center gap-2 text-sm transition-colors text-muted-foreground hover:text-foreground`}
                  >
                    <item.icon size={16} />
                    <span className="hidden lg:inline">{item.label}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon size={16} />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side - Credits & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Trial/Status indicators - Desktop only */}
            {showTrialIndicator && (
              <div
                className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${
                  trialDaysRemaining <= 3
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : trialDaysRemaining <= 7
                    ? "bg-warning/10 text-warning border border-warning/20"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                <Clock size={12} />
                <span>
                  {trialDaysRemaining === 1
                    ? "Último dia"
                    : `${trialDaysRemaining} dias`}
                </span>
              </div>
            )}

            {isTrialExpired && isFreePlan && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 flex-shrink-0">
                <AlertCircle size={12} />
                <span>Expirado</span>
              </div>
            )}

            {/* Credits indicator */}
            {showCredits && (
              <div className="flex items-center gap-1 sm:gap-2 text-xs flex-shrink-0">
                <Search size={12} className="text-muted-foreground" />
                <span className="text-primary font-semibold">{creditsUsed}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{creditsLimit}</span>
                <div className="hidden sm:block w-10 lg:w-12 h-1.5 bg-muted rounded-full overflow-hidden ml-1">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${(creditsUsed / creditsLimit) * 100}%`,
                    }}
                  />
                </div>
                <span className="hidden lg:inline text-[10px] text-muted-foreground ml-1 px-1.5 py-0.5 bg-secondary rounded">
                  {getPlanName(profile?.plan || "free")}
                </span>
              </div>
            )}

            {/* Upgrade button - Desktop */}
            {profile?.plan !== "scale" && (
              <Link to="/upgrade" className="hidden sm:block">
                <Button variant="default" size="sm" className="h-8 text-xs">
                  <Crown size={14} className="mr-1" />
                  <span className="hidden lg:inline">Upgrade</span>
                </Button>
              </Link>
            )}

            {/* Logout - Desktop */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hidden md:flex h-8 w-8"
              title="Sair"
            >
              <LogOut size={16} />
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8"
                >
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="flex items-center justify-between">
                    <Logo size="sm" />
                  </SheetTitle>
                </SheetHeader>

                <div className="p-4">
                  {/* Trial indicator in mobile */}
                  {showTrialIndicator && (
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-4 ${
                        trialDaysRemaining <= 3
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : trialDaysRemaining <= 7
                          ? "bg-warning/10 text-warning border border-warning/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      <Clock size={14} />
                      <span>
                        {trialDaysRemaining === 1
                          ? "Último dia de trial"
                          : `${trialDaysRemaining} dias restantes`}
                      </span>
                    </div>
                  )}

                  {isTrialExpired && isFreePlan && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 mb-4">
                      <AlertCircle size={14} />
                      <span>Trial expirado</span>
                    </div>
                  )}

                  {/* Credits in mobile */}
                  {showCredits && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 mb-4">
                      <span className="text-sm text-muted-foreground">
                        Buscas
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-semibold">
                          {creditsUsed}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">
                          {creditsLimit}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Navigation links */}
                  <nav className="space-y-1">
                    {navItems.map((item) => {
                      if (item.requiresPaid && isFreePlan) {
                        return (
                          <button
                            key={item.href}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              onShowWhatsAppUpgrade?.();
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                          >
                            <item.icon size={18} />
                            {item.label}
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            isActive(item.href)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <item.icon size={18} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="border-t border-border mt-4 pt-4 space-y-2">
                    {profile?.plan !== "scale" && (
                      <Link
                        to="/upgrade"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button variant="default" className="w-full">
                          <Crown size={16} className="mr-2" />
                          Fazer Upgrade
                        </Button>
                      </Link>
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={16} className="mr-2" />
                      Sair da conta
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
