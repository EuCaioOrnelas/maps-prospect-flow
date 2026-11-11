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
 * Fica no fim das colunas do quadro: discreto, sem caixa pesada, sem aparecer
 * no topo da página. Só chama atenção quando o limite está perto ou cheio.
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
  const used = hasLimit ? Math.min(100, Math.round((total / Math.max(Number(limit) || 1, 1)) * 100)) : 0;

  return (
    <div className="w-[190px] shrink-0 snap-start self-start select-none">
      <div
        className={cn(
          'rounded-xl border px-3 py-3 transition-colors',
          atLimit
            ? 'border-destructive/40 bg-destructive/5'
            : nearLimit
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-border/40 bg-card/50',
        )}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
          Capacidade do CRM
        </p>

        {hasLimit ? (
          <>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {total.toLocaleString('pt-BR')}
              <span className="font-normal text-muted-foreground/70">
                {' / '}{limit.toLocaleString('pt-BR')}
              </span>
            </p>

            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500',
                  atLimit ? 'bg-destructive' : nearLimit ? 'bg-amber-500' : 'bg-primary/70',
                )}
                style={{ width: `${used}%` }}
              />
            </div>

            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground/80">
              {atLimit ? (
                <span className="font-medium text-destructive">CRM lotado</span>
              ) : (
                <>{used}% usado</>
              )}
              {extraPacks > 0 && (
                <>
                  {' · '}
                  plano {baseLimit.toLocaleString('pt-BR')} + {extraContacts.toLocaleString('pt-BR')} extras
                </>
              )}
            </p>

            <button
              type="button"
              onClick={onUpgrade}
              className={cn(
                'mt-2 text-[11px] font-medium underline-offset-2 transition-colors hover:underline',
                atLimit ? 'text-destructive' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Aumentar capacidade
            </button>
          </>
        ) : (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
            Seu plano não tem limite de contatos.
          </p>
        )}
      </div>
    </div>
  );
}
