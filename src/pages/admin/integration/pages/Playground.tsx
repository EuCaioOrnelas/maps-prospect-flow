import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, PlayCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DEFAULT_BODY = JSON.stringify(
  {
    version: "v1",
    modules: ["kpis.forecast", "crm.pipeline"],
    filters: { pagination: { page: 1, size: 20 } },
  },
  null,
  2,
);

export default function Playground() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [response, setResponse] = useState<any>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null); setResponse(null); setElapsed(null); setStatus(null);
    try {
      const parsed = JSON.parse(body);
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      if (!jwt) { setError("Nenhuma sessão ativa — faça login."); return; }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-v1-context`;
      const started = performance.now();
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "x-integration-client-id": clientId,
          "x-integration-client-secret": clientSecret,
        },
        body: JSON.stringify(parsed),
      });
      setElapsed(Math.round(performance.now() - started));
      setStatus(res.status);
      const json = await res.json();
      setResponse(json);
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
        <p className="mt-1 text-muted-foreground">Chame a Integration Layer com seu JWT de admin. Somente leitura — Providers desta fase não têm efeitos colaterais.</p>
      </header>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Credenciais sensíveis</AlertTitle>
        <AlertDescription>
          Cole o <code>INTEGRATION_WIAN_CLIENT_ID</code> e o <code>INTEGRATION_WIAN_CLIENT_SECRET</code> gerados em Cloud → Secrets. Eles ficam apenas em memória neste browser.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle>Requisição</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="cid">Client ID</Label>
              <Input id="cid" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="INTEGRATION_WIAN_CLIENT_ID" />
            </div>
            <div>
              <Label htmlFor="csec">Client Secret</Label>
              <Input id="csec" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="INTEGRATION_WIAN_CLIENT_SECRET" />
            </div>
          </div>
          <div>
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="font-mono text-xs" />
          </div>
          <Button onClick={run} disabled={loading || !clientId || !clientSecret}>
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
              <pre className="max-h-[500px] overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(response, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
