import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MessageSquare, User, Bot, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface Props { equipeId: string }

export function WorkforceAnalytics({ equipeId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const convosQ = useQuery({
    queryKey: ["equipe-ia", equipeId, "test-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_workforce_test_conversations" as never)
        .select("id,title,message_count,created_at,updated_at")
        .eq("workforce_id", equipeId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Conversation[];
    },
  });

  const messagesQ = useQuery({
    queryKey: ["equipe-ia", equipeId, "test-messages", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_workforce_test_messages" as never)
        .select("id,role,content,created_at")
        .eq("conversation_id", selected!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Message[];
    },
  });

  const convos = convosQ.data ?? [];
  const totalMessages = convos.reduce((s, c) => s + (c.message_count || 0), 0);

  const kpis = [
    { label: "Conversas de teste", value: String(convos.length) },
    { label: "Mensagens totais", value: String(totalMessages) },
    { label: "Média / conversa", value: convos.length ? (totalMessages / convos.length).toFixed(1) : "0" },
    { label: "Última atividade", value: convos[0] ? formatDistanceToNow(new Date(convos[0].updated_at), { addSuffix: true, locale: ptBR }) : "—" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
            <p className="text-sm text-muted-foreground">Conversas e mensagens registradas no modo teste</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
              <p className="text-lg font-bold mt-1 tabular-nums truncate">{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[320px_1fr] overflow-hidden">
        <div className="border-r overflow-y-auto bg-card/30">
          {convosQ.isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
          ) : convos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center px-4 py-10">
              Nenhuma conversa de teste ainda. Abra "Testar" no topo para começar.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {convos.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors",
                      selected === c.id && "bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs font-semibold truncate flex-1">{c.title || "Conversa de teste"}</p>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{c.message_count}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-y-auto p-6">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
              Selecione uma conversa à esquerda para ver as mensagens.
            </div>
          ) : messagesQ.isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {(messagesQ.data ?? []).map((m) => (
                <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role !== "user" && (
                    <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Bot className="size-3.5" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm",
                  )}>
                    {m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="size-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                      <User className="size-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
