import { Gauge, Users } from 'lucide-react';
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
 * Fica num card no fim da página, abaixo das colunas: total de contatos, limite
 * do plano, espaço disponível e o acesso para aumentar a capacidade.
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
    <div className="px-2 pb-2 sm:px-4 sm:pb-4 lg:px-6 lg:pb-6 select-none">
      <div
        className={cn(
          'rounded-2xl border bg-card px-4 py-4 transition-colors sm:px-6 sm:py-5',
          atLimit
            ? 'border-destructive/40 bg-destructive/5'
            : nearLimit
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-border/60',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-[240px] flex-1">
            <div className="flex items-center gap-2">
              <Gauge
                className={cn(
                  'h-4 w-4 shrink-0',
                  atLimit ? 'text-destructive' : nearLimit ? 'text-amber-500' : 'text-muted-foreground',
                )}
              />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Capacidade do CRM
              </p>
            </div>

            {hasLimit ? (
              <>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">
                    {total.toLocaleString('pt-BR')}
                    <span className="text-base font-normal text-muted-foreground/70">
                      {' / '}{limit.toLocaleString('pt-BR')}
                    </span>
                  </p>
                  <span
                    className={cn(
                      'text-xs font-medium tabular-nums',
                      atLimit ? 'text-destructive' : nearLimit ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground',
                    )}
                  >
                    {atLimit ? 'CRM lotado' : `${used}% usado`}
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-500',
                      atLimit ? 'bg-destructive' : nearLimit ? 'bg-amber-500' : 'bg-primary/70',
                    )}
                    style={{ width: `${used}%` }}
                  />
                </div>

                {extraPacks > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    plano {baseLimit.toLocaleString('pt-BR')} + {extraContacts.toLocaleString('pt-BR')} extras
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 flex items-baseline gap-2 text-2xl font-semibold leading-none tabular-nums text-foreground">
                  <Users className="h-5 w-5 shrink-0 self-center text-muted-foreground" />
                  {total.toLocaleString('pt-BR')}
                  <span className="text-sm font-normal text-muted-foreground">contatos</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Seu plano não tem limite de contatos.
                </p>
              </>
            )}
          </div>

          {hasLimit && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="min-w-[92px]">
                <p className="text-xs text-muted-foreground">Contatos no CRM</p>
                <p className="mt-1 text-lg font-semibold tabular-nums leading-none text-foreground">
                  {total.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="min-w-[92px] border-l border-border/60 pl-8">
                <p className="text-xs text-muted-foreground">Limite do plano</p>
                <p className="mt-1 text-lg font-semibold tabular-nums leading-none text-foreground">
                  {limit.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="min-w-[92px] border-l border-border/60 pl-8">
                <p className="text-xs text-muted-foreground">Disponíveis</p>
                <p
                  className={cn(
                    'mt-1 text-lg font-semibold tabular-nums leading-none',
                    atLimit ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {available.toLocaleString('pt-BR')}
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onUpgrade}
                className={cn(
                  'h-9 rounded-xl px-4 text-xs font-medium',
                  atLimit && 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive',
                )}
              >
                Aumentar capacidade
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
