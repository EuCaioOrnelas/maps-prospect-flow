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
    fg: "text-amber-900 dark:text-amber-200",
    bg: "bg-gradient-to-br from-amber-500/30 via-amber-400/20 to-orange-500/15",
    glow: "shadow-[0_8px_28px_-12px_hsl(28_90%_45%/0.55)]",
    ring: "ring-amber-700/40 dark:ring-amber-500/40",
  },
  silver: {
    label: "Silver",
    icon: Award,
    fg: "text-slate-800 dark:text-slate-100",
    bg: "bg-gradient-to-br from-slate-400/35 via-slate-300/25 to-slate-500/20",
    glow: "shadow-[0_8px_28px_-12px_hsl(220_15%_40%/0.55)]",
    ring: "ring-slate-500/40 dark:ring-slate-400/40",
  },
  gold: {
    label: "Gold",
    icon: Crown,
    fg: "text-yellow-900 dark:text-yellow-200",
    bg: "bg-gradient-to-br from-yellow-400/40 via-amber-300/25 to-yellow-500/20",
    glow: "shadow-[0_10px_32px_-12px_hsl(45_95%_45%/0.65)]",
    ring: "ring-yellow-600/45 dark:ring-yellow-500/45",
  },
  platinum: {
    label: "Platinum",
    icon: Gem,
    fg: "text-violet-900 dark:text-violet-200",
    bg: "bg-gradient-to-br from-violet-500/35 via-fuchsia-400/25 to-violet-600/20",
    glow: "shadow-[0_12px_36px_-12px_hsl(265_85%_50%/0.65)]",
    ring: "ring-violet-600/45 dark:ring-violet-500/45",
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
