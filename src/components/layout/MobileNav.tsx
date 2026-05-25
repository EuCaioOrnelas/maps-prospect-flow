import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  X,
  BarChart3,
  Megaphone,
  Crown,
  Clock,
  AlertCircle,
  Users,
  LayoutDashboard,
  Send,
  Bot,
  Search,
  Handshake,
  Trophy,
  MessageCircle,
  Workflow,
  Flame,
  Bell,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { profileHasFeature, type FeatureKey } from "@/lib/featurePermissions";
import { planHasFeature } from "@/lib/planAccess";
import { isLegacyEvolutionUser } from "@/lib/legacyAccess";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  profile?: {
    plan?: string;
    trial_start_at?: string | null;
    trial_auto_charge_cancelled?: boolean | null;
  } | null;
  onWhatsAppClick?: () => void;
}

type SectionKey = "dashboard" | "oportunidades" | "campanhas" | "crm" | "automacao";

export const MobileNav = ({ profile, onWhatsAppClick }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const { trialDaysRemaining, isTrialing, profile: authProfile } = useAuth();
  const { isAdmin } = useAdminCheck();
  const can = (key: FeatureKey) =>
    isAdmin ||
    (profileHasFeature(authProfile as any, key) && planHasFeature(authProfile as any, key));
  const canEvolution = isAdmin || isLegacyEvolutionUser(authProfile as any);

  const isFreePlan = !profile?.plan || profile.plan === "free";
  const showTrialIndicator = isTrialing && trialDaysRemaining > 0;
  const isTrialExpired = isFreePlan && profile?.trial_start_at && trialDaysRemaining <= 0;

  const close = () => {
    setIsOpen(false);
    setOpenSection(null);
  };

  const toggleSection = (key: SectionKey) =>
    setOpenSection((prev) => (prev === key ? null : key));

  const getPlanName = (plan: string) => {
    switch (plan) {
      case "start": return "Start";
      case "growth": return "Growth";
      case "scale": return "Scale";
      default: return "Free";
    }
  };

  const SectionHeader = ({
    icon: Icon,
    label,
    sectionKey,
  }: {
    icon: typeof LayoutDashboard;
    label: string;
    sectionKey: SectionKey;
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center w-full gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
      <ChevronDown
        size={14}
        className={cn(
          "transition-transform",
          openSection === sectionKey && "rotate-180"
        )}
      />
    </button>
  );

  const SubLink = ({
    to,
    icon: Icon,
    label,
  }: {
    to: string;
    icon: typeof LayoutDashboard;
    label: string;
  }) => (
    <Link
      to={to}
      onClick={close}
      className="flex items-center gap-2 pl-9 pr-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
    >
      <Icon size={14} />
      {label}
    </Link>
  );

  const TopLink = ({
    to,
    icon: Icon,
    label,
    highlight,
  }: {
    to: string;
    icon: typeof LayoutDashboard;
    label: string;
    highlight?: boolean;
  }) => (
    <Link to={to} onClick={close}>
      <Button
        variant={highlight ? "default" : "ghost"}
        size="sm"
        className="w-full justify-start gap-2"
      >
        <Icon size={16} />
        {label}
      </Button>
    </Link>
  );

  return (
    <div className="lg:hidden">
      <button
        className="p-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir menu"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full bg-card/95 backdrop-blur-sm border-b border-border animate-fade-in z-50 max-h-[calc(100vh-57px)] overflow-y-auto">
          <div className="container mx-auto px-3 py-4">
            <div className="flex flex-col gap-3">
              {showTrialIndicator && (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                    trialDaysRemaining <= 3
                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                      : trialDaysRemaining <= 7
                        ? "bg-warning/10 text-warning border border-warning/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                  )}
                >
                  <Clock size={14} />
                  <span>
                    {trialDaysRemaining === 1
                      ? "Último dia de trial"
                      : `${trialDaysRemaining} dias restantes`}
                  </span>
                </div>
              )}

              {isTrialExpired && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertCircle size={14} />
                  <span>Trial expirado</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Plano:</span>
                <span className="font-medium text-foreground">
                  {getPlanName(profile?.plan || "free")}
                </span>
              </div>

              <div className="flex flex-col gap-1 pt-2 border-t border-border">
                {/* Dashboard - single link, no submenu */}
                <TopLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />


                {/* Oportunidades */}
                {can("oportunidades") && (
                  <>
                    <SectionHeader icon={Search} label="Oportunidades" sectionKey="oportunidades" />
                    {openSection === "oportunidades" && (
                      <div className="flex flex-col">
                        <SubLink to="/oportunidades" icon={Search} label="Buscar" />
                        <SubLink to="/oportunidades/gestao" icon={BarChart3} label="Gestão" />
                      </div>
                    )}
                  </>
                )}

                {/* Campanha — Evolution só para usuários legacy */}
                {can("campaigns") && canEvolution && (
                  <>
                    <SectionHeader icon={Megaphone} label="Campanha" sectionKey="campanhas" />
                    {openSection === "campanhas" && (
                      <div className="flex flex-col">
                        <SubLink to="/whatsapp" icon={Send} label="Prospecção" />
                        
                      </div>
                    )}
                  </>
                )}

                {/* CRM */}
                {can("crm") && (
                  <>
                    <SectionHeader icon={Users} label="CRM" sectionKey="crm" />
                    {openSection === "crm" && (
                      <div className="flex flex-col">
                        <SubLink to="/crm" icon={Users} label="Pipeline" />
                        <SubLink to="/crm/score" icon={Trophy} label="Score" />
                      </div>
                    )}
                  </>
                )}

                {/* Chat */}
                {can("chat") && (
                  <TopLink to="/chat" icon={MessageCircle} label="Chat" />
                )}

                {/* Automação */}
                {(can("flows") || can("agents") || can("warming")) && (
                  <>
                    <SectionHeader icon={Workflow} label="Automação" sectionKey="automacao" />
                    {openSection === "automacao" && (
                      <div className="flex flex-col">
                        {can("flows") && <SubLink to="/fluxos" icon={Workflow} label="Fluxos" />}
                        {can("agents") && <SubLink to="/agents" icon={Bot} label="Agentes IA" />}
                        {can("warming") && <SubLink to="/warming" icon={Flame} label="Aquecimento" />}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1 pt-2 border-t border-border">
                <TopLink to="/ajuda" icon={HelpCircle} label="Central de Ajuda" />
                {profile?.plan !== "scale" && (
                  <TopLink to="/upgrade" icon={Crown} label="Fazer Upgrade" highlight />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
