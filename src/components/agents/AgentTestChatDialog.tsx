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
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Headphones,
  FlaskConical,
  Image,
  FileText,
} from "lucide-react";

interface ChatMessage {
  id: string;
  direction: "sent" | "received";
  content: string;
  type?: "text" | "audio" | "event";
  eventType?: "objective_completed" | "lead_lost" | "human_handoff" | "media";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const resetConversation = () => {
    setMessages([]);
    setInputText("");
    setIsThinking(false);
  };

  const sendMessage = useCallback(async (content: string, type: "text" | "audio" = "text") => {
    if (!content.trim() || !agent || isThinking) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      direction: "received",
      content: content.trim(),
      type,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsThinking(true);

    try {
      // Build message history for the edge function
      const allMessages = [...messages, userMsg].map(m => ({
        direction: m.direction,
        content: m.content,
        type: m.type === "audio" ? "audio" : "text",
      }));

      const { data, error } = await supabase.functions.invoke("agent-test-chat", {
        body: { agentId: agent.id, messages: allMessages },
      });

      if (error) throw error;

      // Add events first
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
    }
  }, [agent, messages, isThinking]);

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
      <DialogContent className="sm:max-w-lg p-0 gap-0 h-[85vh] max-h-[700px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
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
            // Event messages (CRM transfers, media)
            if (msg.type === "event") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium max-w-[90%] text-center border",
                    msg.eventType === "objective_completed" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    msg.eventType === "lead_lost" && "bg-red-500/10 text-red-400 border-red-500/20",
                    msg.eventType === "human_handoff" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    msg.eventType === "media" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                  )}>
                    <div className="flex items-center justify-center gap-1.5">
                      {msg.eventType === "objective_completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {msg.eventType === "lead_lost" && <XCircle className="h-3.5 w-3.5" />}
                      {msg.eventType === "human_handoff" && <Headphones className="h-3.5 w-3.5" />}
                      {msg.eventType === "media" && <FileText className="h-3.5 w-3.5" />}
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
