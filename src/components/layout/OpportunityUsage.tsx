import { Link } from 'react-router-dom';
import { Search, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasOpportunitiesAccess,getPlanDisplayName } from '@/lib/planAccess';
import { opportunityQuota } from '@/lib/opportunityQuota';
import { Progress } from '@/components/ui/progress';
export function OpportunityUsage({expanded=true}:{expanded?:boolean}) {
 const {profile,isTrialing,trialDaysRemaining}=useAuth(); const quota=opportunityQuota(profile);
 return <div className="space-y-2 px-1">{hasOpportunitiesAccess(profile) && <Link to="/oportunidades" title="Oportunidades" className="block py-2 text-muted-foreground"><div className="flex items-center gap-2"><Search className="h-4 w-4 shrink-0"/>{expanded && <span className="text-xs font-medium">Oportunidades</span>}</div>{expanded && <div className="mt-2 space-y-2"><p className="text-xs tabular-nums"><strong className="text-foreground">{quota?.used.toLocaleString('pt-BR') ?? '—'}</strong> / {quota?.limit.toLocaleString('pt-BR') ?? '—'}</p><Progress value={quota?.progress ?? 0} className="h-1"/><p className="text-[11px]">{profile ? getPlanDisplayName(profile) : '—'}</p></div>}</Link>}{isTrialing && <Link to="/profile" title="Gerenciar teste gratuito" className="flex items-center gap-2 text-xs text-primary"><Clock className="h-4 w-4 shrink-0"/>{expanded && <span>{trialDaysRemaining} dias de teste · {profile?.trial_auto_charge_cancelled ? 'Cobrança cancelada' : 'Gerenciar'}</span>}</Link>}</div>;
}
