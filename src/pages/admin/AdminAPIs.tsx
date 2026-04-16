import { useState, useEffect } from "react";
import { Wifi, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAPIs() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("api_key_status")
        .select("*")
        .order("key_name", { ascending: true });
      setKeys(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">APIs & Chaves</h1>
        <p className="text-sm text-muted-foreground mt-1">Status das integrações e chaves de API</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : keys.length > 0 ? (
          keys.map(key => (
            <Card key={key.id} className="border-border/40 bg-card/80">
              <CardContent className="p-4 flex items-center gap-3">
                {key.status === "active" ? (
                  <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{key.key_name}</p>
                  <p className="text-xs text-muted-foreground">{key.message || key.status}</p>
                </div>
                <Badge variant={key.status === "active" ? "secondary" : "destructive"} className="text-[10px] shrink-0">
                  {key.status === "active" ? "OK" : "Erro"}
                </Badge>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
            Nenhuma chave de API monitorada
          </div>
        )}
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Serviços Integrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Stripe", "PIX/Asaas", "OpenAI", "WhatsApp", "SerpAPI", "Resend", "Meta API", "Evolution"].map(service => (
              <div key={service} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-foreground">{service}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
