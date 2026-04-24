import { Award, Crown, Gem, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export type PartnerLevel = "bronze" | "silver" | "gold" | "platinum";

export const LEVEL_META: Record<PartnerLevel, {
  label: string;
  icon: typeof Award;
  /** Tailwind classes for icon + text foreground */
  fg: string;
  /** Background gradient for the badge */
  bg: string;
  /** Soft glow shadow */
  glow: string;
  /** Accent ring color (translucent) */
  ring: string;
}> = {
  bronze: {
    label: "Bronze",
    icon: Medal,
    fg: "text-amber-700 dark:text-amber-300",
    bg: "bg-gradient-to-br from-amber-200/40 via-amber-100/20 to-transparent",
    glow: "shadow-[0_8px_28px_-12px_hsl(32_85%_55%/0.45)]",
    ring: "ring-amber-500/25",
  },
  silver: {
    label: "Silver",
    icon: Award,
    fg: "text-slate-700 dark:text-slate-200",
    bg: "bg-gradient-to-br from-slate-300/40 via-slate-200/20 to-transparent",
    glow: "shadow-[0_8px_28px_-12px_hsl(220_15%_55%/0.45)]",
    ring: "ring-slate-400/25",
  },
  gold: {
    label: "Gold",
    icon: Crown,
    fg: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-gradient-to-br from-yellow-300/40 via-yellow-200/20 to-transparent",
    glow: "shadow-[0_10px_32px_-12px_hsl(45_95%_55%/0.55)]",
    ring: "ring-yellow-500/30",
  },
  platinum: {
    label: "Platinum",
    icon: Gem,
    fg: "text-violet-700 dark:text-violet-300",
    bg: "bg-gradient-to-br from-violet-300/40 via-fuchsia-200/20 to-transparent",
    glow: "shadow-[0_12px_36px_-12px_hsl(265_85%_60%/0.55)]",
    ring: "ring-violet-500/30",
  },
};

interface Props {
  level: PartnerLevel | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function LevelBadge({ level, size = "md", showLabel = true, className }: Props) {
  const key = (String(level || "bronze").toLowerCase() as PartnerLevel);
  const meta = LEVEL_META[key] ?? LEVEL_META.bronze;
  const Icon = meta.icon;

  const dims = {
    sm: { box: "h-6 px-2 gap-1 text-[11px]", icon: 12 },
    md: { box: "h-8 px-2.5 gap-1.5 text-xs", icon: 14 },
    lg: { box: "h-10 px-3.5 gap-2 text-sm", icon: 18 },
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1 backdrop-blur-sm",
        meta.bg,
        meta.fg,
        meta.ring,
        meta.glow,
        dims.box,
        className,
      )}
    >
      <Icon size={dims.icon} className="shrink-0" strokeWidth={2.25} />
      {showLabel && <span className="capitalize tracking-wide">{meta.label}</span>}
    </span>
  );
}
