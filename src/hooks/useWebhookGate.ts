import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type WebhookConnection = {
  id: string;
  display_phone_number: string | null;
  business_name: string | null;
  status: string;
  webhook_verified_at: string | null;
};

export function useWebhookGate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<WebhookConnection[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("meta-webhook-config", {
      body: { action: "info" },
    });
    if (!error && data) {
      const activeConnections = (((data as any).connections ?? []) as WebhookConnection[])
        .filter((connection) => connection.status === "active");
      setConnections(activeConnections);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Reload when the tab regains focus / becomes visible — keeps the gate
  // in sync after the user configures the webhook in another tab/window.
  useEffect(() => {
    const onFocus = () => load();
    const onVisibility = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const pendingConnections = connections.filter((c) => !c.webhook_verified_at);
  const hasPending = pendingConnections.length > 0;
  const hasAnyConnection = connections.length > 0;
  // Gate only matters if user has at least one WABA connection
  const blocked = hasAnyConnection && hasPending;

  return { loading, connections, pendingConnections, hasPending, blocked, reload: load };
}
