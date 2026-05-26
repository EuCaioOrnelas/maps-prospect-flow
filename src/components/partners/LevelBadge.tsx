import { Award, Crown, Gem, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export type PartnerLevel = "bronze" | "silver" | "gold" | "platinum";

/**
 * Visual system for partner tiers.
 * Clean monochrome scale — all tiers use neutral surfaces with a single
 * subtle accent. Differentiation comes from the icon, not from rainbow colors.
 */
export const LEVEL_META: Record<PartnerLevel, {
  label: string;
  icon: typeof Award;
  fg: string;
  bg: string;
  glow: string;
  ring: string;
}> = {
  bronze: {
    label: "Select",
    icon: Medal,
    fg: "text-muted-foreground",
    bg: "bg-muted/60",
    glow: "",
    ring: "ring-border/60",
  },
  silver: {
    label: "Signature",
    icon: Award,
    fg: "text-foreground/80",
    bg: "bg-muted",
    glow: "",
    ring: "ring-border",
  },
  gold: {
    label: "Prime",
    icon: Crown,
    fg: "text-foreground",
    bg: "bg-foreground/[0.06]",
    glow: "",
    ring: "ring-foreground/15",
  },
  platinum: {
    label: "Exclusive",
    icon: Gem,
    fg: "text-primary-foreground",
    bg: "bg-foreground",
    glow: "shadow-[0_2px_8px_-3px_hsl(var(--foreground)/0.25)]",
    ring: "ring-foreground/40",
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
        "inline-flex items-center rounded-full font-semibold ring-1",
        meta.bg,
        meta.fg,
        meta.ring,
        meta.glow,
        dims.box,
        className,
      )}
    >
      <Icon size={dims.icon} className="shrink-0" strokeWidth={2.25} />
      {showLabel && <span className="tracking-wide">{meta.label}</span>}
    </span>
  );
}

