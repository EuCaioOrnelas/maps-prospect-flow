/** Shared formatters for the Partners program (admin + portal). */

export const fmtBRL = (cents: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

export const fmtNum = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR").format(n || 0);

export const fmtPct = (n: number | null | undefined, digits = 1) =>
  `${(n || 0).toFixed(digits)}%`;

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const levelColors: Record<string, string> = {
  bronze: "bg-amber-700/10 text-amber-700 border-amber-700/30",
  silver: "bg-slate-400/10 text-slate-500 border-slate-400/30",
  gold: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  platinum: "bg-purple-500/10 text-purple-600 border-purple-500/30",
};

export const commissionStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  requested: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  paid: "bg-primary/10 text-primary border-primary/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export const withdrawalStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  approved: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

export const commissionStatusLabel: Record<string, string> = {
  pending: "Pendente",
  available: "Disponível",
  requested: "Solicitada",
  paid: "Paga",
  cancelled: "Cancelada",
};

export const withdrawalStatusLabel: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  paid: "Pago",
  rejected: "Recusado",
};

export const levelLabel: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export const goalStatusColors: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  expired: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export const goalStatusLabel: Record<string, string> = {
  active: "Em andamento",
  completed: "Concluída",
  expired: "Expirada",
  cancelled: "Cancelada",
};

export const goalTypeLabel: Record<string, string> = {
  revenue: "Receita gerada",
  paid_clients: "Clientes pagos",
  leads: "Leads indicados",
  mrr: "MRR atribuído",
};

export const goalPrizeStatusLabel: Record<string, string> = {
  not_claimed: "Disponível para resgate",
  requested: "Resgate solicitado",
  paid: "Pago",
};

export function formatGoalValue(type: string, value: number) {
  if (type === "revenue" || type === "mrr") return fmtBRL(value * 100);
  return fmtNum(value);
}
