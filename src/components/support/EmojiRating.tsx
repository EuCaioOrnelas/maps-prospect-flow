// Escala de satisfação com emojis (estilo Reclame Aqui).
// Cada nível vale 2 pontos na escala 0–10 usada no banco (nps_score).
import { cn } from "@/lib/utils";

export type EmojiRatingOption = {
  value: number;
  emoji: string;
  label: string;
};

export const EMOJI_RATING_OPTIONS: EmojiRatingOption[] = [
  { value: 2, emoji: "😠", label: "Muito ruim" },
  { value: 4, emoji: "🙁", label: "Ruim" },
  { value: 6, emoji: "😐", label: "Bom" },
  { value: 8, emoji: "🙂", label: "Muito bom" },
  { value: 10, emoji: "🤩", label: "Excelente" },
];

interface EmojiRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: "sm" | "md";
  className?: string;
}

export function EmojiRating({ value, onChange, size = "md", className }: EmojiRatingProps) {
  return (
    <div className={cn("grid grid-cols-5 gap-1.5", className)}>
      {EMOJI_RATING_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-200",
              size === "sm" ? "px-1 py-2" : "px-2 py-3",
              active
                ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                : "border-border bg-background hover:border-primary/40 hover:bg-muted/50",
            )}
          >
            <span
              className={cn(
                "leading-none transition-transform duration-200",
                size === "sm" ? "text-xl" : "text-2xl",
                active ? "scale-110" : "opacity-70 group-hover:opacity-100 group-hover:scale-105",
              )}
            >
              {option.emoji}
            </span>
            <span
              className={cn(
                "text-center font-medium leading-tight",
                size === "sm" ? "text-[9px]" : "text-[10px]",
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
