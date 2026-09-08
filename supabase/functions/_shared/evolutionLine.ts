// Identidade estável de uma linha WhatsApp (Número de Atendimento).
// Chave = DDD + 8 últimos dígitos (ignora o "9" extra e o DDI 55), para que as
// conversas salvas na Wiize sobrevivam a desconexões, exclusões e novas instâncias.

export function lineKey(phone: string | null | undefined): string | null {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length < 10) return null;
  const ddd = d.slice(0, 2);
  const last8 = d.slice(-8);
  return `${ddd}${last8}`;
}

export function lineRef(phone: string | null | undefined): string | null {
  const k = lineKey(phone);
  return k ? `evo:${k}` : null;
}

// Reanexa à conexão atual todas as conversas salvas para a mesma linha
// (mesmo que pertençam a uma instância antiga ou já excluída).
export async function relinkConversationsToLine(
  supabase: any,
  conn: { id: string; user_id: string; owner_user_id?: string | null; evolution_instance_name?: string | null },
  phone: string | null | undefined,
): Promise<number> {
  const ref = lineRef(phone);
  if (!ref) return 0;
  const ownerId = conn.owner_user_id || conn.user_id;

  // 1) Conversas já ligadas a esta conexão recebem a referência da linha
  await supabase
    .from("chat_conversations")
    .update({ phone_number_id: ref })
    .eq("waba_connection_id", conn.id)
    .neq("phone_number_id", ref);

  // 2) Conversas da mesma linha (órfãs ou de instâncias antigas) voltam para cá
  const { data, error } = await supabase
    .from("chat_conversations")
    .update({ waba_connection_id: conn.id })
    .eq("phone_number_id", ref)
    .or(`owner_user_id.eq.${ownerId},user_id.eq.${conn.user_id}`)
    .or(`waba_connection_id.is.null,waba_connection_id.neq.${conn.id}`)
    .select("id");
  if (error) {
    console.warn("[evolutionLine] relink error", error.message);
    return 0;
  }
  return (data || []).length;
}
