import { resolveStorageUrl } from "@/lib/privateStorage";
import type { QuickReplyStep } from "@/hooks/useQuickReplies";

/**
 * Execução das mensagens rápidas (sequência com delays) fora do ciclo de vida do
 * componente: cada conversa tem a sua própria execução, então trocar de contato
 * não interrompe nem mistura sequências.
 */
export interface QuickReplyRun {
  conversationId: string;
  quickReplyId: string;
  shortcut: string;
  total: number;
  index: number;
  /** Segundos de espera até a próxima mensagem (0 = enviando agora). */
  waitSeconds: number;
  /** Timestamp em que a espera atual começou (para calcular o restante). */
  waitStartedAt: number;
}

type SendText = (text: string, replyToId: string | undefined, conversationId: string) => void;
type SendMedia = (file: File, caption: string | undefined, conversationId: string) => void;

const runs = new Map<string, QuickReplyRun>();
const cancelled = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

export function subscribeQuickReplyRuns(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getQuickReplyRun(conversationId: string | null | undefined): QuickReplyRun | null {
  if (!conversationId) return null;
  return runs.get(conversationId) || null;
}

export function cancelQuickReplyRun(conversationId: string) {
  cancelled.add(conversationId);
}

function setRun(conversationId: string, run: QuickReplyRun | null) {
  if (run) runs.set(conversationId, run);
  else runs.delete(conversationId);
  emit();
}

export async function startQuickReplyRun(params: {
  conversationId: string;
  quickReplyId: string;
  shortcut: string;
  steps: QuickReplyStep[];
  replyToId?: string;
  sendText: SendText;
  sendMedia: SendMedia;
}) {
  const { conversationId, quickReplyId, shortcut, steps, replyToId, sendText, sendMedia } = params;
  if (!conversationId || runs.has(conversationId)) return;

  cancelled.delete(conversationId);
  setRun(conversationId, {
    conversationId, quickReplyId, shortcut,
    total: steps.length, index: 0, waitSeconds: 0, waitStartedAt: Date.now(),
  });

  try {
    for (let i = 0; i < steps.length; i++) {
      if (cancelled.has(conversationId)) break;
      const step = steps[i];
      const waitMs = i === 0 ? 0 : Math.max(0, Number(step.delay_seconds) || 0) * 1000;

      if (waitMs > 0) {
        setRun(conversationId, {
          conversationId, quickReplyId, shortcut,
          total: steps.length, index: i, waitSeconds: waitMs / 1000, waitStartedAt: Date.now(),
        });
        await new Promise<void>(resolve => {
          const start = Date.now();
          const id = setInterval(() => {
            if (cancelled.has(conversationId) || Date.now() - start >= waitMs) {
              clearInterval(id);
              resolve();
            }
          }, 200);
        });
        if (cancelled.has(conversationId)) break;
      }

      setRun(conversationId, {
        conversationId, quickReplyId, shortcut,
        total: steps.length, index: i, waitSeconds: 0, waitStartedAt: Date.now(),
      });

      if (step.type === "text") {
        if ((step.content || "").trim()) {
          sendText(step.content!.trim(), i === 0 ? replyToId : undefined, conversationId);
        }
        continue;
      }
      if (!step.media_url) continue;
      try {
        const signed = (await resolveStorageUrl(step.media_url)) || step.media_url;
        const res = await fetch(signed);
        const blob = await res.blob();
        const fname = step.media_filename || `quick-reply-${shortcut}`;
        const file = new File([blob], fname, { type: blob.type || "application/octet-stream" });
        sendMedia(file, (step.content || "").trim() || undefined, conversationId);
      } catch (err) {
        console.error("[quick-reply] media fetch failed", err);
      }
    }
  } finally {
    cancelled.delete(conversationId);
    setRun(conversationId, null);
  }
}
