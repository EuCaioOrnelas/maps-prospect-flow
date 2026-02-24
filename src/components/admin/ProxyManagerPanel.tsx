import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
  Upload,
  Loader2,
  Shield,
  RefreshCw,
  Copy,
  AlertTriangle,
} from "lucide-react";

interface Proxy {
  id: string;
  host: string;
  port: string;
  protocol: string;
  username: string | null;
  password: string | null;
  label: string | null;
  status: string;
  assigned_numbers_count: number;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export const ProxyManagerPanel = () => {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Single proxy form
  const [form, setForm] = useState({
    host: "",
    port: "",
    protocol: "http",
    username: "",
    password: "",
    label: "",
  });

  // Bulk import text
  const [bulkText, setBulkText] = useState("");
  const [bulkProtocol, setBulkProtocol] = useState("http");

  const fetchProxies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_proxies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProxies((data as any[]) || []);
    } catch (err) {
      console.error("Error fetching proxies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  // Recalculate assigned counts from whatsapp_numbers
  const refreshCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("proxy_id")
        .not("proxy_id", "is", null);

      if (error) throw error;

      // Count per proxy
      const counts: Record<string, number> = {};
      for (const row of (data as any[]) || []) {
        counts[row.proxy_id] = (counts[row.proxy_id] || 0) + 1;
      }

      // Update each proxy's count
      for (const proxy of proxies) {
        const realCount = counts[proxy.id] || 0;
        if (realCount !== proxy.assigned_numbers_count) {
          await supabase
            .from("whatsapp_proxies")
            .update({ assigned_numbers_count: realCount })
            .eq("id", proxy.id);
        }
      }

      await fetchProxies();
      toast({ title: "Contagens atualizadas" });
    } catch (err) {
      console.error("Error refreshing counts:", err);
    }
  }, [proxies, fetchProxies, toast]);

  const addProxy = async () => {
    if (!form.host || !form.port) {
      toast({ title: "Host e porta são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("whatsapp_proxies").insert({
        host: form.host.trim(),
        port: form.port.trim(),
        protocol: form.protocol,
        username: form.username.trim() || null,
        password: form.password.trim() || null,
        label: form.label.trim() || null,
      });
      if (error) throw error;
      setForm({ host: "", port: "", protocol: "http", username: "", password: "", label: "" });
      setShowAddDialog(false);
      await fetchProxies();
      toast({ title: "Proxy adicionado com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro ao adicionar proxy", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const bulkImport = async () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast({ title: "Nenhum proxy encontrado", variant: "destructive" });
      return;
    }

    setSaving(true);
    let added = 0;
    let errors = 0;

    for (const line of lines) {
      try {
        // Supported formats: host:port:user:pass, host:port, user:pass@host:port
        let host: string, port: string, username: string | null = null, password: string | null = null;

        if (line.includes("@")) {
          // user:pass@host:port
          const [credentials, hostPort] = line.split("@");
          const credParts = credentials.split(":");
          username = credParts[0] || null;
          password = credParts[1] || null;
          const hpParts = hostPort.split(":");
          host = hpParts[0];
          port = hpParts[1] || "8080";
        } else {
          const parts = line.split(":");
          host = parts[0];
          port = parts[1] || "8080";
          username = parts[2] || null;
          password = parts[3] || null;
        }

        const { error } = await supabase.from("whatsapp_proxies").insert({
          host: host.trim(),
          port: port.trim(),
          protocol: bulkProtocol,
          username,
          password,
          label: null,
        });

        if (error) throw error;
        added++;
      } catch {
        errors++;
      }
    }

    setBulkText("");
    setShowBulkDialog(false);
    await fetchProxies();
    toast({
      title: `Importação concluída`,
      description: `${added} adicionado(s), ${errors} erro(s)`,
    });
    setSaving(false);
  };

  const toggleBlock = async (proxy: Proxy) => {
    try {
      const newBlocked = !proxy.is_blocked;
      const { error } = await supabase
        .from("whatsapp_proxies")
        .update({
          is_blocked: newBlocked,
          blocked_at: newBlocked ? new Date().toISOString() : null,
          blocked_reason: newBlocked ? "Bloqueado manualmente" : null,
          status: newBlocked ? "blocked" : "active",
        })
        .eq("id", proxy.id);
      if (error) throw error;
      await fetchProxies();
      toast({ title: newBlocked ? "Proxy bloqueado" : "Proxy desbloqueado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const deleteProxy = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este proxy?")) return;
    try {
      // First unlink from any numbers
      await supabase.from("whatsapp_numbers").update({ proxy_id: null }).eq("proxy_id", id);
      const { error } = await supabase.from("whatsapp_proxies").delete().eq("id", id);
      if (error) throw error;
      await fetchProxies();
      toast({ title: "Proxy excluído" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const activeCount = proxies.filter((p) => !p.is_blocked).length;
  const blockedCount = proxies.filter((p) => p.is_blocked).length;
  const totalAssigned = proxies.reduce((sum, p) => sum + p.assigned_numbers_count, 0);

  return (
    <div className="bg-card/50 border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Gerenciador de Proxies</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshCounts}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar contagens
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Importar em massa
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar proxy
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-background/50 border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{proxies.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-background/50 border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </div>
        <div className="bg-background/50 border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{blockedCount}</p>
          <p className="text-xs text-muted-foreground">Bloqueados</p>
        </div>
        <div className="bg-background/50 border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalAssigned}</p>
          <p className="text-xs text-muted-foreground">Números vinculados</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : proxies.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum proxy cadastrado</p>
          <p className="text-sm mt-1">Adicione proxies individualmente ou importe em massa</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Host:Port</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead className="text-center">Números</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proxies.map((proxy) => (
                <TableRow key={proxy.id} className={proxy.is_blocked ? "opacity-50" : ""}>
                  <TableCell>
                    {proxy.is_blocked ? (
                      <Badge variant="destructive" className="text-xs">
                        <Ban className="h-3 w-3 mr-1" />
                        Bloqueado
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{proxy.label || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {proxy.host}:{proxy.port}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">
                      {proxy.protocol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {proxy.username ? (
                      <span className="text-green-400">✓ Com auth</span>
                    ) : (
                      <span className="text-muted-foreground">Sem auth</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {proxy.assigned_numbers_count}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {proxy.last_used_at
                      ? new Date(proxy.last_used_at).toLocaleDateString("pt-BR")
                      : "Nunca"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBlock(proxy)}
                        title={proxy.is_blocked ? "Desbloquear" : "Bloquear"}
                      >
                        {proxy.is_blocked ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Ban className="h-4 w-4 text-yellow-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProxy(proxy.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Single Proxy Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Proxy</DialogTitle>
            <DialogDescription>Cadastre um novo proxy para uso nas instâncias WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Host *</Label>
                <Input
                  placeholder="192.168.1.1 ou proxy.com"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                />
              </div>
              <div>
                <Label>Porta *</Label>
                <Input
                  placeholder="8080"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Protocolo</Label>
              <Select value={form.protocol} onValueChange={(v) => setForm({ ...form, protocol: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="socks5">SOCKS5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Usuário</Label>
                <Input
                  placeholder="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div>
                <Label>Senha</Label>
                <Input
                  placeholder="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Label (opcional)</Label>
              <Input
                placeholder="Ex: Proxy BR SP #1"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addProxy} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Proxies em Massa</DialogTitle>
            <DialogDescription>
              Cole os proxies abaixo, um por linha. Formatos aceitos:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono space-y-1">
              <p>host:port:user:pass</p>
              <p>host:port</p>
              <p>user:pass@host:port</p>
            </div>
            <div>
              <Label>Protocolo (para todos)</Label>
              <Select value={bulkProtocol} onValueChange={setBulkProtocol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="socks5">SOCKS5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proxies ({bulkText.split("\n").filter((l) => l.trim()).length} linhas)</Label>
              <Textarea
                placeholder={`192.168.1.1:8080:user:pass\n10.0.0.1:3128\nuser:pass@proxy.com:8080`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={bulkImport} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar {bulkText.split("\n").filter((l) => l.trim()).length} proxies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
