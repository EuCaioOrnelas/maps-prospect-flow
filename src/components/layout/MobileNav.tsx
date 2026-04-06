import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, BarChart3, Megaphone, Crown, Clock, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface MobileNavProps {
  profile?: {
    plan?: string;
    trial_start_at?: string | null;
  } | null;
  onWhatsAppClick?: () => void;
}

export const MobileNav = ({ profile, onWhatsAppClick }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();

  const isFreePlan = !profile?.plan || profile.plan === 'free';

  // Calculate trial days
  const getTrialDaysRemaining = () => {
    if (!profile?.trial_start_at || !isFreePlan) return 0;
    const trialStart = new Date(profile.trial_start_at);
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 14);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  const trialDaysRemaining = getTrialDaysRemaining();
  const showTrialIndicator = isFreePlan && profile?.trial_start_at && trialDaysRemaining > 0;
  const isTrialExpired = isFreePlan && profile?.trial_start_at && trialDaysRemaining <= 0;

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'start': return 'Start';
      case 'growth': return 'Growth';
      case 'scale': return 'Scale';
      default: return 'Free';
    }
  };

  return (
    <div className="lg:hidden">
      {/* Hamburger button */}
      <button
        className="p-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full bg-card/95 backdrop-blur-sm border-b border-border animate-fade-in z-50">
          <div className="container mx-auto px-3 py-4">
            <div className="flex flex-col gap-3">
              {/* Trial/Plan indicators */}
              {showTrialIndicator && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  trialDaysRemaining <= 3 
                    ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                    : trialDaysRemaining <= 7 
                      ? 'bg-warning/10 text-warning border border-warning/20'
                      : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  <Clock size={14} />
                  <span>
                    {trialDaysRemaining === 1 
                      ? 'Último dia de trial' 
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

              {/* Plan badge */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Plano:</span>
                <span className="font-medium text-foreground">{getPlanName(profile?.plan || 'free')}</span>
              </div>

              {/* Navigation links */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Link to="/whatsapp" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Megaphone size={16} />
                    Campanhas
                  </Button>
                </Link>

                <Link to="/crm" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Users size={16} />
                    CRM Pipeline
                  </Button>
                </Link>

                <Link to="/crm/score" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <BarChart3 size={16} />
                    CRM Score
                  </Button>
                </Link>

                <Link to="/chat" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Users size={16} />
                    Chat
                  </Button>
                </Link>

                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <BarChart3 size={16} />
                    Dashboard
                  </Button>
                </Link>


                {profile?.plan !== 'scale' && (
                  <Link to="/upgrade" onClick={() => setIsOpen(false)}>
                    <Button variant="default" size="sm" className="w-full justify-start gap-2">
                      <Crown size={16} />
                      Fazer Upgrade
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
