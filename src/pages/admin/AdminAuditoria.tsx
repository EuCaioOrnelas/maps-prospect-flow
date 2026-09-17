import { useState, useEffect, useMemo } from "react";
import { Shield, Search, RefreshCw, Download, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LogRow = {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
};

const PAGE_SIZE = 25;
const MAX_ROWS = 2000;

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });

const actionTone = (action: string) => {
  const a = (action || "").toLowerCase();
  if (a.includes("delete") || a.includes("remove") || a.includes("block"))
    return "bg-destructive/10 text-destructive border-destructive/30";
  if (a.includes("login") || a.includes("sign")) return "bg-blue-500/10 text-blue-500 border-blue-500/30";
  if (a.includes("update") || a.includes("change")) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
  if (a.includes("create") || a.includes("insert")) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  return "bg-muted text-muted-foreground border-border";
};

const shortDevice = (ua: string | null) => {
  if (!ua) return "—";
  if (/iphone|android|mobile/i.test(ua)) return "Celular";
  if (/mac os|macintosh/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";
  return "Outro";
};

export default function AdminAuditoria() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [users, setUsers] = useState<Record<string, { name: string | null; email: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [resource, setResource] = useState("all");
  const [period, setPeriod] = useState("30");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<LogRow | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("security_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);

    if (period !== "all") {
      const since = new Date(Date.now() - Number(period) * 86400000).toISOString();
      q = q.gte("created_at", since);
    }

    const { data } = await q;
    const rows = (data as LogRow[]) || [];
    setLogs(rows);

    const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", ids.slice(0, 500));
      const map: Record<string, { name: string | null; email: string | null }> = {};
      ((profiles as any[]) || []).forEach((p) => {
        map[p.id] = { name: p.name, email: p.email };
      });
      setUsers(map);
    } else {
      setUsers({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort(),
    [logs]
  );
  const resources = useMemo(
    () => Array.from(new Set(logs.map((l) => l.resource_type).filter(Boolean))).sort() as string[],
    [logs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      if (resource !== "all" && l.resource_type !== resource) return false;
      if (!q) return true;
      const u = l.user_id ? users[l.user_id] : undefined;
      return [
        l.action,
        l.resource_type,
        l.resource_id,
        l.ip_address,
        l.user_id,
        u?.name,
        u?.email,
        JSON.stringify(l.metadata ?? ""),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [logs, query, action, resource, users]);

  useEffect(() => {
    setPage(1);
  }, [query, action, resource, period]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const uniqueUsers = useMemo(
    () => new Set(filtered.map((l) => l.user_id).filter(Boolean)).size,
    [filtered]
  );
  const last24h = useMemo(
    () => filtered.filter((l) => Date.now() - new Date(l.created_at).getTime() < 86400000).length,
    [filtered]
  );

  const exportCsv = () => {
    const headers = ["data", "acao", "recurso", "recurso_id", "usuario", "email", "ip", "dispositivo", "detalhes"];
    const lines = filtered.map((l) => {
      const u = l.user_id ? users[l.user_id] : undefined;
      return [
        fmtDateTime(l.created_at),
        l.action,
        l.resource_type ?? "",
        l.resource_id ?? "",
        u?.name ?? l.user_id ?? "",
        u?.email ?? "",
        l.ip_address ?? "",
        shortDevice(l.user_agent),
        JSON.stringify(l.metadata ?? {}),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">Log de segurança e ações sensíveis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={14} className="mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Eventos no período", value: filtered.length.toLocaleString("pt-BR") },
          { label: "Últimas 24h", value: last24h.toLocaleString("pt-BR") },
          { label: "Usuários envolvidos", value: String(uniqueUsers) },
          { label: "Tipos de ação", value: String(actions.length) },
        ].map((c) => (
          <Card key={c.label} className="border-border/40">
            <CardContent className="p-4">
              <p className="text-2xl font-bold tabular-nums text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário, e-mail, ação, IP ou detalhe..."
            className="pl-8 h-9 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resource} onValueChange={setResource}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Recurso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os recursos</SelectItem>
            {resources.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Últimas 24h</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginated.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((log) => {
                    const u = log.user_id ? users[log.user_id] : undefined;
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDateTime(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${actionTone(log.action)}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {u ? (
                            <>
                              <p className="font-medium text-foreground leading-tight">{u.name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">
                              {log.user_id ? `${log.user_id.slice(0, 8)}...` : "Sistema"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.resource_type || "—"}
                          {log.resource_id && (
                            <span className="block font-mono text-[10px] opacity-70">
                              {log.resource_id.slice(0, 12)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.ip_address || "—"}
                          <span className="block text-[10px] opacity-70">{shortDevice(log.user_agent)}</span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setDetail(log)}>
                            <Eye size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} eventos
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <Shield size={32} className="mx-auto mb-3 opacity-40" />
              Nenhum evento de auditoria encontrado com esses filtros
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhe do evento</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <Row label="Data" value={fmtDateTime(detail.created_at)} />
              <Row label="Ação" value={detail.action} />
              <Row label="Recurso" value={detail.resource_type || "—"} />
              <Row label="ID do recurso" value={detail.resource_id || "—"} />
              <Row
                label="Usuário"
                value={
                  detail.user_id
                    ? `${users[detail.user_id]?.name || "—"} (${users[detail.user_id]?.email || detail.user_id})`
                    : "Sistema"
                }
              />
              <Row label="IP" value={detail.ip_address || "—"} />
              <Row label="Dispositivo" value={detail.user_agent || "—"} />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                  Detalhes
                </p>
                <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-x-auto max-h-60">
                  {JSON.stringify(detail.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground break-all">{value}</span>
    </div>
  );
}
