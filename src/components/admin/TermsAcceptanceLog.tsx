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
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TermsAcceptance {
  id: string;
  email: string;
  name: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  plan: string;
}

export const TermsAcceptanceLog = () => {
  const [acceptances, setAcceptances] = useState<TermsAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const loadAcceptances = async () => {
    setLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('terms_accepted_at', 'is', null);
      
      setTotalCount(count || 0);

      // Get paginated data
      let query = supabase
        .from('profiles')
        .select('id, email, name, terms_accepted_at, created_at, plan')
        .not('terms_accepted_at', 'is', null)
        .order('terms_accepted_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

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
  }, [page, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Nome', 'Plano', 'Data de Aceite', 'Data de Cadastro'];
    const rows = acceptances.map(a => [
      a.email,
      a.name || '-',
      a.plan,
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
          Histórico de Aceites de Termos
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
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="text-xs">
            {totalCount} aceites registrados
          </Badge>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Email</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Data do Aceite</TableHead>
                <TableHead>Data de Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : acceptances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum aceite de termos encontrado
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
