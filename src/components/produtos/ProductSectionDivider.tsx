interface ProductSectionDividerProps {
  label?: string;
  className?: string;
}

/**
 * Faixa visual de transição entre seções — "plasma líquido" leve.
 * Implementado só com gradientes + transform/opacity, respeitando prefers-reduced-motion.
 */
export const ProductSectionDivider = ({ label, className = "" }: ProductSectionDividerProps) => (
  <div className={`container mx-auto max-w-6xl px-4 py-10 sm:py-14 ${className}`}>
    <div className="relative h-32 w-full overflow-hidden rounded-panel border border-border/50 sm:h-44">
      <div className="wz-plasma absolute inset-0" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-background/25 to-transparent" aria-hidden />
      {label && (
        <div className="relative z-10 flex h-full items-center justify-center px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-white/90 sm:text-sm">
            {label}
          </p>
        </div>
      )}
    </div>
  </div>
);

export default ProductSectionDivider;
