// Deterministic color palette for chat responsibles.
// Curated to harmonize with Wiize green — no lime, mustard, or muddy yellows.
// Cores limpas: emerald, teal, sky, blue, indigo, violet, fuchsia, rose, slate.
// Because user_id is immutable, each user always maps to the same color → "salvo no sistema".
const RESPONSIBLE_COLORS = [
  "#10b981", // emerald (Wiize green)
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#64748b", // slate
];

export function getResponsibleColor(userId: string | null | undefined): string | null {
  if (!userId) return null;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return RESPONSIBLE_COLORS[hash % RESPONSIBLE_COLORS.length];
}
