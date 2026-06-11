// Deterministic color palette for chat responsibles. Subtle, fintech-friendly.
// Each color exposes a bar (left border / accent strip) hex.
const RESPONSIBLE_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#eab308", // yellow
];

export function getResponsibleColor(userId: string | null | undefined): string | null {
  if (!userId) return null;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return RESPONSIBLE_COLORS[hash % RESPONSIBLE_COLORS.length];
}
