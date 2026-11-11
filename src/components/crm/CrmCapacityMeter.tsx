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
 * Fica numa faixa fina abaixo das colunas: sempre visível, discreta, sem caixa
 * e sem aparecer no topo da página. Só chama atenção quando o limite está
 * perto ou cheio.
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pt-1 pb-2 sm:px-4 sm:pb-4 lg:px-6 text-[11px] leading-none text-muted-foreground select-none">
      <span className="font-medium text-foreground/70">Capacidade do CRM</span>

      {hasLimit ? (
        <>
          <span className="tabular-nums text-foreground/80">
            {total.toLocaleString('pt-BR')}
            <span className="text-muted-foreground">{' / '}{limit.toLocaleString('pt-BR')}</span>
          </span>

          <span className="inline-block h-1 w-24 overflow-hidden rounded-full bg-muted align-middle">
            <span
              className={cn(
                'block h-full rounded-full transition-[width] duration-500',
                atLimit ? 'bg-destructive' : nearLimit ? 'bg-amber-500' : 'bg-primary/70',
              )}
              style={{ width: `${used}%` }}
            />
          </span>

          <span className={cn(atLimit && 'font-medium text-destructive')}>
            {atLimit ? 'CRM lotado' : `${used}% usado`}
          </span>

          {extraPacks > 0 && (
            <span>
              · plano {baseLimit.toLocaleString('pt-BR')} + {extraContacts.toLocaleString('pt-BR')} extras
            </span>
          )}

          <button
            type="button"
            onClick={onUpgrade}
            className={cn(
              'font-medium underline-offset-2 transition-colors hover:underline',
              atLimit ? 'text-destructive' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Aumentar capacidade
          </button>
        </>
      ) : (
        <span>Seu plano não tem limite de contatos.</span>
      )}
    </div>
  );
}
