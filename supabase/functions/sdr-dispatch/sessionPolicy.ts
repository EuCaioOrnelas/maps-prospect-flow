export function canResumeSession(session: { status: string; closed_reason?: string | null }, objective: string): boolean {
  if (session.status === "active") return true;
  return objective === "recuperacao" && session.status === "closed" &&
    !["explicit_rejection", "lead_refused", "explicit_opt_out"].includes(session.closed_reason ?? "");
}

export function firstContactOnly(activation: string[], replies: number): boolean {
  return !activation.includes("inbound_all") && activation.includes("first_only") && replies > 0;
}