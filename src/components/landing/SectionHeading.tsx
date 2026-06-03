import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  eyebrowTone?: "primary" | "destructive" | "muted";
  title: ReactNode;
  highlight: string;
  /**
   * "default" → tamanho hero (frases curtas).
   * "tight"   → menor + nowrap, garante 1 linha no mobile p/ frases longas.
   */
  highlightFit?: "default" | "tight";
  description?: ReactNode;
  isVisible?: boolean;
  align?: "center" | "left";
  className?: string;
}

const toneMap = {
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

export const SectionHeading = ({
  eyebrow,
  eyebrowTone = "primary",
  title,
  highlight,
  highlightFit = "default",
  description,
  isVisible = true,
  align = "center",
  className = "",
}: SectionHeadingProps) => {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  const highlightClass =
    highlightFit === "tight"
      ? "whitespace-nowrap text-[1.35rem] xs:text-[1.55rem] sm:text-[2.1rem] md:text-[2.6rem] lg:text-[2.9rem]"
      : "text-[1.85rem] sm:text-[2.5rem] md:text-[3.1rem] lg:text-[3.4rem]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={`max-w-3xl ${alignClass} mb-12 sm:mb-16 ${className}`}
    >
      <span
        className={`inline-block px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-widest uppercase mb-4 ${toneMap[eyebrowTone]}`}
      >
        {eyebrow}
      </span>
      <h2 className="font-display font-bold text-foreground leading-[1.08] tracking-tight mb-4 sm:mb-5">
        <span className="block text-[1.65rem] sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3rem]">
          {title}
        </span>
        <span className={`block font-extrabold text-shimmer-highlight leading-[1.02] mt-1 ${highlightClass}`}>
          {highlight}
        </span>
      </h2>
      {description && (
        <p className={`text-base sm:text-lg text-muted-foreground leading-relaxed ${align === "center" ? "max-w-2xl mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </motion.div>
  );
};
