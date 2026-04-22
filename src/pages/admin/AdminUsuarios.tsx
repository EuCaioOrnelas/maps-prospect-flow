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
import { getProviderLabel, getProviderBucket } from "@/lib/paymentProviderLabel";

export default function AdminUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase());
      const matchPlan = planFilter === "all" || u.plan === planFilter;
      const bucket = getProviderBucket(u.payment_provider);
      const matchProvider =
        providerFilter === "all" ||
        (providerFilter === "stripe" && bucket === "stripe") ||
        (providerFilter === "pix" && bucket === "pix") ||
        (providerFilter === "none" && !u.payment_provider);
      return matchSearch && matchPlan && matchProvider;
    });
  }, [users, search, planFilter, providerFilter]);

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
          <p className="text-sm text-muted-foreground mt-1">{users.length} usuários cadastrados</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          <Download size={14} className="mr-1.5" /> Exportar
        </Button>
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
                  <TableHead>Uso</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(user => (
                <TableRow key={user.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedUserId(user.id)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${planColors[user.plan] || "bg-muted"} border-0 text-xs`}>{user.plan}</Badge>
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
                    <TableCell>
                      <UserActionsMenu
                        userId={user.id}
                        userEmail={user.email}
                        userName={user.name}
                        isBlocked={user.is_blocked || false}
                        onActionComplete={loadUsers}
                      />
                    </TableCell>
                  </TableRow>
                ))}
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
