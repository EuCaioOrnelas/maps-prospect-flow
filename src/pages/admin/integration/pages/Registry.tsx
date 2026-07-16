// Provider Registry — painel administrativo da Integration Layer.
// Lista todos os Providers descobertos + snapshot de última execução
// (via integration_audit_log).

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Boxes, Clock, Layers, Shield, Zap } from "lucide-react";
import { PROVIDER_DOCS } from "../registry/providers";

interface AuditRow { endpoint: string; success: boolean; processing_time_ms: number; created_at: string; }

export default function IntegrationRegistry() {
  const [filter, setFilter] = useState("");
  const [audits, setAudits] = useState<AuditRow[]>([]);

  useEffect(() => {
    supabase
      .from("integration_audit_log")
      .select("endpoint, success, processing_time_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setAudits((data ?? []) as AuditRow[]));
  }, []);

  const lastByProvider = useMemo(() => {
    const map = new Map<string, { at: string; ms: number; success: boolean }>();
    for (const row of audits) {
      const m = /\/api\/v1\/providers\/([a-z_]+)/.exec(row.endpoint ?? "");
      const name = m?.[1];
      if (!name || map.has(name)) continue;
      map.set(name, { at: row.created_at, ms: row.processing_time_ms, success: row.success });
    }
    return map;
  }, [audits]);

  const items = PROVIDER_DOCS
    .filter((p) => !filter || p.key.includes(filter.toLowerCase()) || p.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Boxes className="h-6 w-6" /> Provider Registry</h1>
        <p className="mt-1 text-muted-foreground">
          Núcleo de descoberta da Integration Layer. Novos módulos são adicionados apenas registrando um Provider — sem tocar no Context Builder.
        </p>
      </header>

      <div className="max-w-sm">
        <Input placeholder="Filtrar por nome…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((p) => {
          const last = lastByProvider.get(p.key);
          return (
            <Card key={p.key}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Badge variant={p.status === "stable" ? "default" : p.status === "beta" ? "secondary" : "outline"}>
                    {p.status}
                  </Badge>
                </div>
                <code className="text-xs text-muted-foreground">/api/v1/providers/{p.key}</code>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{p.description}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Layers className="h-3.5 w-3.5" /> v{p.version}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Zap className="h-3.5 w-3.5" /> prioridade {p.priority}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> cache {p.default_cache_ttl}s</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Shield className="h-3.5 w-3.5" /> plano {p.minimum_plan}</div>
                </div>
                {p.dependencies.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs uppercase text-muted-foreground">Dependências</div>
                    <div className="flex flex-wrap gap-1">{p.dependencies.map((d) => <Badge key={d} variant="outline">{d}</Badge>)}</div>
                  </div>
                )}
                {p.filters.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs uppercase text-muted-foreground">Filtros</div>
                    <div className="flex flex-wrap gap-1">{p.filters.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}</div>
                  </div>
                )}
                {last && (
                  <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
                    Última execução:{" "}
                    <span className={last.success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                      {last.success ? "sucesso" : "erro"}
                    </span>{" "}
                    · {last.ms}ms · {new Date(last.at).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
