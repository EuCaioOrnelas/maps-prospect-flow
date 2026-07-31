import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Search, CheckCircle, XCircle, ArrowUp, ArrowDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionEvent {
  id: string;
  user_id: string | null;
  email: string;
  event_type: string;
  event_source: string;
  previous_plan: string | null;
  new_plan: string;
  previous_searches_limit: number | null;
  new_searches_limit: number;
  carry_over: number;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_event_id: string | null;
  metadata: any;
  created_at: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  checkout_completed: "bg-green-500",
  subscription_updated_active: "bg-blue-500",
  subscription_canceled: "bg-orange-500",
  subscription_deleted: "bg-red-500",
  subscription_unpaid: "bg-red-600",
  subscription_past_due: "bg-yellow-500",
};

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  checkout_completed: <CheckCircle className="h-4 w-4" />,
  subscription_updated_active: <ArrowUp className="h-4 w-4" />,
  subscription_canceled: <XCircle className="h-4 w-4" />,
  subscription_deleted: <XCircle className="h-4 w-4" />,
  subscription_unpaid: <Clock className="h-4 w-4" />,
  subscription_past_due: <Clock className="h-4 w-4" />,
};

// Eventos que representam cobrança real (dinheiro entrando).
// Trials, expirações e mudanças de status NÃO entram na contagem.
const PAYMENT_EVENT_TYPES = new Set([
  "checkout_completed",
  "purchase",
  "invoice_paid",
  "payment_confirmed",
  "subscription_created",
  "subscription_renewed",
  "subscription_updated_active",
]);

const isPaymentEvent = (e: SubscriptionEvent) => {
  const type = (e.event_type || "").toLowerCase();
  if (!PAYMENT_EVENT_TYPES.has(type)) return false;
  // Descarta eventos de trial sem cobrança (plano continua free ou metadata marca trial)
  if ((e.new_plan || "").toLowerCase() === "free") return false;
  const meta = e.metadata || {};
  if (meta.trial === true || meta.is_trial === true) return false;
  if (typeof meta.amount_cents === "number" && meta.amount_cents <= 0) return false;
  return true;
};

export function SubscriptionEventsLog() {
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyPayments, setOnlyPayments] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscription_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents((data as SubscriptionEvent[]) || []);
    } catch (error) {
      console.error("Error fetching subscription events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("subscription-events-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "subscription_events",
        },
        (payload) => {
          setEvents((prev) => [payload.new as SubscriptionEvent, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const paymentEventsCount = events.filter(isPaymentEvent).length;

  const filteredEvents = events
    .filter((event) => (onlyPayments ? isPaymentEvent(event) : true))
    .filter(
      (event) =>
        event.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.new_plan.toLowerCase().includes(searchTerm.toLowerCase())
    );


  const getEventBadge = (eventType: string) => {
    const color = EVENT_TYPE_COLORS[eventType] || "bg-gray-500";
    const icon = EVENT_TYPE_ICONS[eventType] || null;
    
    return (
      <Badge className={`${color} text-white flex items-center gap-1`}>
        {icon}
        {eventType.replace(/_/g, " ")}
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-500",
      start: "bg-blue-500",
      growth: "bg-purple-500",
      scale: "bg-green-500",
    };
    return (
      <Badge className={`${colors[plan] || "bg-gray-500"} text-white`}>
        {plan}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          📊 Debug: Eventos de Subscription
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, evento ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchEvents}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? "Carregando eventos..." : "Nenhum evento encontrado"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEventBadge(event.event_type)}
                      <span className="text-sm text-muted-foreground">
                        via {event.event_source}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-sm font-medium">{event.email}</p>
                      <p className="text-xs text-muted-foreground">
                        User ID: {event.user_id?.slice(0, 8) || "N/A"}...
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Plano</p>
                        <div className="flex items-center gap-1">
                          {event.previous_plan && (
                            <>
                              {getPlanBadge(event.previous_plan)}
                              <ArrowDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
                            </>
                          )}
                          {getPlanBadge(event.new_plan)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-xs text-muted-foreground">Limite Anterior</p>
                      <p className="font-medium">{event.previous_searches_limit ?? "N/A"}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-xs text-muted-foreground">Novo Limite</p>
                      <p className="font-medium text-green-600">{event.new_searches_limit}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-xs text-muted-foreground">Carry Over</p>
                      <p className={`font-medium ${event.carry_over > 0 ? "text-blue-600" : ""}`}>
                        +{event.carry_over}
                      </p>
                    </div>
                  </div>

                  {event.stripe_subscription_id && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span>Sub: {event.stripe_subscription_id}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
