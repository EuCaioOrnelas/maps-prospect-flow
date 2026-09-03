import { Award, Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export type PartnerLevel = "select" | "signature" | "prime";

/**
 * Visual system for partner tiers.
 * Three levels only: Select, Signature, Prime.
 */
export const LEVEL_META: Record<PartnerLevel, {
  label: string;
  icon: typeof Award;
  fg: string;
  bg: string;
  glow: string;
  ring: string;
}> = {
  select: {
    label: "Select",
    icon: Medal,
    fg: "text-primary",
    bg: "bg-primary/10",
    glow: "",
    ring: "ring-primary/25",
  },
  signature: {
    label: "Signature",
    icon: Award,
    fg: "text-primary",
    bg: "bg-primary/15",
    glow: "",
    ring: "ring-primary/30",
  },
  prime: {
    label: "Prime",
    icon: Crown,
    fg: "text-primary",
    bg: "bg-primary/20",
    glow: "",
    ring: "ring-primary/35",
  },
};


interface Props {
  level: PartnerLevel | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function LevelBadge({ level, size = "md", showLabel = true, className }: Props) {
  const key = (String(level || "select").toLowerCase() as PartnerLevel);
  const meta = LEVEL_META[key] ?? LEVEL_META.select;
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

