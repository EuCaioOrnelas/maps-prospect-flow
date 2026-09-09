import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Leitura consolidada de TODOS os dados reais que alimentam o motor central
 * de Inteligência para um único contato. Nada é recalculado aqui: apenas
 * agregamos e interpretamos o que já existe no banco (conversas Evolution/Meta,
 * sinais do motor, histórico de pontuação, prospecção, vendas e padrões).
 */

const key8 = (p?: string | null) => (p || "").replace(/\D/g, "").slice(-8);

export interface ConversationAnalysis {
  total: number;
  inbound: number;
  outbound: number;
  reciprocity: number;         // 0-100
  avgResponseMinutes: number | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastMessageAt: string | null;
  waitingReplyHours: number | null; // inbound sem resposta
  activeDays: number;
  inboundStreak: number;
  audioCount: number;
  sources: string[];           // Evolution / Meta
  leadMessages: { content: string; at: string; direction: string; type: string }[];
}

export interface IntelSignalRow {
  id: string;
  signal_type: string;
  signal_group: string | null;
  confidence: number;
  source: string | null;
  occurred_at: string;
  meta: Record<string, unknown> | null;
}

export interface ScoreHistoryRow {
  created_at: string;
  event_type: string | null;
  category: string | null;
  points_applied: number;
  score_after: number | null;
}

export function useLeadIntelligenceDetail(phone?: string | null, crmLeadId?: string | null) {
  const { accountOwnerId } = useAuth();
  const target = key8(phone);

  const conversation = useQuery({
    queryKey: ["intel-detail-conversation", accountOwnerId, target],
    enabled: !!accountOwnerId && !!target,
    staleTime: 60_000,
    queryFn: async (): Promise<ConversationAnalysis | null> => {
      const { data: convs } = await supabase
        .from("chat_conversations")
        .select("id, contact_phone, phone_number_id, waba_connection_id, last_message_at")
        .eq("owner_user_id", accountOwnerId!);
      const mine = (convs || []).filter((c: any) => key8(c.contact_phone) === target);
      if (!mine.length) return null;

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("direction, content, message_type, created_at, metadata")
        .in("conversation_id", mine.map((c: any) => c.id))
        .order("created_at", { ascending: true })
        .limit(500);

      const rows = msgs || [];
      if (!rows.length) return null;

      const inboundRows = rows.filter((m: any) => m.direction === "inbound");
      const outboundRows = rows.filter((m: any) => m.direction !== "inbound");

      // tempo médio de resposta do vendedor (inbound -> próximo outbound)
      const deltas: number[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].direction !== "inbound") continue;
        const next = rows.slice(i + 1).find((m: any) => m.direction !== "inbound");
        if (!next) continue;
        const d = (new Date(next.created_at).getTime() - new Date(rows[i].created_at).getTime()) / 60000;
        if (d >= 0 && d < 60 * 48) deltas.push(d);
      }

      const last = rows[rows.length - 1];
      const lastInbound = [...inboundRows].pop();
      const lastOutbound = [...outboundRows].pop();

      // sequência final de mensagens do contato sem resposta
      let inboundStreak = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].direction === "inbound") inboundStreak++;
        else break;
      }

      const waitingReplyHours =
        last?.direction === "inbound"
          ? (Date.now() - new Date(last.created_at).getTime()) / 3600000
          : null;

      const days = new Set(rows.map((m: any) => new Date(m.created_at).toISOString().slice(0, 10)));
      const sources = Array.from(
        new Set(
          mine.map((c: any) => (c.phone_number_id ? "WhatsApp Oficial (Meta)" : "WhatsApp (Evolution)"))
        )
      );

      return {
        total: rows.length,
        inbound: inboundRows.length,
        outbound: outboundRows.length,
        reciprocity: rows.length ? Math.round((inboundRows.length / rows.length) * 100) : 0,
        avgResponseMinutes: deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null,
        lastInboundAt: lastInbound?.created_at || null,
        lastOutboundAt: lastOutbound?.created_at || null,
        lastMessageAt: last?.created_at || null,
        waitingReplyHours,
        activeDays: days.size,
        inboundStreak,
        audioCount: rows.filter((m: any) => m.message_type === "audio").length,
        sources,
        leadMessages: inboundRows
          .slice(-30)
          .map((m: any) => ({
            content: m.content || (m.message_type === "audio" ? "(áudio)" : "(mídia)"),
            at: m.created_at,
            direction: m.direction,
            type: m.message_type,
          })),
      };
    },
  });

  const signals = useQuery({
    queryKey: ["intel-detail-signals", accountOwnerId, target],
    enabled: !!accountOwnerId && !!target,
    staleTime: 60_000,
    queryFn: async (): Promise<IntelSignalRow[]> => {
      const { data } = await supabase
        .from("intel_signals")
        .select("id, signal_type, signal_group, confidence, source, occurred_at, meta, phone_e164")
        .eq("owner_user_id", accountOwnerId!)
        .order("occurred_at", { ascending: false })
        .limit(400);
      return ((data || []) as any[])
        .filter((s) => key8(s.phone_e164) === target)
        .slice(0, 60) as IntelSignalRow[];
    },
  });

  const history = useQuery({
    queryKey: ["intel-detail-history", accountOwnerId, target],
    enabled: !!accountOwnerId && !!target,
    staleTime: 60_000,
    queryFn: async (): Promise<ScoreHistoryRow[]> => {
      const { data: rl } = await supabase
        .from("revenue_leads")
        .select("id, phone_e164")
        .eq("owner_user_id", accountOwnerId!);
      const lead = (rl || []).find((r: any) => key8(r.phone_e164) === target);
      if (!lead) return [];
      const { data } = await supabase
        .from("revenue_score_logs")
        .select("created_at, event_type, category, points_applied, score_after")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(120);
      return (data || []) as ScoreHistoryRow[];
    },
  });

  const deals = useQuery({
    queryKey: ["intel-detail-deals", crmLeadId],
    enabled: !!crmLeadId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_deals")
        .select("id, title, value, status, closed_at, created_at, notes, sale_type")
        .eq("lead_id", crmLeadId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const patterns = useQuery({
    queryKey: ["intel-detail-patterns", accountOwnerId],
    enabled: !!accountOwnerId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("intel_patterns")
        .select("pattern_kind, pattern_key, niche, region, sample_size, outcome_count, rate, avg_ticket, avg_days_to_close")
        .eq("owner_user_id", accountOwnerId!)
        .order("sample_size", { ascending: false })
        .limit(40);
      return data || [];
    },
  });

  return {
    conversation: conversation.data || null,
    signals: signals.data || [],
    history: history.data || [],
    deals: deals.data || [],
    patterns: patterns.data || [],
    isLoading:
      conversation.isLoading || signals.isLoading || history.isLoading || deals.isLoading,
  };
}
