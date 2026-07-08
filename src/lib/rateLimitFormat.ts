// Helper to format a "retry_after" (seconds) into a friendly PT-BR wait message.
// Used by pages that call the public.check_rate_limit RPC.
export function formatRetryAfter(seconds: number | null | undefined): string {
  const s = Math.max(1, Math.ceil(Number(seconds) || 1));
  if (s < 60) return `${s} segundo${s === 1 ? "" : "s"}`;
  const min = Math.floor(s / 60);
  const rem = s % 60;
  if (rem === 0) return `${min} minuto${min === 1 ? "" : "s"}`;
  return `${min} min ${rem}s`;
}
