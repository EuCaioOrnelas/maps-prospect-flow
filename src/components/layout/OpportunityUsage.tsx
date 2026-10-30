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
 const usage = quota
  ? <span className="tabular-nums"><span className="font-semibold text-foreground">{quota.used.toLocaleString('pt-BR')}</span><span className="text-muted-foreground/80"> / {quota.limit.toLocaleString('pt-BR')}</span></span>
  : <span className="text-muted-foreground/80 tabular-nums">— / —</span>;
 return <div className="w-full min-w-0 space-y-1.5">
  {hasOpportunitiesAccess(profile) && <Link
   to="/oportunidades"
   title="Oportunidades"
   aria-label={`Oportunidades — ${quota ? `${quota.used} de ${quota.limit} utilizadas` : 'consumo'}`}
   className="group block w-full min-w-0 rounded-lg border bg-muted/40 px-2.5 py-2 transition-colors hover:border-border hover:bg-muted/70"
  >
   <div className="flex items-center justify-between gap-2 min-w-0">
    <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
     <Search className="h-3.5 w-3.5 shrink-0 opacity-70"/>
     Oportunidades
    </span>
    <span className="shrink-0 text-[11px]">{usage}</span>
   </div>
   <div className="mt-1.5 flex items-center gap-2 min-w-0">
    <Progress value={quota?.progress ?? 0} className="h-1 flex-1"/>
    <span className="shrink-0 truncate text-[10px] text-muted-foreground/80">{profile ? getPlanDisplayName(profile) : '—'}</span>
   </div>
  </Link>}
  {isTrialing && <Link
   to="/profile"
   title="Gerenciar teste gratuito"
   className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
  >
   <Clock className="h-3.5 w-3.5 shrink-0 opacity-70"/>
   <span className="truncate">{trialDaysRemaining} dias de teste · {profile?.trial_auto_charge_cancelled ? 'Cobrança cancelada' : 'Gerenciar'}</span>
  </Link>}
 </div>;
}
