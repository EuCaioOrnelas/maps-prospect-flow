import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  RefreshCw, 
  FileCheck, 
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TermsAcceptance {
  id: string;
  email: string;
  name: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  plan: string;
}

type FilterStatus = 'all' | 'accepted' | 'pending';

export const TermsAcceptanceLog = () => {
  const [acceptances, setAcceptances] = useState<TermsAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const pageSize = 20;

  const loadAcceptances = async () => {
    setLoading(true);
    try {
      // Get counts
      const { count: totalC } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: acceptedC } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('terms_accepted_at', 'is', null);

      setAcceptedCount(acceptedC || 0);
      setPendingCount((totalC || 0) - (acceptedC || 0));

      // Build query
      let query = supabase
        .from('profiles')
        .select('id, email, name, terms_accepted_at, created_at, plan')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filterStatus === 'accepted') {
        query = query.not('terms_accepted_at', 'is', null);
      } else if (filterStatus === 'pending') {
        query = query.is('terms_accepted_at', null);
      }

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

      // Count for current filter
      let countQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (filterStatus === 'accepted') {
        countQuery = countQuery.not('terms_accepted_at', 'is', null);
      } else if (filterStatus === 'pending') {
        countQuery = countQuery.is('terms_accepted_at', null);
      }

      if (searchTerm) {
        countQuery = countQuery.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

      const { count: filteredCount } = await countQuery;
      setTotalCount(filteredCount || 0);

      const { data, error } = await query;
      if (error) throw error;
      setAcceptances(data || []);
    } catch (error) {
      console.error('Error loading terms acceptances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcceptances();
  }, [page, searchTerm, filterStatus]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleFilterChange = (value: FilterStatus) => {
    setFilterStatus(value);
    setPage(0);
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Nome', 'Plano', 'Status Termos', 'Data de Aceite', 'Data de Cadastro'];
    const rows = acceptances.map(a => [
      a.email,
      a.name || '-',
      a.plan,
      a.terms_accepted_at ? 'Aceito' : 'Pendente',
      a.terms_accepted_at ? format(new Date(a.terms_accepted_at), "dd/MM/yyyy HH:mm:ss") : '-',
      format(new Date(a.created_at), "dd/MM/yyyy HH:mm:ss")
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aceites-termos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileCheck className="h-5 w-5 text-primary" />
          Aceite de Termos de Uso
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={acceptances.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAcceptances}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 border border-border/50">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-semibold">{acceptedCount + pendingCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Aceitos</p>
              <p className="text-sm font-semibold text-emerald-500">{acceptedCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 border border-amber-500/20">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-sm font-semibold text-amber-500">{pendingCount}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => handleFilterChange(v as FilterStatus)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="accepted">Aceitos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {totalCount} resultados
          </Badge>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Email</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data do Aceite</TableHead>
                <TableHead>Data de Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : acceptances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                acceptances.map((acceptance) => (
                  <TableRow key={acceptance.id}>
                    <TableCell className="font-mono text-sm">
                      {acceptance.email}
                    </TableCell>
                    <TableCell>
                      {acceptance.name || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={acceptance.plan === 'free' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {acceptance.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {acceptance.terms_accepted_at ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Aceito
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {acceptance.terms_accepted_at ? (
                        format(new Date(acceptance.terms_accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(acceptance.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
