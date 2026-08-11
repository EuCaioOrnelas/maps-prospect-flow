import type { AccountRole } from "@/lib/accountPermissions";

/**
 * Regra de alteração do responsável de uma venda:
 *  - owner e admin podem alterar o responsável de qualquer venda;
 *  - um colaborador (operational) só pode alterar as vendas em que ELE é o responsável;
 *  - vendas sem responsável definido podem ser assumidas por qualquer membro.
 */
export function canChangeSaleResponsible(params: {
  role: AccountRole | null;
  currentUserId: string | null | undefined;
  saleResponsibleUserId: string | null | undefined;
}): boolean {
  const { role, currentUserId, saleResponsibleUserId } = params;
  if (!currentUserId) return false;
  if (role === "owner" || role === "admin") return true;
  if (!saleResponsibleUserId) return true;
  return saleResponsibleUserId === currentUserId;
}
