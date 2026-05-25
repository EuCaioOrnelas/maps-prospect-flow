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
    label: "Select",
    icon: Medal,
    fg: "text-foreground",
    bg: "bg-muted/70",
    glow: "",
    ring: "ring-border",
  },
  silver: {
    label: "Signature",
    icon: Award,
    fg: "text-foreground",
    bg: "bg-muted",
    glow: "",
    ring: "ring-border",
  },
  gold: {
    label: "Prime",
    icon: Crown,
    fg: "text-primary-foreground",
    bg: "bg-primary",
    glow: "shadow-[0_4px_16px_-6px_hsl(var(--primary)/0.4)]",
    ring: "ring-primary/40",
  },
  platinum: {
    label: "Exclusive",
    icon: Gem,
    fg: "text-background",
    bg: "bg-foreground",
    glow: "shadow-[0_4px_16px_-6px_hsl(var(--foreground)/0.3)]",
    ring: "ring-foreground/30",
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
