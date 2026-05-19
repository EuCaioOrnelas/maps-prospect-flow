import { useCallback, useEffect, useState } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Phone, Pencil, Info, ExternalLink, Trash2, AlertTriangle, ShieldAlert, Loader2,
} from "lucide-react";
import { MetaManualSetup } from "@/components/meta-campaigns/MetaManualSetup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface WabaConnection {
  id: string;
  waba_id: string;
  phone_number_id: string;
  business_name: string | null;
  display_phone_number: string | null;
  access_token: string;
  status: string | null;
  nickname: string | null;
}

const META_PLAN_LIMITS: Record<string, number> = {
  free: 1, trial: 1, start: 2, growth: 5, scale: 10,
};

export default function MetaNumeros() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [connections, setConnections] = useState<WabaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiredTokenIds, setExpiredTokenIds] = useState<Set<string>>(new Set());
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);

  const [editingConn, setEditingConn] = useState<WabaConnection | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editToken, setEditToken] = useState("");
  const [showTokenField, setShowTokenField] = useState(false);

  const [showAddNumber, setShowAddNumber] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const userPlan = (profile?.plan || "free").toLowerCase();
  const basePlanNumbers = META_PLAN_LIMITS[userPlan] ?? 1;
  const extraNumbers = ((profile as any)?.extra_numbers as number | undefined) ?? 0;
  const maxMetaConnections = basePlanNumbers + extraNumbers;
  const reachedConnectionLimit = connections.length >= maxMetaConnections;
  const expiredConnections = connections.filter((c) => expiredTokenIds.has(c.id));
  const hasExpired = expiredConnections.length > 0;

  const validateConnectionToken = useCallback(async (conn: WabaConnection) => {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-fetch-templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ waba_id: conn.waba_id, access_token: conn.access_token }),
    });
    const rawText = await response.text();
    let payload: any = null;
    try { payload = rawText ? JSON.parse(rawText) : null; } catch { payload = null; }
    const details = payload?.details?.error;
    return payload?.token_expired === true || details?.code === 190 || details?.error_subcode === 463;
  }, []);

  const validateTokens = useCallback(async (conns: WabaConnection[]) => {
    const results = await Promise.all(conns.map(async (c) => {
      try { return (await validateConnectionToken(c)) ? c.id : null; } catch { return null; }
    }));
    setExpiredTokenIds(new Set(results.filter(Boolean) as string[]));
  }, [validateConnectionToken]);

  const loadConnections = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("user_waba_connections")
        .select("*")
        .eq("user_id", user.id);
      const conns = (data || []) as unknown as WabaConnection[];
      setConnections(conns);
      if (conns.length) validateTokens(conns);
      else setExpiredTokenIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [user, validateTokens]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleConnectionSaved = (connection: WabaConnection) => {
    setConnections((prev) => {
      const idx = prev.findIndex((c) => c.id === connection.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = connection; return u; }
      return [...prev, connection];
    });
    setExpiredTokenIds((prev) => { const n = new Set(prev); n.delete(connection.id); return n; });
    setShowAddNumber(false);
  };

  const handleSaveEdit = async () => {
    if (!editingConn) return;
    try {
      const updates: Record<string, any> = { nickname: editNickname || null };
      if (showTokenField && editToken.trim()) updates.access_token = editToken.trim();
      await supabase.from("user_waba_connections").update(updates).eq("id", editingConn.id);

      const updated = {
        ...editingConn,
        nickname: editNickname || null,
        ...(showTokenField && editToken.trim() ? { access_token: editToken.trim() } : {}),
      };
      setConnections((prev) => prev.map((c) => (c.id === editingConn.id ? updated : c)));

      if (showTokenField && editToken.trim()) {
        const stillExpired = await validateConnectionToken(updated);
        setExpiredTokenIds((prev) => {
          const n = new Set(prev);
          stillExpired ? n.add(editingConn.id) : n.delete(editingConn.id);
          return n;
        });
        if (!stillExpired) toast({ title: "Token atualizado com sucesso!" });
      } else {
        toast({ title: "Número atualizado!" });
      }
      setEditingConn(null);
      setShowTokenField(false);
      setEditToken("");
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDeleteConnection = async (connId: string) => {
    setDeleting(true);
    try {
      await Promise.allSettled([
        supabase.from("chat_messages").delete().in(
          "conversation_id",
          (await supabase.from("chat_conversations").select("id").eq("waba_connection_id", connId)).data?.map((c: any) => c.id) || []
        ),
      ]);
      await Promise.allSettled([
        supabase.from("chat_conversations").delete().eq("waba_connection_id", connId),
        (supabase as any).from("meta_campaigns").delete().eq("connection_id", connId),
      ]);
      const { error } = await supabase.from("user_waba_connections").delete().eq("id", connId);
      if (error) throw error;
      setConnections((prev) => prev.filter((c) => c.id !== connId));
      setExpiredTokenIds((prev) => { const n = new Set(prev); n.delete(connId); return n; });
      setPendingDeleteId(null);
      setEditingConn(null);
      toast({ title: "Número removido!", description: "A conexão foi excluída permanentemente." });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const maskSecret = (token: string) => (!token || token.length < 12) ? "••••••••" : token.slice(0, 8) + "••••••••••••";

  return (
    <MetaLayout title="Números & WABA" description="Gerencie os números do WhatsApp Business conectados via Meta Cloud API.">
      <MetaPageHeader
        title="Números & WABA"
        description="Conecte, edite e gerencie os tokens dos seus números oficiais da Meta."
        actions={
          <Button
            size="sm"
            onClick={() => {
              if (reachedConnectionLimit) {
                toast({
                  title: "Limite de números atingido",
                  description: `Seu plano permite ${basePlanNumbers} ${basePlanNumbers === 1 ? "número" : "números"}${extraNumbers > 0 ? ` + ${extraNumbers} da Expansão de Atendimento` : ""}. Adicione a Expansão de Atendimento (+1 número) ou faça upgrade.`,
                  variant: "destructive",
                });
                return;
              }
              setShowAddNumber(true);
            }}
            disabled={reachedConnectionLimit}
          >
            <Plus size={14} className="mr-1.5" /> Adicionar número
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={16} /> Carregando números…
        </div>
      ) : connections.length === 0 ? (
        <MetaManualSetup onConnectionSaved={handleConnectionSaved} />
      ) : (
        <div className="space-y-6">
          {hasExpired && (
            <div className="flex items-start gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <ShieldAlert size={20} className="text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base text-destructive">
                  {expiredConnections.length === 1 ? "1 token expirado" : `${expiredConnections.length} tokens expirados`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {expiredConnections.map(c => c.nickname || c.display_phone_number || c.phone_number_id).join(", ")} — o token de acesso expirou. Clique em editar para atualizar.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowExpiredAlert(true)}
                >
                  <Info size={12} /> Como resolver
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {connections.map((conn) => {
              const isExpired = expiredTokenIds.has(conn.id);
              return (
                <div
                  key={conn.id}
                  className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                    isExpired ? "border-destructive/40 bg-destructive/5" : "border-border hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isExpired ? "bg-destructive/10" : "bg-primary/10"
                    }`}>
                      {isExpired ? (
                        <AlertTriangle size={14} className="text-destructive" />
                      ) : (
                        <Phone size={14} className="text-primary" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-sm truncate">
                        {conn.nickname || conn.display_phone_number || conn.phone_number_id}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {conn.business_name || conn.waba_id}
                      </p>
                      {isExpired && (
                        <p className="mt-1 text-[11px] font-medium text-destructive">
                          Atualize o token para voltar a carregar templates e enviar mensagens.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingConn(conn);
                        setEditNickname(conn.nickname || "");
                        setEditToken("");
                        setShowTokenField(isExpired);
                      }}
                    >
                      <Pencil size={13} className="text-muted-foreground" />
                    </Button>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isExpired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    }`}>
                      {isExpired ? "Expirado" : "Ativo"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            {connections.length}/{maxMetaConnections} números do plano {userPlan}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
            <Info size={18} className="text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">API de Marketing do WhatsApp (Cloud API)</p>
              <p className="text-muted-foreground mt-0.5">
                Disparo via WhatsApp Cloud API utilizando <strong>HSM templates</strong> pré-aprovados pela Meta (categorias: marketing, utility e authentication). O envio é tarifado por <strong>conversa de 24h</strong> conforme a tabela oficial da Meta por país e categoria, com cobrança realizada diretamente pela Meta na conta de billing vinculada ao WABA — independente da assinatura da plataforma. Cada número possui limite de envio próprio definido pelo <strong>messaging tier</strong> e <strong>quality rating</strong> atribuídos pela Meta.
              </p>
              <a
                href="https://developers.facebook.com/docs/whatsapp/messaging-limits"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 mt-1 text-xs"
              >
                <ExternalLink size={10} /> Ver limites de envio da Meta
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingConn} onOpenChange={(o) => { if (!o) { setEditingConn(null); setShowTokenField(false); setEditToken(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Número
              {editingConn && expiredTokenIds.has(editingConn.id) && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                  <AlertTriangle size={10} /> Token expirado
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {editingConn && (
            <div className="space-y-4">
              <div className="space-y-3">
                <DetailRow label="Phone Number ID" value={editingConn.phone_number_id} />
                <DetailRow label="WABA ID" value={editingConn.waba_id} />
                <DetailRow label="Número" value={editingConn.display_phone_number || "N/A"} />
                <DetailRow label="Empresa" value={editingConn.business_name || "N/A"} />
                <div>
                  <p className="text-[11px] text-muted-foreground">Access Token</p>
                  <p className="text-sm font-mono truncate">{maskSecret(editingConn.access_token)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Apelido do número</label>
                <Input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} placeholder="Ex: Atendimento, Vendas..." />
              </div>

              {!showTokenField ? (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowTokenField(true)}>
                  <Pencil size={11} /> Atualizar token de acesso
                </Button>
              ) : (
                <div className="space-y-2 p-3 rounded-lg border border-accent/30 bg-accent/5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <ShieldAlert size={13} className="text-accent-foreground" />
                    Novo Access Token
                  </label>
                  <Textarea value={editToken} onChange={(e) => setEditToken(e.target.value)} placeholder="Cole aqui o novo token permanente..." className="font-mono text-xs min-h-[60px]" />
                  <p className="text-[11px] text-muted-foreground">
                    Use um token de <strong>System User</strong> para evitar expirações.{" "}
                    <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Gerar token permanente →
                    </a>
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1">Salvar</Button>
                <Button variant="destructive" size="icon" onClick={() => setPendingDeleteId(editingConn.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && !deleting && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Excluir este número?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Todas as conversas, mensagens e campanhas vinculadas a este número serão removidas e não poderão ser recuperadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); if (pendingDeleteId) handleDeleteConnection(pendingDeleteId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
              {deleting ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expired Token Help */}
      <Dialog open={showExpiredAlert} onOpenChange={setShowExpiredAlert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-destructive" />
              Token de acesso expirado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {expiredConnections.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive shrink-0" />
                  <span className="text-sm font-medium">{c.nickname || c.display_phone_number || c.phone_number_id}</span>
                  {c.business_name && <span className="text-xs text-muted-foreground">({c.business_name})</span>}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              O token de acesso {expiredConnections.length === 1 ? "deste número" : "destes números"} expirou. Para evitar isso, gere um <strong>token permanente</strong> usando um Usuário do Sistema no Meta Business Suite.
            </p>
            <Button onClick={() => setShowExpiredAlert(false)} className="w-full">Entendi</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Number Dialog */}
      <Dialog open={showAddNumber} onOpenChange={setShowAddNumber}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
            <DialogTitle>Adicionar Número</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <MetaManualSetup
              embedded
              onConnectionSaved={(conn) => {
                if (conn) handleConnectionSaved(conn);
                else setShowAddNumber(false);
              }}
              isAddingExtra
            />
          </div>
        </DialogContent>
      </Dialog>
    </MetaLayout>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-mono truncate">{value}</p>
  </div>
);
