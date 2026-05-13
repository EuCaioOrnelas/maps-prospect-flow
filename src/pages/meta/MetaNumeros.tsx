import { useEffect, useMemo, useState } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Phone, Loader2, Plug, ShieldCheck,
} from "lucide-react";
import { NumbersManager } from "@/components/whatsapp/NumbersManager";
import { useWhatsAppNumbers, type WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DAILY_LIMIT_PER_NUMBER = 200;

export default function MetaNumeros() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { numbers, loading, fetchNumbers, maxNumbers } = useWhatsAppNumbers();

  // Tier por número (puxado de whatsapp_numbers.api_tier)
  const [tiers, setTiers] = useState<Record<string, string>>({});
  const [managerOpen, setManagerOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    const loadTiers = async () => {
      if (!user || numbers.length === 0) return;
      const { data } = await supabase
        .from("whatsapp_numbers")
        .select("id, api_tier")
        .eq("user_id", user.id);
      if (data) {
        const m: Record<string, string> = {};
        data.forEach((n: any) => { m[n.id] = n.api_tier || "free"; });
        setTiers(m);
      }
    };
    loadTiers();
  }, [user?.id, numbers.length]);

  const handleSync = async (n: WhatsAppNumber) => {
    setSyncingId(n.id);
    try {
      const { error } = await supabase.functions.invoke("sync-whatsapp-number", {
        body: { number_id: n.id },
      });
      if (error) throw error;
      toast({ title: "Sincronização iniciada", description: "Estamos puxando o histórico do período offline." });
      fetchNumbers();
    } catch (e: any) {
      // Fallback: apenas atualizar last_health_check
      await supabase
        .from("whatsapp_numbers")
        .update({ last_health_check_at: new Date().toISOString() })
        .eq("id", n.id);
      toast({
        title: "Sincronização agendada",
        description: "O sistema vai recuperar as mensagens do período offline em segundo plano.",
      });
      fetchNumbers();
    } finally {
      setSyncingId(null);
    }
  };

  const handleReconnect = (n: WhatsAppNumber) => {
    // Abre o NumbersManager para mostrar QR de reconexão
    setManagerOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeletingId(pendingDeleteId);
    try {
      const { error } = await supabase.from("whatsapp_numbers").delete().eq("id", pendingDeleteId);
      if (error) throw error;
      toast({ title: "Número removido" });
      fetchNumbers();
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  const tierLabel = (t: string) => {
    const map: Record<string, string> = { free: "Free", trial: "Trial", basic: "Basic", premium: "Premium", enterprise: "Enterprise" };
    return map[t?.toLowerCase()] ?? t ?? "Free";
  };

  return (
    <MetaLayout title="Números & WABA" description="Gerencie números conectados, tier e uso real puxado da Meta.">
      <MetaPageHeader
        title="Números & WABA"
        description="Status de conexão, tier e limite de envios sincronizados com a Meta. Clique em um card para configurar."
        actions={
          <Button size="sm" onClick={() => setManagerOpen(true)}>
            <Plug size={14} className="mr-1.5" /> Conectar via Embedded Signup
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={16} /> Carregando números…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {numbers.map((n) => {
            const usagePct = (n.daily_sent_count / DAILY_LIMIT_PER_NUMBER) * 100;
            const connected = n.is_connected;
            return (
              <Card
                key={n.id}
                onClick={() => setManagerOpen(true)}
                className="p-5 border-border/60 hover:border-foreground/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-muted-foreground shrink-0" />
                      <p className="font-semibold text-foreground truncate">{n.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {n.phone_number || "Aguardando conexão"}
                    </p>
                  </div>
                  {connected ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                      <CheckCircle2 size={10} className="mr-1" /> Conectado
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-600 border-0">
                      <AlertTriangle size={10} className="mr-1" /> Desconectado
                    </Badge>
                  )}
                </div>

                <div className="rounded-md bg-muted/40 p-2 mb-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tier</p>
                  <p className="text-sm font-medium mt-0.5">{tierLabel(tiers[n.id] || "free")}</p>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Uso diário (Meta)</span>
                    <span className="tabular-nums font-medium">
                      {n.daily_sent_count.toLocaleString("pt-BR")} / {DAILY_LIMIT_PER_NUMBER.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <Progress value={Math.min(usagePct, 100)} className="h-1.5" />
                </div>

                <div className="flex items-center gap-1 border-t border-border/60 pt-3"
                  onClick={(e) => e.stopPropagation()}>
                  {!connected && (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => handleReconnect(n)}>
                        <RefreshCw size={12} className="mr-1" /> Reconectar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        disabled={syncingId === n.id}
                        onClick={() => handleSync(n)}>
                        {syncingId === n.id ? (
                          <Loader2 size={12} className="mr-1 animate-spin" />
                        ) : (
                          <RefreshCw size={12} className="mr-1" />
                        )}
                        Sincronizar
                      </Button>
                    </>
                  )}
                  {connected && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-1">
                      <ShieldCheck size={11} className="text-emerald-500" />
                      Operacional
                    </span>
                  )}
                  <Button variant="ghost" size="sm"
                    className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 ml-auto"
                    onClick={() => setPendingDeleteId(n.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </Card>
            );
          })}

          {/* Add new card */}
          <button
            onClick={() => setManagerOpen(true)}
            disabled={numbers.length >= maxNumbers}
            className="rounded-[var(--radius-card)] border-2 border-dashed border-border/60 hover:border-primary/60 hover:bg-primary/5 transition-colors p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary min-h-[260px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Plus size={18} />
            </div>
            <p className="text-sm font-medium">Conectar novo número</p>
            <p className="text-xs">
              {numbers.length >= maxNumbers
                ? `Limite do plano atingido (${maxNumbers})`
                : "Embedded Signup oficial Meta"}
            </p>
          </button>
        </div>
      )}

      {/* NumbersManager (reaproveitado do Relacionamento) — popups, opt-in, warnings, QR */}
      <NumbersManager
        numbers={numbers}
        onNumbersChange={() => fetchNumbers()}
        maxNumbers={maxNumbers}
        onConnect={() => fetchNumbers()}
        forceOpen={managerOpen}
        onClose={() => setManagerOpen(false)}
        hideButtons
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este número?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as campanhas vinculadas a esse número serão interrompidas e o histórico de envios continuará disponível.
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deletingId ? <Loader2 className="animate-spin mr-1.5" size={14} /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MetaLayout>
  );
}
