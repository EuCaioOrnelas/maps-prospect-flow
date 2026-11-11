import { Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CrmCapacityMeterProps {
  count: number;
  limit: number;
  baseLimit: number;
  extraContacts: number;
  extraPacks: number;
  hasLimit: boolean;
  atLimit: boolean;
  nearLimit: boolean;
  onUpgrade: () => void;
}

/**
 * Medidor de capacidade do CRM.
 * Faixa fina e discreta no fim da página, abaixo das colunas: uma linha só com
 * contatos usados, limite, barra fina, porcentagem, disponíveis e o acesso
 * discreto para aumentar a capacidade.
 * Só muda de cor quando o limite está perto ou cheio.
 */
export function CrmCapacityMeter({
  count,
  limit,
  baseLimit,
  extraContacts,
  extraPacks,
  hasLimit,
  atLimit,
  nearLimit,
  onUpgrade,
}: CrmCapacityMeterProps) {
  const total = Number(count) || 0;
  const safeLimit = Math.max(Number(limit) || 1, 1);
  const used = hasLimit ? Math.min(100, Math.round((total / safeLimit) * 100)) : 0;
  const available = hasLimit ? Math.max(0, (Number(limit) || 0) - total) : 0;

  return (
    <div className="px-2 pb-2 sm:px-4 sm:pb-3 lg:px-6 lg:pb-4 select-none">
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-1.5 transition-colors',
          atLimit
            ? 'border-destructive/30 bg-destructive/5'
            : nearLimit
              ? 'border-amber-500/25 bg-amber-500/5'
              : 'border-border/50 bg-card/40',
        )}
      >
        <Gauge
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            atLimit ? 'text-destructive' : nearLimit ? 'text-amber-500' : 'text-muted-foreground',
          )}
        />

        <p className="text-xs font-medium text-muted-foreground">Capacidade do CRM</p>

        {hasLimit ? (
          <>
            <p className="text-xs font-medium tabular-nums text-foreground">
              {total.toLocaleString('pt-BR')}
              <span className="font-normal text-muted-foreground">
                {' / '}{limit.toLocaleString('pt-BR')}
              </span>
            </p>

            <div className="h-1 w-20 shrink-0 overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500',
                  atLimit ? 'bg-destructive' : nearLimit ? 'bg-amber-500' : 'bg-primary/60',
                )}
                style={{ width: `${used}%` }}
              />
            </div>

            <p
              className={cn(
                'text-xs tabular-nums text-muted-foreground',
                atLimit && 'font-medium text-destructive dark:text-red-400',
                nearLimit && !atLimit && 'font-medium text-amber-600 dark:text-amber-500',
              )}
            >
              {atLimit ? 'CRM lotado' : `${used}% usado`}
            </p>

            <p className="text-xs tabular-nums text-muted-foreground">
              {available.toLocaleString('pt-BR')} disponíveis
            </p>

            {extraPacks > 0 && (
              <p className="text-xs tabular-nums text-muted-foreground">
                plano {baseLimit.toLocaleString('pt-BR')} + {extraContacts.toLocaleString('pt-BR')} extras
              </p>
            )}
          </>
        ) : (
          <p className="text-xs tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground">{total.toLocaleString('pt-BR')}</span>
            {' contatos · Seu plano não tem limite de contatos.'}
          </p>
        )}

        {hasLimit && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onUpgrade}
            className={cn(
              'ml-auto h-6 rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground',
              atLimit && 'text-destructive dark:text-red-400 hover:bg-destructive/10 hover:text-destructive',
            )}
          >
            Aumentar capacidade
          </Button>
        )}
      </div>
    </div>
  );
}
