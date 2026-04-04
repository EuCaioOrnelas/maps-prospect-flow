import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Send,
  Pause,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Smartphone,
  History,
  Plus,
  BarChart3,
  Crown,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LeadSelector } from "@/components/whatsapp/LeadSelector";
import { MessageVariations } from "@/components/whatsapp/MessageVariations";
import { MessageTypeSelector, MessageMode } from "@/components/whatsapp/MessageTypeSelector";
import { CampaignSettings } from "@/components/whatsapp/CampaignSettings";
import { CampaignProgress } from "@/components/whatsapp/CampaignProgress";
import { CampaignHistory } from "@/components/whatsapp/CampaignHistory";
import { CampaignSummary } from "@/components/whatsapp/CampaignSummary";
import { ActiveCampaigns } from "@/components/whatsapp/ActiveCampaigns";
import { RealtimeMonitor } from "@/components/whatsapp/RealtimeMonitor";
import { NumbersManager } from "@/components/whatsapp/NumbersManager";
import { useWhatsAppNumbers, WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";
import { NoConnectedNumbers } from "@/components/whatsapp/NoConnectedNumbers";
import { useCampaignRealtime } from "@/hooks/useCampaignRealtime";
import { useCampaignBalance } from "@/hooks/useCampaignBalance";
import { useCampaignDrafts, CampaignDraft } from "@/hooks/useCampaignDrafts";
import { DisclaimerModal } from "@/components/whatsapp/DisclaimerModal";
import { UpgradeModal } from "@/components/whatsapp/UpgradeModal";
import { FreeTrialLimitModal } from "@/components/whatsapp/FreeTrialLimitModal";
import { WarmingWarningModal } from "@/components/whatsapp/WarmingWarningModal";
import { FirstCampaignPromoModal } from "@/components/whatsapp/FirstCampaignPromoModal";
import { CampaignDrafts } from "@/components/whatsapp/CampaignDrafts";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

export interface Lead {
  name: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  mapsLink: string;
  aiMessage?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  delay_seconds: number;
  pause_after_contacts: number;
  pause_minutes: number;
  enable_smart_pause: boolean;
  messages: string[];
  leads: Lead[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  scheduled_at?: string | null;
  paused_at_limit?: boolean;
  pause_reason?: string;
  resume_at?: string | null;
  whatsapp_number_id?: string | null;
  total_responses?: number;
}

export interface CampaignState {
  status: "idle" | "connecting" | "connected" | "running" | "paused" | "completed" | "error";
  currentIndex: number;
  totalSent: number;
  totalFailed: number;
  isPausing: boolean;
  campaignId: string | null;
}

const WhatsAppCampaign = () => {
  const [activeTab, setActiveTab] = useState<"new" | "active" | "history">("new");
  const [step, setStep] = useState<"leads" | "message_type" | "messages" | "settings" | "summary" | "running">("leads");
  const [messageMode, setMessageMode] = useState<MessageMode>("custom");
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<string[]>(["", "", "", "", ""]);
  const [campaignName, setCampaignName] = useState("");
  const [delaySecondsMin, setDelaySecondsMin] = useState(120);
  const [delaySecondsMax, setDelaySecondsMax] = useState(180);
  const [pauseAfterContacts, setPauseAfterContacts] = useState(30);
  const [pauseMinutes, setPauseMinutes] = useState(5);
  const [enableSmartPause, setEnableSmartPause] = useState(true);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState("09:00");

  const [campaignState, setCampaignState] = useState<CampaignState>({
    status: "idle",
    currentIndex: 0,
    totalSent: 0,
    totalFailed: 0,
    isPausing: false,
    campaignId: null,
  });

  const [isStartingCampaign, setIsStartingCampaign] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, isTrialExpired, refreshProfile } = useAuth();
  const { trackScoreEvent } = useAutoScoreTracking("whatsapp");

  // Free trial limits
  const FREE_TRIAL_MESSAGE_LIMIT = 400;
  const FREE_DAILY_LIMIT = 20;
  const isFreePlan = profile?.plan === "free" || !profile?.plan;
  const trialMessagesUsed = profile?.trial_messages_sent || 0;
  const hasReachedTrialLimit = isFreePlan && trialMessagesUsed >= FREE_TRIAL_MESSAGE_LIMIT;
  const remainingTrialMessages = FREE_TRIAL_MESSAGE_LIMIT - trialMessagesUsed;

  // Show upgrade modal only if trial expired (not for free trial users who can still use)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTrialLimitModal, setShowTrialLimitModal] = useState(false);
  const [showWarmingWarningModal, setShowWarmingWarningModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [warmingInfo, setWarmingInfo] = useState<{
    level: number;
    status: "cold" | "warm" | "hot";
  } | null>(null);

  useEffect(() => {
    // If trial expired, show upgrade modal
    if (isFreePlan && isTrialExpired) {
      setShowUpgradeModal(true);
    }
    // If free trial but reached message limit, show trial limit modal
    else if (hasReachedTrialLimit && !isTrialExpired) {
      setShowTrialLimitModal(true);
    }
  }, [isFreePlan, isTrialExpired, hasReachedTrialLimit]);


  // Use realtime hook for campaigns
  const { campaigns, setCampaigns, loading: loadingCampaigns, fetchCampaigns } = useCampaignRealtime();

  const {
    numbers,
    setNumbers,
    selectedNumberId,
    setSelectedNumberId,
    loading: loadingNumbers,
    maxNumbers,
    hasMassMessagingAccess,
    hasConnectedNumbers,
    getRemainingDailyLimit,
    isAtDailyLimit,
    hasNumberPendingReset,
    canSendMessages,
    refreshConnectionStatus,
    DAILY_LIMIT_PER_NUMBER,
  } = useWhatsAppNumbers();

  const { getBalanceForDate } = useCampaignBalance();

  const {
    drafts,
    loading: loadingDrafts,
    saveDraft,
    deleteDraft,
    loadDraft,
    clearCurrentDraft,
    resetDraftState,
    currentDraftId,
  } = useCampaignDrafts();

  const [showConnectModal, setShowConnectModal] = useState(false);

  const selectedNumber = numbers.find((n) => n.id === selectedNumberId);
  const isConnected = selectedNumber?.is_connected || false;
  const usedToday = selectedNumber?.daily_sent_count || 0;
  const dailyLimit = DAILY_LIMIT_PER_NUMBER;
  const hasPendingReset = hasNumberPendingReset(selectedNumberId || undefined);

  const canProceedToMessages =
    selectedLeads.length > 0 && selectedLeads.length <= dailyLimit - usedToday && !hasPendingReset;

  // Validation for messages: all 5 filled, no links, no duplicates
  // IMPORTANT: Must match the same rules as MessageVariations.tsx component
  const LINK_REGEX_PAGE = /(?:https?:\/\/|www\.)[^\s]+/i;
  const MAX_MESSAGE_CHARS = 500;

  const messagesValidation = (() => {
    const filledMessages = messages.filter((m) => m.trim());
    const allFilled = filledMessages.length === 5;

    // Check for links - same regex as MessageVariations component
    const hasLinks = messages.some((m) => LINK_REGEX_PAGE.test(m));

    // Check for over limit
    const hasOverLimit = messages.some((m) => m.length > MAX_MESSAGE_CHARS);

    // Check for exact duplicates only (same logic as MessageVariations)
    const normalizedMessages = messages.map((m) => m.trim().toLowerCase());
    const seen = new Set<string>();
    let hasDuplicates = false;
    normalizedMessages.forEach((msg) => {
      if (msg.length > 0) {
        if (seen.has(msg)) {
          hasDuplicates = true;
        } else {
          seen.add(msg);
        }
      }
    });

    return { allFilled, hasLinks, hasOverLimit, hasDuplicates };
  })();

  // Only require all 5 messages filled - warnings are visual only, don't block
  const canProceedToSettings = messagesValidation.allFilled;
  const canStartCampaign =
    delaySecondsMin >= 40 &&
    delaySecondsMax >= delaySecondsMin &&
    (isConnected || isScheduled) &&
    !!selectedNumberId &&
    !hasPendingReset;

  const isValidSchedule = () => {
    if (!isScheduled) return true;
    if (!scheduledDate || !scheduledTime) return false;

    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);

    return scheduled > new Date();
  };

  const canStart = canStartCampaign && (!isScheduled || isValidSchedule());

  const createCampaign = async (scheduled: boolean = false): Promise<string | null> => {
    if (!user || !selectedNumberId) {
      console.error("[createCampaign] Blocked: missing user or selectedNumberId", { userId: user?.id, selectedNumberId });
      return null;
    }

    const name = campaignName || `Campanha ${new Date().toLocaleDateString("pt-BR")}`;

    let scheduledAt: string | null = null;
    if (scheduled && scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const schedDate = new Date(scheduledDate);
      schedDate.setHours(hours, minutes, 0, 0);
      scheduledAt = schedDate.toISOString();
    }

    try {
      const { data, error } = await supabase
        .from("whatsapp_campaigns")
        .insert({
          user_id: user.id,
          name,
          status: scheduled ? "scheduled" : "running",
          total_leads: selectedLeads.length,
          delay_seconds: delaySecondsMin,
          delay_seconds_max: delaySecondsMax,
          pause_after_contacts: pauseAfterContacts,
          pause_minutes: pauseMinutes,
          enable_smart_pause: enableSmartPause,
          messages: messageMode === "ai_generated" ? [] : messages,
          leads: selectedLeads as unknown as any,
          started_at: scheduled ? null : new Date().toISOString(),
          scheduled_at: scheduledAt,
          whatsapp_number_id: selectedNumberId,
          current_lead_index: 0,
          message_mode: messageMode,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // If scheduled, create a reservation for the balance
      if (scheduled && scheduledAt && data) {
        const scheduleDate = new Date(scheduledAt);
        await supabase.from("campaign_daily_reservations").insert({
          campaign_id: data.id,
          whatsapp_number_id: selectedNumberId,
          reserved_date: scheduleDate.toISOString().split("T")[0],
          reserved_count: selectedLeads.length,
        });
      }

      return data.id;
    } catch (err) {
      console.error("Error creating campaign:", err);
      toast({
        title: "Erro",
        description: "Não foi possível criar a campanha",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCampaign = async (
    campaignId: string,
    updates: {
      status?: string;
      sent_count?: number;
      failed_count?: number;
      completed_at?: string;
      paused_at_limit?: boolean;
      pause_reason?: string;
    },
  ) => {
    try {
      await supabase.from("whatsapp_campaigns").update(updates).eq("id", campaignId);
    } catch (err) {
      console.error("Error updating campaign:", err);
    }
  };

  // Check warming status and show warning if not heated, then proceed to start
  const checkWarmingAndProceed = async () => {
    if (!selectedNumberId) {
      toast({
        title: "Selecione um número",
        description: "Escolha um número WhatsApp para os disparos",
        variant: "destructive",
      });
      return;
    }

    // Check warming session for selected number
    const { data: warmingSession } = await supabase
      .from("warming_sessions")
      .select("warming_level, status")
      .eq("whatsapp_number_id", selectedNumberId)
      .maybeSingle();

    // Determine warming status based on level and completion
    let warmingStatus: "cold" | "warm" | "hot" = "cold";
    const warmingLevel = warmingSession?.warming_level || 0;

    if (warmingSession?.status === "completed") {
      warmingStatus = "hot";
    } else if (warmingLevel >= 3) {
      warmingStatus = "warm";
    } else {
      warmingStatus = "cold";
    }

    // If not fully heated, show warning modal
    if (warmingStatus !== "hot" && warmingLevel > 0) {
      setWarmingInfo({ level: warmingLevel, status: warmingStatus });
      setShowWarmingWarningModal(true);
      return;
    }

    // Proceed directly to start campaign (no window modal)
    handleStartCampaign();
  };

  // Called after warming warning is accepted - proceed to start campaign directly
  const handleShowWindowModal = () => {
    setShowWarmingWarningModal(false);
    handleStartCampaign();
  };

  const handleStartCampaign = async () => {
    // Prevent double-submit
    if (isStartingCampaign) return;

    if (!selectedNumberId) {
      toast({
        title: "Selecione um número",
        description: "Escolha um número WhatsApp para os disparos",
        variant: "destructive",
      });
      return;
    }

    // Set guard immediately to block concurrent calls
    setIsStartingCampaign(true);

    // If scheduled, validate balance and create the campaign
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        toast({
          title: "Data não selecionada",
          description: "Selecione uma data e horário para agendar",
          variant: "destructive",
        });
        setIsStartingCampaign(false);
        return;
      }

      // Validate balance for the scheduled date
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const targetDate = new Date(scheduledDate);
      targetDate.setHours(hours, minutes, 0, 0);

      const balanceInfo = await getBalanceForDate(selectedNumberId, targetDate, selectedLeads.length);

      if (!balanceInfo.canSend) {
        toast({
          title: "Saldo insuficiente",
          description: `O número selecionado só tem ${balanceInfo.available} disparos disponíveis para esta data. Você precisa de ${selectedLeads.length}.`,
          variant: "destructive",
        });
        setIsStartingCampaign(false);
        return;
      }

      const campaignId = await createCampaign(true);
      if (!campaignId) {
        setIsStartingCampaign(false);
        return;
      }

      toast({
        title: "Campanha agendada!",
        description: `A campanha será iniciada no horário programado`,
      });

      // Track score events for scheduled campaign
      trackScoreEvent("campaign_sent", { leads_count: selectedLeads.length, scheduled: true });
      trackScoreEvent("scheduled_campaign_created");
      trackScoreEvent("message_campaign_created");

      handleNewCampaign();
      setActiveTab("history");
      setIsStartingCampaign(false);
      return;
    }

    // Validate balance for immediate campaign (today)
    const balanceInfo = await getBalanceForDate(selectedNumberId, new Date(), selectedLeads.length);

    if (!balanceInfo.canSend) {
      toast({
        title: "Limite diário excedido",
        description: `O número selecionado só tem ${balanceInfo.available} disparos disponíveis hoje. Você precisa de ${selectedLeads.length}.`,
        variant: "destructive",
      });
      setIsStartingCampaign(false);
      return;
    }

    // Check free trial limit
    if (isFreePlan && !isTrialExpired) {
      if (selectedLeads.length > remainingTrialMessages) {
        toast({
          title: "Limite do teste gratuito",
          description: `Você só pode enviar mais ${remainingTrialMessages} mensagens no período de teste`,
          variant: "destructive",
        });
        setIsStartingCampaign(false);
        return;
      }
    }

    // Regular start - requires connection
    if (!isConnected) {
      toast({
        title: "WhatsApp não conectado",
        description: "Conecte o número selecionado antes de iniciar",
        variant: "destructive",
      });
      setIsStartingCampaign(false);
      return;
    }

    // VALIDATE BEFORE creating campaign - verify number still exists in DB
    // This prevents campaigns from being created with a deleted/invalid number
    const { data: numberCheck, error: numberCheckError } = await supabase
      .from("whatsapp_numbers")
      .select("id, instance_name, is_connected")
      .eq("id", selectedNumberId)
      .maybeSingle();

    if (numberCheckError || !numberCheck) {
      toast({
        title: "Número não encontrado",
        description: "O número selecionado não existe mais. Selecione outro número.",
        variant: "destructive",
      });
      setSelectedNumberId(null);
      setIsStartingCampaign(false);
      return;
    }

    const instanceName = numberCheck.instance_name;

    if (!instanceName) {
      toast({
        title: "Erro",
        description: "Número não tem instância configurada. Reconecte o WhatsApp.",
        variant: "destructive",
      });
      setIsStartingCampaign(false);
      return;
    }

    if (!numberCheck.is_connected) {
      toast({
        title: "WhatsApp desconectado",
        description: "O número selecionado perdeu a conexão. Reconecte antes de iniciar.",
        variant: "destructive",
      });
      setIsStartingCampaign(false);
      return;
    }

    // Validate messages only in custom mode
    if (messageMode === "custom") {
      const validMessages = messages.filter((m) => m.trim());

      if (validMessages.length < 5) {
        toast({
          title: "Erro",
          description: "Preencha todas as 5 variações de mensagem.",
          variant: "destructive",
        });
        setIsStartingCampaign(false);
        return;
      }
    } else {
      // AI mode - validate all leads have aiMessage
      const leadsWithoutAi = selectedLeads.filter((l) => !l.aiMessage?.trim());
      if (leadsWithoutAi.length > 0) {
        toast({
          title: "Erro",
          description: `${leadsWithoutAi.length} leads sem mensagem IA. Volte e gere as mensagens.`,
          variant: "destructive",
        });
        setIsStartingCampaign(false);
        return;
      }
    }

    try {
      // Only create campaign AFTER all validations pass
      const campaignId = await createCampaign(false);
      if (!campaignId) {
        setIsStartingCampaign(false);
        return;
      }

      // Clear draft after successful campaign creation
      await handleCampaignCreatedFromDraft();

      setCampaignState((prev) => ({ ...prev, status: "running", campaignId }));

      // Fire-and-forget: trigger the campaign processor without waiting
      // The cron job will pick it up and continue processing
      supabase.functions
        .invoke("campaign-processor", {
          body: {
            campaignId,
            action: "start",
          },
        })
        .catch((err) => {
          // Log but don't block - cron will pick up the campaign
          console.log("Initial campaign trigger (cron will continue):", err?.message || "triggered");
        });

      // Trial messages are now counted per actual sent message in campaign-processor
      // No upfront deduction needed

      toast({
        title: "Campanha iniciada!",
        description: `Enviando mensagens para ${selectedLeads.length} contatos. O processamento começará em instantes.`,
      });

      // Track score events
      trackScoreEvent("campaign_sent", { leads_count: selectedLeads.length });
      trackScoreEvent("message_campaign_created");

      // Show promo popup for free users on their first campaign (only once, persisted in DB)
      if (isFreePlan && !isTrialExpired && user) {
        const { count } = await supabase
          .from("user_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("event_name", "promo_first_campaign_seen");

        if (!count || count === 0) {
          await supabase.from("user_events").insert({
            user_id: user.id,
            event_name: "promo_first_campaign_seen",
            event_data: { coupon: "FIRST50" },
          });
          setTimeout(() => setShowPromoModal(true), 800);
        }
      }

      // Reset form state and redirect immediately
      handleNewCampaign();
      setIsStartingCampaign(false);
      setActiveTab("active");
    } catch (err) {
      console.error("Error in handleStartCampaign:", err);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a campanha",
        variant: "destructive",
      });
      setIsStartingCampaign(false);
    }
  };

  const handlePauseCampaign = async () => {
    setCampaignState((prev) => ({
      ...prev,
      status: "paused",
      isPausing: true,
    }));

    if (campaignState.campaignId) {
      await updateCampaign(campaignState.campaignId, { status: "paused" });
    }

    toast({
      title: "Campanha pausada",
      description: "A campanha foi pausada. Clique em continuar para retomar.",
    });
  };

  const handleResumeCampaign = async () => {
    setCampaignState((prev) => ({
      ...prev,
      status: "running",
      isPausing: false,
    }));

    if (campaignState.campaignId) {
      await updateCampaign(campaignState.campaignId, { status: "running" });
    }

    toast({
      title: "Campanha retomada",
      description: "Continuando os disparos...",
    });
  };

  const handleStopCampaign = async () => {
    setCampaignState((prev) => ({ ...prev, status: "completed" }));

    if (campaignState.campaignId) {
      await updateCampaign(campaignState.campaignId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        sent_count: campaignState.totalSent,
        failed_count: campaignState.totalFailed,
      });
    }

    await fetchCampaigns();

    toast({
      title: "Campanha encerrada",
      description: `${campaignState.totalSent} mensagens enviadas`,
    });
  };

  const handleUpdateStats = async (sent: number, failed: number) => {
    if (campaignState.campaignId) {
      await updateCampaign(campaignState.campaignId, {
        sent_count: sent,
        failed_count: failed,
      });
    }
  };

  const handleNewCampaign = () => {
    setStep("leads");
    setSelectedLeads([]);
    setMessages(["", "", "", "", ""]);
    setCampaignName("");
    setMessageMode("custom");
    setDelaySecondsMin(120);
    setDelaySecondsMax(180);
    setIsScheduled(false);
    setScheduledDate(undefined);
    setScheduledTime("09:00");
    setCampaignState({
      status: isConnected ? "connected" : "idle",
      currentIndex: 0,
      totalSent: 0,
      totalFailed: 0,
      isPausing: false,
      campaignId: null,
    });
    setActiveTab("new");
    resetDraftState();
  };

  // Auto-save draft when step changes or data changes
  const saveDraftDebounced = useCallback(async () => {
    if (step === "running") return;
    if (activeTab !== "new") return;

    await saveDraft({
      step,
      selectedLeads,
      messages,
      campaignName,
      delaySecondsMin,
      delaySecondsMax,
      pauseAfterContacts,
      pauseMinutes,
      enableSmartPause,
      isScheduled,
      scheduledDate,
      scheduledTime,
      selectedNumberId,
    });
  }, [
    step,
    selectedLeads,
    messages,
    campaignName,
    delaySecondsMin,
    delaySecondsMax,
    pauseAfterContacts,
    pauseMinutes,
    enableSmartPause,
    isScheduled,
    scheduledDate,
    scheduledTime,
    selectedNumberId,
    saveDraft,
    activeTab,
  ]);

  // Save draft when navigating between steps
  useEffect(() => {
    if (step !== "leads" || selectedLeads.length > 0 || messages.some((m) => m.trim()) || campaignName) {
      const timer = setTimeout(saveDraftDebounced, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, selectedLeads, messages, campaignName, saveDraftDebounced]);

  const handleLoadDraft = (draft: CampaignDraft) => {
    loadDraft(draft);
    setStep(draft.step);
    setSelectedLeads(draft.selected_leads || []);
    setMessages(draft.messages || ["", "", "", "", ""]);
    setCampaignName(draft.campaign_name || "");
    setDelaySecondsMin(Math.max(120, draft.delay_seconds_min || 120));
    setDelaySecondsMax(Math.max(120, draft.delay_seconds_max || 180));
    setPauseAfterContacts(draft.pause_after_contacts || 30);
    setPauseMinutes(draft.pause_minutes || 5);
    setEnableSmartPause(draft.enable_smart_pause ?? true);
    setIsScheduled(draft.is_scheduled || false);
    setScheduledDate(draft.scheduled_date ? new Date(draft.scheduled_date) : undefined);
    setScheduledTime(draft.scheduled_time || "09:00");

    // Validate that saved number still exists and is connected
    const savedNumber = numbers.find(n => n.id === draft.selected_number_id && n.is_connected);
    if (savedNumber) {
      setSelectedNumberId(draft.selected_number_id);
    } else {
      setSelectedNumberId(null);
      if (draft.selected_number_id) {
        toast({
          title: "Número não disponível",
          description: "O número salvo no rascunho não está mais conectado. Selecione outro nas Configurações.",
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Rascunho carregado",
      description: "Continue de onde parou",
    });
  };

  // Delete draft when campaign is successfully created
  const handleCampaignCreatedFromDraft = async () => {
    if (currentDraftId) {
      await clearCurrentDraft();
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase.from("whatsapp_campaigns").delete().eq("id", campaignId);

      if (error) throw error;

      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      toast({
        title: "Campanha excluída",
        description: "A campanha foi removida do histórico",
      });
    } catch (err) {
      console.error("Error deleting campaign:", err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a campanha",
        variant: "destructive",
      });
    }
  };

  const handleStopCampaignFromList = async (campaign: Campaign) => {
    try {
      await supabase
        .from("whatsapp_campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? {
                ...c,
                status: "completed",
                completed_at: new Date().toISOString(),
              }
            : c,
        ),
      );

      toast({
        title: "Campanha encerrada",
        description: `Campanha "${campaign.name}" foi encerrada`,
      });
    } catch (err) {
      console.error("Error stopping campaign:", err);
    }
  };

  const handlePauseCampaignFromList = async (campaign: Campaign) => {
    try {
      await supabase
        .from("whatsapp_campaigns")
        .update({
          status: "paused",
          pause_reason: "manual",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: "paused", pause_reason: "manual" } : c)),
      );

      toast({
        title: "Campanha pausada",
        description: "Clique em 'Retomar' para continuar os disparos a qualquer momento.",
      });
    } catch (err) {
      console.error("Error pausing campaign:", err);
      toast({
        title: "Erro",
        description: "Não foi possível pausar a campanha",
        variant: "destructive",
      });
    }
  };

  const handleResumeCampaignFromList = async (campaign: Campaign) => {
    // Find the number associated with this campaign
    const campaignNumber = numbers.find((n) => n.id === campaign.whatsapp_number_id);

    if (!campaignNumber) {
      toast({
        title: "Erro",
        description: "Número WhatsApp não encontrado para esta campanha",
        variant: "destructive",
      });
      return;
    }

    // Check if number is connected
    if (!campaignNumber.is_connected) {
      toast({
        title: "WhatsApp desconectado",
        description: `Reconecte o número "${campaignNumber.name}" antes de retomar`,
        variant: "destructive",
      });
      return;
    }

    // Check daily limit
    if (campaignNumber.daily_sent_count >= dailyLimit) {
      toast({
        title: "Limite diário atingido",
        description: `O número "${campaignNumber.name}" atingiu o limite de ${dailyLimit} disparos hoje. A campanha será retomada automaticamente amanhã.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await supabase
        .from("whatsapp_campaigns")
        .update({
          status: "running",
          paused_at_limit: false,
          pause_reason: null,
          resume_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? {
                ...c,
                status: "running",
                paused_at_limit: false,
                pause_reason: undefined,
                resume_at: undefined,
              }
            : c,
        ),
      );

      toast({
        title: "Campanha retomada",
        description: `Continuando os disparos. Saldo disponível: ${dailyLimit - campaignNumber.daily_sent_count} mensagens.`,
      });
    } catch (err) {
      console.error("Error resuming campaign:", err);
      toast({
        title: "Erro",
        description: "Não foi possível retomar a campanha",
        variant: "destructive",
      });
    }
  };

  const renderStepIndicator = () => {
    const allSteps = messageMode === "ai_generated"
      ? ["leads", "message_type", "settings", "summary"]
      : ["leads", "message_type", "messages", "settings", "summary"];
    const allLabels = messageMode === "ai_generated"
      ? ["Leads", "Tipo", "Configurações", "Resumo"]
      : ["Leads", "Tipo", "Mensagens", "Configurações", "Resumo"];
    const stepIndex = allSteps.indexOf(step);

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {allSteps.map((s, i) => {
          const isActive = s === step;
          const isCompleted = i < stepIndex;

          return (
            <div key={s} className="flex items-center">
              <div
                className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }
              `}
              >
                {isCompleted ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {allLabels[i]}
              </span>
              {i < allSteps.length - 1 && <div className="w-8 sm:w-12 h-px bg-border mx-2" />}
            </div>
          );
        })}
      </div>
    );
  };

  // Show upgrade prompt for free users
  // Show upgrade modal for free users with expired trial
  if (isFreePlan && isTrialExpired) {
    return (
      <div className="min-h-screen bg-background">
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => navigate("/dashboard")} />
      </div>
    );
  }

  // Show trial limit modal for free users who reached message limit
  if (hasReachedTrialLimit && !isTrialExpired) {
    return (
      <div className="min-h-screen bg-background">
        <FreeTrialLimitModal
          isOpen={showTrialLimitModal}
          onClose={() => setShowTrialLimitModal(false)}
          usedMessages={trialMessagesUsed}
          limit={FREE_TRIAL_MESSAGE_LIMIT}
        />
      </div>
    );
  }

  if (!hasMassMessagingAccess && !isFreePlan) {
    return (
      <div className="min-h-screen bg-background">
        <UpgradeModal isOpen={true} onClose={() => navigate("/dashboard")} />
      </div>
    );
  }

  // Handler para abrir o modal de conectar número
  const handleConnectNumber = () => {
    setShowConnectModal(true);
  };

  // Se não tem nenhum número conectado, mostra tela especial
  if (!loadingNumbers && !hasConnectedNumbers) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <DisclaimerModal />
        <AppSidebar profile={profile} />
        <AppHeader profile={profile} />

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 lg:pl-[88px]">
          <NoConnectedNumbers onConnectClick={handleConnectNumber} />
        </main>

        {/* Modal de gerenciamento de números - só mostra os dialogs, sem os botões */}
        <NumbersManager
          numbers={numbers}
          onNumbersChange={setNumbers}
          maxNumbers={maxNumbers}
          onConnect={setSelectedNumberId}
          forceOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          hideButtons={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <BackgroundGlow />
      <DisclaimerModal />

      {/* Warming Warning Modal */}
      <WarmingWarningModal
        isOpen={showWarmingWarningModal}
        onClose={() => setShowWarmingWarningModal(false)}
        onConfirm={handleShowWindowModal}
        warmingLevel={warmingInfo?.level || 0}
        warmingStatus={warmingInfo?.status || "cold"}
      />
      <AppSidebar profile={profile} />
      <AppHeader profile={profile} />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 lg:pl-[88px]">
        {/* Page Header */}
          <div className="max-w-4xl mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Prospecção</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Abordagem outbound para novos leads, sem opt-in prévio. Requer boas práticas para manter a estabilidade do canal.</p>
          </div>
          <div className="flex items-center gap-2">
            <NumbersManager
              numbers={numbers}
              onNumbersChange={setNumbers}
              maxNumbers={maxNumbers}
              onConnect={setSelectedNumberId}
            />
          </div>
        </div>
        {/* Pending Reset Warning */}
        {hasPendingReset && selectedNumber && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 flex-shrink-0">
                  <Clock className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Reset pendente</p>
                  <p className="text-xs text-muted-foreground">
                    O contador de disparos do número "{selectedNumber.name}" precisa ser resetado. O reset ocorre
                    automaticamente à meia-noite. Aguarde o horário de reset para continuar os disparos.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshConnectionStatus} className="flex-shrink-0">
                  Verificar novamente
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Free Trial Indicator */}
        {isFreePlan && !isTrialExpired && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
              <div className="flex flex-col gap-4">
                {/* Total trial balance */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Saldo Total (Teste Gratuito)</p>
                      <p className="text-xs text-muted-foreground">Contagem baseada em mensagens realmente enviadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 sm:flex-none">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-foreground">
                          {trialMessagesUsed} / {FREE_TRIAL_MESSAGE_LIMIT}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">{remainingTrialMessages} restantes</span>
                      </div>
                      <div className="w-full sm:w-48 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            trialMessagesUsed >= FREE_TRIAL_MESSAGE_LIMIT * 0.9
                              ? "bg-destructive"
                              : trialMessagesUsed >= FREE_TRIAL_MESSAGE_LIMIT * 0.7
                                ? "bg-warning"
                                : "bg-primary"
                          }`}
                          style={{
                            width: `${Math.min((trialMessagesUsed / FREE_TRIAL_MESSAGE_LIMIT) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily limit info */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Limite diário: {FREE_DAILY_LIMIT} disparos/dia</span>
                    {" "}— Ao atingir, a campanha pausa e retoma automaticamente no dia seguinte. 
                    Apenas mensagens enviadas com sucesso são descontadas do saldo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {step !== "running" && (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "new" | "active" | "history")}
              className="mb-8"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="new" className="gap-2">
                  <Plus size={16} />
                  Nova Campanha
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-2">
                  <Play size={16} />
                  Em Andamento
                  {campaigns.filter((c) => c.status === "running" || c.status === "paused" || c.status === "scheduled")
                    .length > 0 && (
                    <span className="ml-1 min-w-5 h-5 px-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full inline-flex items-center justify-center">
                      {
                        campaigns.filter(
                          (c) => c.status === "running" || c.status === "paused" || c.status === "scheduled",
                        ).length
                      }
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History size={16} />
                  Histórico
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {activeTab === "history" && step !== "running" ? (
            <CampaignHistory
              campaigns={campaigns.filter((c) => c.status === "completed" || c.status === "failed")}
              loading={loadingCampaigns}
              onDelete={handleDeleteCampaign}
              onNewCampaign={handleNewCampaign}
              onPause={handlePauseCampaignFromList}
              onResume={handleResumeCampaignFromList}
              numbers={numbers}
            />
          ) : activeTab === "active" && step !== "running" ? (
            <>
              <RealtimeMonitor
                campaigns={campaigns}
                numbers={numbers}
                onPause={handlePauseCampaignFromList}
                onResume={handleResumeCampaignFromList}
                onStop={handleStopCampaignFromList}
              />

              <ActiveCampaigns
                campaigns={campaigns}
                usedToday={usedToday}
                dailyLimit={dailyLimit}
                onResume={handleResumeCampaignFromList}
                onPause={handlePauseCampaignFromList}
              />
            </>
          ) : (
            <>
              {/* Drafts Section */}
              {step === "leads" && activeTab === "new" && (
                <CampaignDrafts
                  drafts={drafts}
                  onLoadDraft={handleLoadDraft}
                  onDeleteDraft={deleteDraft}
                  loading={loadingDrafts}
                />
              )}

              {step !== "running" && activeTab === "new" && renderStepIndicator()}

              {/* Step: Select Leads */}
              {step === "leads" && (
                <LeadSelector
                  selectedLeads={selectedLeads}
                  onLeadsChange={setSelectedLeads}
                  onNext={() => setStep("message_type")}
                  onCancel={handleNewCampaign}
                  canProceed={canProceedToMessages}
                  dailyLimit={dailyLimit}
                  usedToday={usedToday}
                  selectedNumberId={selectedNumberId}
                  selectedNumberName={selectedNumber?.name}
                  isScheduled={isScheduled}
                  scheduledDate={scheduledDate}
                />
              )}

              {/* Step: Message Type Selection */}
              {step === "message_type" && (
                <MessageTypeSelector
                  selectedLeads={selectedLeads}
                  messageMode={messageMode}
                  onMessageModeChange={setMessageMode}
                  onBack={() => setStep("leads")}
                  onNext={() => {
                    if (messageMode === "ai_generated") {
                      setStep("settings");
                    } else {
                      setStep("messages");
                    }
                  }}
                  onLeadsUpdate={setSelectedLeads}
                />
              )}

              {/* Step: Message Variations (only for custom mode) */}
              {step === "messages" && (
                <MessageVariations
                  messages={messages}
                  onMessagesChange={setMessages}
                  onBack={() => setStep("message_type")}
                  onNext={() => setStep("settings")}
                  canProceed={canProceedToSettings}
                  selectedLeads={selectedLeads}
                />
              )}

              {/* Step: Campaign Settings */}
              {step === "settings" && (
                <CampaignSettings
                  campaignName={campaignName}
                  onCampaignNameChange={setCampaignName}
                  delaySecondsMin={delaySecondsMin}
                  delaySecondsMax={delaySecondsMax}
                  onDelayMinChange={setDelaySecondsMin}
                  onDelayMaxChange={setDelaySecondsMax}
                  pauseAfterContacts={pauseAfterContacts}
                  onPauseAfterContactsChange={setPauseAfterContacts}
                  pauseMinutes={pauseMinutes}
                  onPauseMinutesChange={setPauseMinutes}
                  enableSmartPause={enableSmartPause}
                  onEnableSmartPauseChange={setEnableSmartPause}
                  isScheduled={isScheduled}
                  onScheduleChange={setIsScheduled}
                  scheduledDate={scheduledDate}
                  onScheduledDateChange={setScheduledDate}
                  scheduledTime={scheduledTime}
                  onScheduledTimeChange={setScheduledTime}
                  onBack={() => setStep(messageMode === "ai_generated" ? "message_type" : "messages")}
                  onNext={() => setStep("summary")}
                  isConnected={isConnected}
                  totalLeads={selectedLeads.length}
                  numbers={numbers}
                  selectedNumberId={selectedNumberId}
                  onSelectNumber={setSelectedNumberId}
                  dailyLimit={dailyLimit}
                  maxNumbers={maxNumbers}
                  userPlan={profile?.plan || "free"}
                />
              )}

              {/* Step: Campaign Summary */}
              {step === "summary" && (
                <CampaignSummary
                  campaignName={campaignName}
                  selectedLeads={selectedLeads}
                  messages={messages}
                  delaySecondsMin={delaySecondsMin}
                  delaySecondsMax={delaySecondsMax}
                  pauseAfterContacts={pauseAfterContacts}
                  pauseMinutes={pauseMinutes}
                  enableSmartPause={enableSmartPause}
                  isScheduled={isScheduled}
                  scheduledDate={scheduledDate}
                  scheduledTime={scheduledTime}
                  selectedNumber={selectedNumber}
                  isConnected={isConnected}
                  onBack={() => setStep("settings")}
                  onStartCampaign={checkWarmingAndProceed}
                  canStart={canStart}
                  isStarting={isStartingCampaign}
                />
              )}

              {/* Step: Campaign Running */}
              {step === "running" && (
                <CampaignProgress
                  campaignState={campaignState}
                  totalLeads={selectedLeads.length}
                  messages={messages}
                  delaySecondsMin={delaySecondsMin}
                  delaySecondsMax={delaySecondsMax}
                  pauseAfterContacts={pauseAfterContacts}
                  pauseMinutes={pauseMinutes}
                  enableSmartPause={enableSmartPause}
                  onPause={handlePauseCampaign}
                  onResume={handleResumeCampaign}
                  onStop={handleStopCampaign}
                  onNewCampaign={handleNewCampaign}
                  onUpdateStats={handleUpdateStats}
                />
              )}
            </>
          )}
        </div>
      </main>
      {/* First campaign promo modal for free users */}
      <FirstCampaignPromoModal
        open={showPromoModal}
        onClose={() => setShowPromoModal(false)}
      />
    </div>
  );
};

export default WhatsAppCampaign;
