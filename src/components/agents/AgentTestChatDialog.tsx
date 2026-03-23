import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  Mic,
  MicOff,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Headphones,
  FlaskConical,
  FileText,
  ShieldAlert,
  PauseCircle,
  ArrowRightLeft,
  Clock,
  Ban,
  Zap,
} from "lucide-react";

type EventType = 
  | "objective_completed" 
  | "lead_lost" 
  | "human_handoff" 
  | "media"
  | "bot_detected"
  | "antiloop_sent"
  | "blocked_by_loop"
  | "limit_reached"
  | "agent_paused"
  | "outside_hours"
  | "crm_move";

interface ChatMessage {
  id: string;
  direction: "sent" | "received";
  content: string;
  type?: "text" | "audio" | "event";
  eventType?: EventType;
  timestamp: Date;
}

interface AgentTestChatDialogProps {
  agent: {
    id: string;
    name: string;
    status: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentTestChatDialog({ agent, open, onOpenChange }: AgentTestChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };
  }, []);

  const resetConversation = () => {
    setMessages([]);
    setInputText("");
    setIsThinking(false);
    setPendingMessages([]);
    if (bufferTimerRef.current) {
      clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
  };

  const processBuffer = useCallback(async (allMsgs: ChatMessage[], buffered: ChatMessage[]) => {
    if (!agent || buffered.length === 0) return;

    setIsThinking(true);

    try {
      const history = [...allMsgs, ...buffered].map(m => ({
        direction: m.direction,
        content: m.content,
        type: m.type === "audio" ? "audio" : "text",
      }));

      const { data, error } = await supabase.functions.invoke("agent-test-chat", {
        body: { agentId: agent.id, messages: history },
      });

      if (error) throw error;

      // Add events
      if (data.events && data.events.length > 0) {
        const eventMessages: ChatMessage[] = data.events.map((evt: any) => ({
          id: crypto.randomUUID(),
          direction: "sent" as const,
          content: evt.label,
          type: "event" as const,
          eventType: evt.type,
          timestamp: new Date(),
        }));
        setMessages(prev => [...prev, ...eventMessages]);
      }

      // Add media events
      if (data.media && data.media.length > 0) {
        const mediaMessages: ChatMessage[] = data.media.map((m: any) => ({
          id: crypto.randomUUID(),
          direction: "sent" as const,
          content: `📎 ${m.type === 'image' ? 'Imagem' : 'PDF'}: ${m.caption || m.url}`,
          type: "event" as const,
          eventType: "media" as const,
          timestamp: new Date(),
        }));
        setMessages(prev => [...prev, ...mediaMessages]);
      }

      // Add agent response
      if (data.reply) {
        const agentMsg: ChatMessage = {
          id: crypto.randomUUID(),
          direction: "sent",
          content: data.reply,
          type: "text",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, agentMsg]);
      }
    } catch (err) {
      console.error("Test chat error:", err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        direction: "sent",
        content: "⚠️ Erro ao processar resposta. Tente novamente.",
        type: "event",
        eventType: "human_handoff",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
      setPendingMessages([]);
    }
  }, [agent]);

  const sendMessage = useCallback((content: string, type: "text" | "audio" = "text") => {
    if (!content.trim() || !agent) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      direction: "received",
      content: content.trim(),
      type,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");

    // If agent is already thinking (processing previous buffer), just add to messages
    if (isThinking) return;

    // Add to pending buffer
    setPendingMessages(prev => {
      const updated = [...prev, userMsg];

      // Reset the 10s timer
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = setTimeout(() => {
        setMessages(currentMsgs => {
          // Get messages excluding the buffered ones
          const baseMsgs = currentMsgs.filter(m => !updated.some(u => u.id === m.id));
          processBuffer(baseMsgs, updated);
          return currentMsgs;
        });
      }, 10000);

      return updated;
    });
  }, [agent, isThinking, processBuffer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // Audio recording
  const toggleRecording = async () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        // Simulate audio transcription with a placeholder
        sendMessage("[Áudio enviado - simulação de transcrição do áudio]", "audio");
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 h-[85vh] max-h-[700px] flex flex-col overflow-hidden border-border focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 pr-12">
          <DialogHeader className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">Testar {agent.name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ambiente de teste • Sem efeitos no CRM
                </p>
              </div>
            </div>
          </DialogHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConversation}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resetar
          </Button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Envie uma mensagem para testar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Simule ser um lead e veja como o agente responde
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            // Event messages
            if (msg.type === "event") {
              const eventStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
                objective_completed: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
                lead_lost: { bg: "bg-red-500/10 text-red-400 border-red-500/20", icon: <XCircle className="h-3.5 w-3.5" /> },
                human_handoff: { bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <Headphones className="h-3.5 w-3.5" /> },
                media: { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <FileText className="h-3.5 w-3.5" /> },
                bot_detected: { bg: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
                antiloop_sent: { bg: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: <Zap className="h-3.5 w-3.5" /> },
                blocked_by_loop: { bg: "bg-red-500/10 text-red-400 border-red-500/20", icon: <Ban className="h-3.5 w-3.5" /> },
                limit_reached: { bg: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: <PauseCircle className="h-3.5 w-3.5" /> },
                agent_paused: { bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: <PauseCircle className="h-3.5 w-3.5" /> },
                outside_hours: { bg: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: <Clock className="h-3.5 w-3.5" /> },
                crm_move: { bg: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
              };
              const style = eventStyles[msg.eventType || ""] || { bg: "bg-muted text-muted-foreground border-border", icon: null };

              return (
                <div key={msg.id} className="flex justify-center">
                  <div className={cn("px-3 py-2 rounded-lg text-xs font-medium max-w-[90%] text-center border", style.bg)}>
                    <div className="flex items-center justify-center gap-1.5">
                      {style.icon}
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            }

            // User messages (lead)
            if (msg.direction === "received") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] flex items-end gap-2">
                    <div className="bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap">
                      {msg.type === "audio" && (
                        <div className="flex items-center gap-1.5 mb-1 text-primary-foreground/70 text-xs">
                          <Mic className="h-3 w-3" />
                          Áudio
                        </div>
                      )}
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            }

            // Agent messages
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[80%] flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-md text-sm whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-border bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={toggleRecording}
              disabled={isThinking}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Gravando áudio..." : "Digite como um lead..."}
              className="flex-1 h-9"
              disabled={isThinking || isRecording}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isThinking}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {isRecording && (
            <p className="text-xs text-destructive mt-1.5 text-center animate-pulse">
              🎙️ Gravando... Clique no microfone para parar
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
