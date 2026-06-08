/**
 * Sistema de permissões por cargo dentro de uma conta Wiize.
 *
 * Cargos:
 *  - owner: dono da conta (criador). Acesso total, único, não removível.
 *  - admin: administrador. Acesso total exceto cobrança/assinatura.
 *  - operational: operacional. Só Atendimento, CRM e Prospecção IA.
 *
 * Esta camada vive em paralelo a `planAccess` / `featurePermissions`:
 *  - planAccess decide o que o PLANO permite.
 *  - featurePermissions decide o que a ASSINATURA CUSTOMIZADA permite.
 *  - accountPermissions decide o que o CARGO do usuário permite.
 *
 * O acesso final é a interseção dos três.
 */

export type AccountRole = "owner" | "admin" | "operational";

export type AccountPermission =
  | "dashboard_main"
  | "dashboard_meta"
  | "prospeccao"
  | "crm"
  | "atendimento"
  | "fluxos"
  | "agentes_ia"
  | "aquecimento"
  | "usuarios"
  | "assinaturas"
  | "faturamento"
  | "configuracoes"
  | "integracoes";

export const ROLE_PERMISSIONS: Record<AccountRole, AccountPermission[]> = {
  owner: [
    "dashboard_main",
    "dashboard_meta",
    "prospeccao",
    "crm",
    "atendimento",
    "fluxos",
    "agentes_ia",
    "aquecimento",
    "usuarios",
    "assinaturas",
    "faturamento",
    "configuracoes",
    "integracoes",
  ],
  admin: [
    "dashboard_main",
    "dashboard_meta",
    "prospeccao",
    "crm",
    "atendimento",
    "fluxos",
    "agentes_ia",
    "aquecimento",
    "usuarios",
    "configuracoes",
    "integracoes",
  ],
  operational: [
    "prospeccao",
    "crm",
    "atendimento",
    "fluxos",
    "agentes_ia",
    "aquecimento",
  ],
};

export const ROLE_LABEL: Record<AccountRole, string> = {
  owner: "Owner",
  admin: "Administrador",
  operational: "Operacional",
};

export const PERMISSION_LABEL: Record<AccountPermission, string> = {
  dashboard_main: "Dashboard Principal",
  dashboard_meta: "Dashboard Meta",
  prospeccao: "Prospecção IA",
  crm: "CRM",
  atendimento: "Atendimento (Chat)",
  fluxos: "Fluxos de Automação",
  agentes_ia: "Agentes IA",
  aquecimento: "Aquecimento",
  usuarios: "Usuários",
  assinaturas: "Assinaturas",
  faturamento: "Faturamento",
  configuracoes: "Configurações",
  integracoes: "Integrações",
};

export function roleHasPermission(role: AccountRole | null | undefined, perm: AccountPermission): boolean {
  if (!role) return true; // ainda carregando — não bloquear UI eagerly
  return ROLE_PERMISSIONS[role].includes(perm);
}

/**
 * Mapeia uma rota da plataforma para a permissão de cargo que a protege.
 * Retorna null quando a rota não é gateada por cargo (ex: /profile, /ajuda).
 */
export function getRolePermissionForPath(pathname: string): AccountPermission | null {
  if (pathname === "/dashboard" || pathname.startsWith("/reports")) return "dashboard_main";
  if (pathname.startsWith("/meta") || pathname === "/meta-campaigns" || pathname === "/meta-api-guide") return "dashboard_meta";
  if (pathname.startsWith("/oportunidades") || pathname === "/prospeccao") return "prospeccao";
  if (pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/chat")) return "atendimento";
  if (pathname.startsWith("/usuarios")) return "usuarios";
  if (pathname.startsWith("/minha-assinatura")) return "assinaturas";
  return null;
}

/**
 * Home padrão de cada cargo após login.
 */
export function getDefaultHomeForRole(role: AccountRole | null | undefined): string {
  if (role === "operational") return "/oportunidades";
  return "/dashboard";
}

export interface SeatInfo {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}

/**
 * Limite total de usuários (owner + sub usuários) baseado no plano.
 * - Atendimento (start): 3 (1 owner + 2 sub)
 * - Growth: 6 (1 owner + 5 sub)
 * - Demais (scale, legados, free): ilimitado
 */
export function getSeatLimitForPlan(plan: string | null | undefined): number {
  const p = (plan || "").toLowerCase();
  if (p === "start") return 3;
  if (p === "growth") return 6;
  return Infinity;
}

export function buildSeatInfo(plan: string | null | undefined, used: number): SeatInfo {
  const limit = getSeatLimitForPlan(plan);
  const unlimited = !isFinite(limit);
  return {
    used,
    limit: unlimited ? Number.MAX_SAFE_INTEGER : limit,
    remaining: unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, limit - used),
    unlimited,
  };
}
