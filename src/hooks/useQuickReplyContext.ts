import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getChatPhoneKey } from "@/hooks/useChatCRMFilters";
import type { QuickReplyVarKey } from "@/hooks/useQuickReplies";

interface Conv {
  contact_name?: string | null;
  contact_phone?: string | null;
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) return `+55 (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return phone;
}

function parseName(name?: string | null) {
  const full = (name || "").trim();
  if (!full) return { full: "", first: "", last: "" };
  const parts = full.split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return { full, first, last };
}


/** Resolve as variáveis das mensagens rápidas a partir da conversa + lead do CRM */
export function useQuickReplyContext(conversation: Conv | null | undefined) {
  const [ctx, setCtx] = useState<Partial<Record<QuickReplyVarKey, string>>>({});

  useEffect(() => {
    let cancel = false;
    if (!conversation?.contact_phone) { setCtx({}); return; }
    const parsed = parseName(conversation.contact_name);
    const base: Partial<Record<QuickReplyVarKey, string>> = {
      nome: parsed.full,
      nome_completo: parsed.full,
      primeiro_nome: parsed.first,
      sobrenome: parsed.last,
      telefone: formatPhone(conversation.contact_phone),
    };
    setCtx(base);

    const phoneKey = getChatPhoneKey(conversation.contact_phone);
    if (!phoneKey) return;

    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("contact_name, company_name, city, address, email, phone")
        .ilike("phone", `%${phoneKey}`)
        .limit(1)
        .maybeSingle();
      if (cancel || !data) return;
      setCtx({
        nome: conversation.contact_name || data.contact_name || "",
        empresa: data.company_name || "",
        cidade: data.city || "",
        endereco: data.address || "",
        email: data.email || "",
        telefone: formatPhone(conversation.contact_phone || data.phone || ""),
      });
    })();
    return () => { cancel = true; };
  }, [conversation?.contact_phone, conversation?.contact_name]);

  return ctx;
}
