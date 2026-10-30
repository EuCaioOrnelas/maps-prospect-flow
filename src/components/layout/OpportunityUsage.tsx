import { Link } from 'react-router-dom';
import { Search, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasOpportunitiesAccess,getPlanDisplayName } from '@/lib/planAccess';
import { opportunityQuota } from '@/lib/opportunityQuota';
import { Progress } from '@/components/ui/progress';
export function OpportunityUsage({expanded=true}:{expanded?:boolean}) {
 const {profile,isTrialing,trialDaysRemaining}=useAuth(); const quota=opportunityQuota(profile);
 // Menu recolhido: nenhum bloco aparece — os ícones soltos não correspondem aos itens de navegação.
 if (!expanded) return null;
 return <div className="w-full min-w-0 space-y-2">
  {hasOpportunitiesAccess(profile) && <Link to="/oportunidades" title="Oportunidades" className="block w-full min-w-0 py-2 text-muted-foreground">
   <div className="flex items-center gap-2 min-w-0"><Search className="h-4 w-4 shrink-0"/><span className="text-xs font-medium min-w-0">Oportunidades</span></div>
   <div className="mt-2 space-y-2 min-w-0">
    <p className="text-xs tabular-nums truncate"><strong className="text-foreground">{quota?.used.toLocaleString('pt-BR') ?? '—'}</strong> / {quota?.limit.toLocaleString('pt-BR') ?? '—'}</p>
    <Progress value={quota?.progress ?? 0} className="h-1"/>
    <p className="text-[11px] truncate">{profile ? getPlanDisplayName(profile) : '—'}</p>
   </div>
  </Link>}
  {isTrialing && <Link to="/profile" title="Gerenciar teste gratuito" className="flex items-center gap-2 min-w-0 text-xs text-primary"><Clock className="h-4 w-4 shrink-0"/><span className="truncate">{trialDaysRemaining} dias de teste · {profile?.trial_auto_charge_cancelled ? 'Cobrança cancelada' : 'Gerenciar'}</span></Link>}
 </div>;
}
