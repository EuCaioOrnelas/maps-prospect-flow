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
 * Card de uma linha no fim da página, abaixo das colunas: "Capacidade do CRM"
 * com o número de contatos, o limite do plano, os espaços restantes e, no fim
 * do card, o botão de expansão da capacidade.
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
          'flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card px-4 py-3 transition-colors',
          atLimit
            ? 'border-destructive/30 bg-destructive/5'
            : nearLimit
              ? 'border-amber-500/25 bg-amber-500/5'
              : 'border-border/60',
        )}
      >
        <div className="flex items-center gap-2">
          <Gauge
            className={cn(
              'h-4 w-4 shrink-0',
              atLimit ? 'text-destructive' : nearLimit ? 'text-amber-500' : 'text-muted-foreground',
            )}
          />
          <p className="text-sm text-muted-foreground">
            Capacidade do CRM:
            <span className="ml-1.5 text-base font-semibold tabular-nums text-foreground">
              {total.toLocaleString('pt-BR')}
            </span>
          </p>
        </div>

        {hasLimit ? (
          <>
            <p className="text-sm text-muted-foreground">
              Limite do plano:
              <span className="ml-1.5 font-medium tabular-nums text-foreground">
                {limit.toLocaleString('pt-BR')}
              </span>
            </p>

            <p
              className={cn(
                'text-sm tabular-nums text-muted-foreground',
                atLimit && 'font-medium text-destructive dark:text-red-400',
                nearLimit && !atLimit && 'font-medium text-amber-600 dark:text-amber-500',
              )}
            >
              {atLimit ? 'CRM lotado' : `${used}% usado`}
              {!atLimit && ` · ${available.toLocaleString('pt-BR')} disponíveis`}
            </p>

            {extraPacks > 0 && (
              <p className="text-xs tabular-nums text-muted-foreground">
                plano {baseLimit.toLocaleString('pt-BR')} + {extraContacts.toLocaleString('pt-BR')} extras
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Seu plano não tem limite de contatos.</p>
        )}

        {hasLimit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onUpgrade}
            className={cn(
              'ml-auto h-8 rounded-lg px-3 text-xs font-medium',
              atLimit && 'border-destructive/40 text-destructive dark:text-red-400 hover:bg-destructive/10',
            )}
          >
            Aumentar capacidade
          </Button>
        )}
      </div>
    </div>
  );
}
