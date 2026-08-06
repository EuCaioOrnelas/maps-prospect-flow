import React from "react";
import { cn } from "@/lib/utils";
import { useMetricStateCache } from "@/hooks/useMetricStateCache";

/**
 * Padrão único de Empty State para cards de indicadores.
 * O card mantém exatamente o mesmo tamanho/posição — só o conteúdo interno muda.
 *
 * Três estados possíveis, sempre no mesmo espaço reservado:
 *  1. loading  → skeleton (evita "flash de zero" durante o fetch)
 *  2. empty    → "Ainda não há dados" + dica curta
 *  3. ready    → o valor real
 */

/** Considera vazio: null/undefined, 0, "0", "0%", "R$ 0,00", "—", "" */
export function isMetricEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return !Number.isFinite(value) || value === 0;
  if (typeof value === "string") {
    const digits = value.replace(/[^0-9]/g, "");
    if (value.trim() === "" || value.trim() === "—" || value.trim() === "-") return true;
    if (digits === "") return true;
    return Number(digits) === 0;
  }
  return false;
}

interface MetricEmptyProps {
  /** Frase curta (1 linha) explicando quando o indicador será preenchido. */
  hint?: string;
  className?: string;
  /** Alinhamento do texto — acompanha o layout do card. */
  align?: "left" | "center";
  /** Tamanho da linha principal. */
  size?: "sm" | "md";
}

export function MetricEmpty({ hint, className, align = "left", size = "md" }: MetricEmptyProps) {
  return (
    <div
      className={cn(
        "min-w-0",
        align === "center" && "flex flex-col items-center text-center",
        className
      )}
    >
      <p
        className={cn(
          "font-normal leading-tight text-muted-foreground/70",
          size === "sm" ? "text-[12px]" : "text-sm"
        )}
      >
        Ainda não há dados
      </p>
      {hint && (
        <p className="text-[11px] leading-snug text-muted-foreground/50 mt-1 font-light">
          {hint}
        </p>
      )}
    </div>
  );
}

interface MetricSkeletonProps {
  className?: string;
  align?: "left" | "center";
  size?: "sm" | "md";
}

/** Skeleton do valor — ocupa exatamente o mesmo espaço do valor/empty state. */
export function MetricSkeleton({ className, align = "left", size = "md" }: MetricSkeletonProps) {
  return (
    <div
      className={cn(
        "min-w-0 animate-pulse",
        align === "center" && "flex flex-col items-center",
        className
      )}
      aria-busy="true"
      aria-label="Carregando indicador"
    >
      <div
        className={cn(
          "rounded-md bg-muted/70",
          size === "sm" ? "h-4 w-16" : "h-6 w-24"
        )}
      />
      <div className="mt-2 h-2.5 w-3/5 min-w-[70px] rounded bg-muted/40" />
    </div>
  );
}

interface MetricSlotProps {
  /** Enquanto true, mostra skeleton (nunca zero). */
  loading?: boolean;
  /** Após o fetch, indica que não existem dados reais. */
  empty?: boolean;
  hint?: string;
  align?: "left" | "center";
  size?: "sm" | "md";
  /** Classe aplicada ao contêiner (use min-h para reservar o espaço). */
  className?: string;
  /**
   * Chave estável do indicador. Quando informada, o estado (vazio x com dados)
   * é cacheado localmente e no backend, então na próxima abertura — em qualquer
   * dispositivo — o card já assume o estado correto durante o carregamento.
   */
  cacheKey?: string;
  /** Conteúdo real do indicador. */
  children?: React.ReactNode;
}

/**
 * Slot único para o corpo do card: alterna entre carregando, vazio e valor real
 * com fade suave, sem alterar tamanho ou posição do layout.
 */
export function MetricSlot({
  loading,
  empty,
  hint,
  align = "left",
  size = "md",
  className,
  cacheKey,
  children,
}: MetricSlotProps) {
  const { getCached, report } = useMetricStateCache();
  const cached = getCached(cacheKey);

  React.useEffect(() => {
    if (loading || !cacheKey) return;
    report(cacheKey, !empty);
  }, [loading, empty, cacheKey, report]);

  // Durante o carregamento, se o cache indica que o indicador estava vazio,
  // mostramos direto o empty state (sem piscar skeleton → vazio).
  const state = loading
    ? cached === false
      ? "empty"
      : "loading"
    : empty
      ? "empty"
      : "ready";

  return (
    <div className={cn("min-w-0", className)}>
      <div
        key={state}
        className="animate-in fade-in-0 duration-500 ease-out motion-reduce:animate-none"
      >
        {state === "loading" ? (
          <MetricSkeleton align={align} size={size} />
        ) : state === "empty" ? (
          <MetricEmpty hint={hint} align={align} size={size} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

