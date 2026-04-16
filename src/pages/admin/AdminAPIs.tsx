import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Loader2, CreditCard, Sparkles, Mail, MessageSquare, Search, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApiResult {
  service: string;
  category: string;
  status: "ok" | "error" | "not_configured" | "warning";
  message: string;
  details?: { left?: number; limit?: number; used?: number; percent?: number; available?: number; balance?: number };
}

const CATEGORY_META: Record<string, { label: string; icon: typeof CreditCard; color: string }> = {
  payments: { label: "Pagamentos", icon: CreditCard, color: "text-emerald-500" },
  ai: { label: "Inteligência Artificial", icon: Sparkles, color: "text-violet-500" },
  email: { label: "Email", icon: Mail, color: "text-blue-500" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-green-500" },
  leads: { label: "SerpAPI / Leads", icon: Search, color: "text-amber-500" },
};

const STATUS_META = {
  ok: { label: "Operacional", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  warning: { label: "Atenção", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  error: { label: "Falha", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  not_configured: { label: "Não configurado", icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border" },
};

export default function AdminAPIs() {
  const [results, setResults] = useState<ApiResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; ok: number; warning: number; error: number; not_configured: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const load = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-all-apis");
      if (error) throw error;
      if (data?.success) {
        setResults(data.results || []);
        setSummary(data.summary || null);
        setLastChecked(data.checkedAt);
        if (showToast) toast.success("Status das APIs atualizado");
      }
    } catch (e: any) {
      if (showToast) toast.error("Erro ao verificar APIs: " + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(false), 5 * 60 * 1000); // refresh a cada 5min
    return () => clearInterval(interval);
  }, [load]);

  const grouped = results.reduce((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {} as Record<string, ApiResult[]>);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">APIs & Chaves</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Status em tempo real de todas as integrações
            {lastChecked && <span className="ml-2 text-xs">· Última verificação: {new Date(lastChecked).toLocaleTimeString("pt-BR")}</span>}
          </p>
        </div>
        <Button onClick={() => load(true)} disabled={refreshing} variant="outline" size="sm" className="gap-2">
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Verificar agora
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Operacionais</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{summary.ok}</p>
                <p className="text-xs text-muted-foreground mt-1">de {summary.total} serviços</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atenção</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{summary.warning}</p>
                <p className="text-xs text-muted-foreground mt-1">precisam revisão</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle size={14} className="text-red-500" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Falhas</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{summary.error}</p>
                <p className="text-xs text-muted-foreground mt-1">requerem ação</p>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle size={14} className="text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Não config.</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{summary.not_configured}</p>
                <p className="text-xs text-muted-foreground mt-1">opcionais</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Grouped by category */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => {
          const meta = CATEGORY_META[cat] || { label: cat, icon: HelpCircle, color: "text-muted-foreground" };
          const Icon = meta.icon;
          return (
            <Card key={cat} className="border-border/40 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon size={16} className={meta.color} />
                  {meta.label}
                  <Badge variant="secondary" className="text-xs ml-auto">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((r, idx) => {
                  const sm = STATUS_META[r.status];
                  const SIcon = sm.icon;
                  return (
                    <div key={`${r.service}-${idx}`} className={cn("rounded-lg border p-4 transition-colors", sm.bg, sm.border)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-foreground truncate">{r.service}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.message}</p>
                        </div>
                        <SIcon size={16} className={cn(sm.color, "shrink-0 mt-0.5")} />
                      </div>
                      {r.details?.percent !== undefined && r.details?.limit && (
                        <div className="mt-2 space-y-1">
                          <Progress value={r.details.percent} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground">
                            {r.details.used}/{r.details.limit} usados
                          </p>
                        </div>
                      )}
                      <Badge className={cn("border-0 text-[10px] mt-2", sm.color, sm.bg)}>{sm.label}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
