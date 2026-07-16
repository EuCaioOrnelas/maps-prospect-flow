import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface AuditRow {
  id: string;
  request_id: string;
  client_id: string | null;
  user_id: string | null;
  company_id: string | null;
  endpoint: string;
  version: string;
  modules: string[];
  status_code: number;
  success: boolean;
  error_code: string | null;
  processing_time_ms: number;
  records_returned: number;
  ip: string | null;
  created_at: string;
}

export default function Audit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("integration_audit_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Auditoria</h1>
          <p className="mt-1 text-muted-foreground">Últimas 100 chamadas à Integration Layer.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>
      <Card>
        <CardHeader><CardTitle>Log</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Quando</th>
                  <th className="px-2 py-2 text-left">Client</th>
                  <th className="px-2 py-2 text-left">Endpoint</th>
                  <th className="px-2 py-2 text-left">Módulos</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Tempo</th>
                  <th className="px-2 py-2 text-left">Reg.</th>
                  <th className="px-2 py-2 text-left">Erro</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Nenhuma chamada registrada ainda.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-2 py-2 font-mono">{r.client_id?.slice(0, 8) ?? "—"}</td>
                    <td className="px-2 py-2 font-mono">{r.endpoint}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">{(r.modules ?? []).map((m) => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}</div>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant={r.success ? "default" : "destructive"}>{r.status_code}</Badge>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{r.processing_time_ms}ms</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.records_returned}</td>
                    <td className="px-2 py-2 font-mono text-[10px] text-destructive">{r.error_code ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
