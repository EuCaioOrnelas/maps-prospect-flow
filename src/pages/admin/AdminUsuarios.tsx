import { useState, useEffect, useMemo } from "react";
import { Users, Search, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { UserActionsMenu } from "@/components/admin/UserActionsMenu";
import { AdminUserInfoDialog } from "@/components/admin/AdminUserInfoDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { getProviderLabel, getProviderBucket } from "@/lib/paymentProviderLabel";

export default function AdminUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ active: number; archived: number }>({ active: 0, archived: 0 });

  const loadUsers = async () => {
    setLoading(true);

    // Fetch ALL profiles in pages of 1000 (Supabase max per request)
    const pageSize = 1000;
    let from = 0;
    let all: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, is_custom_subscription, custom_subscription_id, is_archived, archived_at")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Accurate totals via count queries (independent of fetched rows)
    const [{ count: activeCnt }, { count: archivedCnt }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).or("is_archived.is.null,is_archived.eq.false"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_archived", true),
    ]);
    setTotals({ active: activeCnt || 0, archived: archivedCnt || 0 });

    setUsers(all);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const archivedCount = totals.archived;
  const activeCount = totals.active;

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !u.is_archived) ||
        (statusFilter === "archived" && u.is_archived);
      const matchSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase());
      const matchPlan = planFilter === "all" || u.plan === planFilter;
      const bucket = getProviderBucket(u.payment_provider);
      const matchProvider =
        providerFilter === "all" ||
        (providerFilter === "stripe" && bucket === "stripe") ||
        (providerFilter === "pix" && bucket === "pix") ||
        (providerFilter === "none" && !u.payment_provider);
      return matchStatus && matchSearch && matchPlan && matchProvider;
    });
  }, [users, statusFilter, search, planFilter, providerFilter]);

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    start: "bg-blue-500/10 text-blue-500",
    growth: "bg-violet-500/10 text-violet-500",
    scale: "bg-amber-500/10 text-amber-500",
  };

  const providerColors: Record<string, string> = {
    stripe: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    pix: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    other: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} ativos · {archivedCount} arquivados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Download size={14} className="mr-1.5" /> Exportar
          </Button>
          <CreateUserDialog onUserCreated={loadUsers} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por email ou nome..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos planos</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="start">Start</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="scale">Scale</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos pagamentos</SelectItem>
            <SelectItem value="stripe">Stripe (Cartão)</SelectItem>
            <SelectItem value="pix">Asaas / PIX</SelectItem>
            <SelectItem value="none">Sem pagamento</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="archived">Arquivados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(user => {
                  const bucket = getProviderBucket(user.payment_provider);
                  return (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedUserId(user.id)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`${planColors[user.plan] || "bg-muted"} border-0 text-xs`}>{user.plan}</Badge>
                        {user.is_custom_subscription && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 px-1.5 py-0">
                            Custom
                          </Badge>
                        )}
                        {user.is_archived && (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border px-1.5 py-0">
                            Arquivado
                          </Badge>
                        )}
                        {user.is_blocked && !user.is_archived && (
                          <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 px-1.5 py-0">
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.payment_provider ? (
                        <Badge variant="outline" className={`${providerColors[bucket]} text-[10px] font-medium`}>
                          {getProviderLabel(user.payment_provider)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((user.searches_used || 0) / (user.searches_limit || 120)) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{user.searches_used || 0}/{user.searches_limit || 120}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.updated_at ? new Date(user.updated_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <UserActionsMenu
                        userId={user.id}
                        userEmail={user.email}
                        userName={user.name}
                        isBlocked={user.is_blocked || false}
                        isArchived={user.is_archived || false}
                        onActionComplete={loadUsers}
                      />
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <AdminUserInfoDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => { if (!open) setSelectedUserId(null); }}
        />
      )}
    </div>
  );
}
