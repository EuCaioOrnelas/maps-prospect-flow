import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type CRMWhatsAppStatus =
  | "never_contacted"
  | "message_sent"
  | "replied"
  | "in_conversation"
  | "no_response"
  | "blocked";

const CHAT_STATUS_LABELS: Record<CRMWhatsAppStatus, string> = {
  never_contacted: "Nunca contatado",
  message_sent: "Mensagem enviada",
  replied: "Respondeu",
  in_conversation: "Em conversa",
  no_response: "Sem resposta",
  blocked: "Bloqueado/Inválido",
};

const STATUS_PRIORITY = Object.values(CHAT_STATUS_LABELS);

export interface ChatCRMLeadRecord {
  phoneKey: string;
  tags: string[];
  statusLabel: string | null;
  stageId: string | null;
  stageName: string | null;
  score: number;
  updatedAt: string;
}

export const getChatPhoneKey = (phone: string) => phone.replace(/\D/g, "").slice(-8);

const sortFilterTags = (tags: string[]) => {
  return [...tags].sort((a, b) => {
    const aPriority = STATUS_PRIORITY.indexOf(a);
    const bPriority = STATUS_PRIORITY.indexOf(b);

    if (aPriority !== -1 || bPriority !== -1) {
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    }

    return a.localeCompare(b, "pt-BR");
  });
};

export function useChatCRMFilters() {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableStages, setAvailableStages] = useState<string[]>([]);
  const [crmLeadByPhoneKey, setCrmLeadByPhoneKey] = useState<Record<string, ChatCRMLeadRecord>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCRMData = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setAvailableTags([]);
            setAvailableStages([]);
            setCrmLeadByPhoneKey({});
          }
          return;
        }

        const [stagesResponse, leadsResponse] = await Promise.all([
          supabase
            .from("pipeline_stages")
            .select("id, name, position")
            .eq("user_id", user.id)
            .order("position"),
          supabase
            .from("leads")
            .select("phone, tags, whatsapp_status, pipeline_stage_id, ai_score, updated_at")
            .eq("user_id", user.id)
            .range(0, 4999),
        ]);

        if (stagesResponse.error) throw stagesResponse.error;
        if (leadsResponse.error) throw leadsResponse.error;

        const stageNameById = Object.fromEntries(
          (stagesResponse.data ?? []).map((stage) => [stage.id, stage.name]),
        );

        const tagsSet = new Set<string>(STATUS_PRIORITY);
        const nextLeadByPhoneKey: Record<string, ChatCRMLeadRecord> = {};

        for (const lead of leadsResponse.data ?? []) {
          const phoneKey = getChatPhoneKey(lead.phone ?? "");

          if (!phoneKey) continue;

          const cleanedTags = Array.isArray(lead.tags)
            ? lead.tags
                .filter((tag): tag is string => typeof tag === "string")
                .map((tag) => tag.trim())
                .filter(Boolean)
            : [];

          cleanedTags.forEach((tag) => tagsSet.add(tag));

          const statusLabel =
            typeof lead.whatsapp_status === "string" && lead.whatsapp_status in CHAT_STATUS_LABELS
              ? CHAT_STATUS_LABELS[lead.whatsapp_status as CRMWhatsAppStatus]
              : null;

          if (statusLabel) tagsSet.add(statusLabel);

          const nextRecord: ChatCRMLeadRecord = {
            phoneKey,
            tags: cleanedTags,
            statusLabel,
            stageId: lead.pipeline_stage_id,
            stageName: lead.pipeline_stage_id ? stageNameById[lead.pipeline_stage_id] ?? null : null,
            score: Number(lead.ai_score ?? 0),
            updatedAt: lead.updated_at ?? "",
          };

          const currentRecord = nextLeadByPhoneKey[phoneKey];

          if (
            !currentRecord ||
            new Date(nextRecord.updatedAt || 0).getTime() > new Date(currentRecord.updatedAt || 0).getTime()
          ) {
            nextLeadByPhoneKey[phoneKey] = nextRecord;
          }
        }

        if (cancelled) return;

        setAvailableStages((stagesResponse.data ?? []).map((stage) => stage.name));
        setAvailableTags(sortFilterTags(Array.from(tagsSet)));
        setCrmLeadByPhoneKey(nextLeadByPhoneKey);
      } catch (error) {
        console.error("Error loading CRM data for chat filters:", error);

        if (!cancelled) {
          setAvailableTags(STATUS_PRIORITY);
          setAvailableStages([]);
          setCrmLeadByPhoneKey({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCRMData();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    availableTags,
    availableStages,
    crmLeadByPhoneKey,
    loading,
  };
}