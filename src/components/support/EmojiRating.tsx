// Escala de satisfação com emojis (estilo Reclame Aqui).
// Cada nível vale 2 pontos na escala 0–10 usada no banco (nps_score).
import { cn } from "@/lib/utils";

export type EmojiRatingOption = {
  value: number;
  emoji: string;
  label: string;
};

export const EMOJI_RATING_OPTIONS: EmojiRatingOption[] = [
  { value: 2, emoji: "😡", label: "Muito ruim" },
  { value: 4, emoji: "😕", label: "Ruim" },
  { value: 6, emoji: "🙂", label: "Bom" },
  { value: 8, emoji: "😃", label: "Muito bom" },
  { value: 10, emoji: "🤩", label: "Excelente" },
];

interface EmojiRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmojiRating({ value, onChange, size = "md", className }: EmojiRatingProps) {
  return (
    <div className={cn("grid grid-cols-5 gap-1.5 sm:gap-2", className)}>
      {EMOJI_RATING_OPTIONS.map((option) => {
        const active = value === option.value;
        const dimmed = value !== null && !active;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 rounded-2xl border transition-all duration-200",
              size === "sm" ? "px-1 py-2" : size === "md" ? "px-2 py-3" : "px-2 py-4",
              active
                ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30 -translate-y-0.5"
                : "border-border bg-background hover:border-primary/40 hover:bg-muted/50 hover:-translate-y-0.5",
              dimmed && "opacity-60",
            )}
          >
            <span
              className={cn(
                "leading-none transition-transform duration-200",
                size === "sm" ? "text-2xl" : size === "md" ? "text-3xl" : "text-[34px] sm:text-4xl",
                active ? "scale-110" : "grayscale-[0.35] group-hover:grayscale-0 group-hover:scale-110",
              )}
            >
              {option.emoji}
            </span>
            <span
              className={cn(
                "text-center font-medium leading-tight",
                size === "sm" ? "text-[9px]" : size === "md" ? "text-[10px]" : "text-[11px] sm:text-xs",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
