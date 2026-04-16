import { useState, useEffect } from "react";
import { Lock, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("security_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-1">Log de segurança e ações sensíveis</p>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">{log.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.resource_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{log.user_id?.slice(0, 8)}...</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <Shield size={32} className="mx-auto mb-3 opacity-40" />
              Nenhum evento de auditoria registrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
