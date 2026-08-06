import { cn } from "@/lib/utils";

/**
 * Padrão único de Empty State para cards de indicadores.
 * O card mantém exatamente o mesmo tamanho/posição — só o conteúdo interno muda.
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
