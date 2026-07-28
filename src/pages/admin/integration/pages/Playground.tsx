import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, PlayCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PROVIDER_DOCS } from "../registry/providers";
import { CodeBlock } from "../components/CodeBlock";

const CONTEXT_BODY = JSON.stringify(
  { version: "v1", modules: ["cockpit", "crm", "pipeline"], filters: { pagination: { page: 1, size: 20 } } },
  null, 2,
);

function providerBody(name: string) {
  return JSON.stringify(
    { provider: name, filters: { pagination: { page: 1, size: 20 } } },
    null, 2,
  );
}

type Endpoint = { id: string; label: string; target: "integration-v1-context" | "integration-v1-provider"; body: string };

export default function Playground() {
  const endpoints = useMemo<Endpoint[]>(() => [
    { id: "context", label: "POST /api/v1/context (Orquestrador)", target: "integration-v1-context", body: CONTEXT_BODY },
    ...PROVIDER_DOCS.map<Endpoint>((p) => ({
      id: `provider:${p.key}`,
      label: `POST /api/v1/providers/${p.key}`,
      target: "integration-v1-provider",
      body: providerBody(p.key),
    })),
  ], []);

  const [endpointId, setEndpointId] = useState("context");
  const [body, setBody] = useState(CONTEXT_BODY);
  const [bypassCache, setBypassCache] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onEndpointChange(id: string) {
    setEndpointId(id);
    const ep = endpoints.find((e) => e.id === id)!;
    setBody(ep.body);
  }

  async function run() {
    setLoading(true); setError(null); setResponse(null); setElapsed(null); setStatus(null);
    try {
      const parsed = JSON.parse(body);
      const ep = endpoints.find((e) => e.id === endpointId)!;

      // Call the backend proxy — client_id/secret NEVER leave the server.
      const started = performance.now();
      const { data, error: fnErr } = await supabase.functions.invoke("integration-portal-proxy", {
        body: { target: ep.target, body: parsed, bypass_cache: bypassCache },
      });
      const total = Math.round(performance.now() - started);

      if (fnErr) {
        setError(fnErr.message || "Falha ao invocar proxy");
        return;
      }
      setElapsed((data as any)?.proxy?.elapsed_ms ?? total);
      setStatus((data as any)?.proxy?.upstream_status ?? 200);
      setResponse((data as any)?.response ?? data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Playground</h1>
        <p className="mt-1 text-muted-foreground">
          Teste o orquestrador ou qualquer Provider individual. Credenciais são injetadas no backend — nunca ficam no browser.
        </p>
      </header>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Modo seguro ativo</AlertTitle>
        <AlertDescription>
          Este playground roda através do <code>integration-portal-proxy</code> (edge function admin-only).
          Seu JWT é validado como admin no backend e o <code>client_secret</code> nunca é enviado pelo navegador.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle>Requisição</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Endpoint</Label>
            <Select value={endpointId} onValueChange={onEndpointChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-96">
                {endpoints.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="bypass" checked={bypassCache} onCheckedChange={setBypassCache} />
            <Label htmlFor="bypass" className="cursor-pointer">Ignorar cache do Provider (força re-execução)</Label>
          </div>
          <div>
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="font-mono text-xs" />
          </div>
          <Button onClick={run} disabled={loading}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {loading ? "Executando…" : "Executar"}
          </Button>
        </CardContent>
      </Card>

      {(response || error) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Response</CardTitle>
              <div className="text-xs text-muted-foreground">
                {status && <>HTTP {status} · </>}{elapsed !== null && <>{elapsed}ms</>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {response && (
              <CodeBlock lang="json" code={JSON.stringify(response, null, 2)} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
