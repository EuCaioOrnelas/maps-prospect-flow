// HMAC Signing Guide — how to sign Wiize Integration requests from Wian (or any consumer).
// Curta, direta, com snippets prontos. Página admin (montada sob /admin/integration).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Fingerprint } from "lucide-react";
import { CodeBlock } from "../components/CodeBlock";

export default function HmacGuide() {
  const tsSnippet = `// TypeScript / Deno / Node 18+ — assinatura HMAC-SHA256 para chamar a Wiize
import { createHmac, randomUUID } from "node:crypto";

const CLIENT_SECRET = process.env.WIIZE_INTEGRATION_CLIENT_SECRET!;

export function signWiizeRequest(rawBody: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString(); // segundos UNIX
  const nonce = randomUUID();                                 // anti-replay
  // payload canônico: "<timestamp>.<nonce>.<rawBody>"
  const payload = \`\${timestamp}.\${nonce}.\${rawBody}\`;
  const signature = createHmac("sha256", CLIENT_SECRET)
    .update(payload)
    .digest("hex");
  return {
    "x-integration-timestamp": timestamp,
    "x-integration-nonce": nonce,
    "x-integration-signature": signature,
  };
}

// Uso
const body = JSON.stringify({ version: "v1", modules: ["cockpit"] });
const sig = signWiizeRequest(body);

const res = await fetch("https://<wiize>/functions/v1/integration-v1-context", {
  method: "POST",
  headers: {
    "apikey": process.env.WIIZE_INTEGRATION_ANON_KEY!,
    "Authorization": \`Bearer \${userJwt}\`,
    "x-integration-client-id": process.env.WIIZE_INTEGRATION_CLIENT_ID!,
    "x-integration-client-secret": process.env.WIIZE_INTEGRATION_CLIENT_SECRET!,
    "x-integration-api-version": "v1",
    "Content-Type": "application/json",
    ...sig,
  },
  body, // ⚠️  MESMA string que foi assinada — não re-serializar
});`;

  const pySnippet = `# Python 3.10+
import os, time, uuid, hmac, hashlib, json, requests

CLIENT_SECRET = os.environ["WIIZE_INTEGRATION_CLIENT_SECRET"]

def sign_wiize(raw_body: str) -> dict:
    ts = str(int(time.time()))
    nonce = str(uuid.uuid4())
    payload = f"{ts}.{nonce}.{raw_body}".encode()
    sig = hmac.new(CLIENT_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return {
        "x-integration-timestamp": ts,
        "x-integration-nonce": nonce,
        "x-integration-signature": sig,
    }

body = json.dumps({"version": "v1", "modules": ["cockpit"]}, separators=(",", ":"))
headers = {
    "apikey": os.environ["WIIZE_INTEGRATION_ANON_KEY"],
    "Authorization": f"Bearer {user_jwt}",
    "x-integration-client-id": os.environ["WIIZE_INTEGRATION_CLIENT_ID"],
    "x-integration-client-secret": os.environ["WIIZE_INTEGRATION_CLIENT_SECRET"],
    "x-integration-api-version": "v1",
    "Content-Type": "application/json",
    **sign_wiize(body),
}
r = requests.post("https://<wiize>/functions/v1/integration-v1-context",
                  headers=headers, data=body)  # data=body (mesma string!)
r.raise_for_status()`;

  const verifyServer = `// Como a Wiize verifica (lado servidor — referência)
const ts   = req.headers.get("x-integration-timestamp");
const nonce = req.headers.get("x-integration-nonce");
const sig   = req.headers.get("x-integration-signature");
const raw   = await req.text(); // corpo bruto — mesma string

// 1) skew de 300s (evita replays antigos)
if (Math.abs(Date.now()/1000 - Number(ts)) > 300) reject("timestamp");

// 2) nonce único (cache 5 min in-memory)
if (seenNonces.has(nonce)) reject("replay");
seenNonces.add(nonce);

// 3) recomputa HMAC e compara em tempo constante
const expected = hmacSha256Hex(CLIENT_SECRET, \`\${ts}.\${nonce}.\${raw}\`);
if (!timingSafeEqual(expected, sig)) reject("signature");`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="space-y-3 border-b border-border/60 pb-6">
        <Badge variant="outline" className="text-xs">Integration Layer • Segurança</Badge>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Fingerprint className="w-7 h-7 text-primary" />
          Assinatura HMAC (opcional)
        </h1>
        <p className="text-muted-foreground">
          Camada adicional de integridade. Garante que o body não foi alterado no caminho
          e impede replay de requisições capturadas. Ativa quando a variável de ambiente
          <code className="mx-1">INTEGRATION_REQUIRE_HMAC=true</code> no servidor Wiize.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Como funciona (3 passos)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="pl-5 list-decimal space-y-2">
            <li><strong>Timestamp UNIX</strong> em segundos — usado para invalidar chamadas antigas (skew máx. 300s).</li>
            <li><strong>Nonce</strong> aleatório (UUID) — usado uma única vez, cacheado por 5 min do lado Wiize.</li>
            <li><strong>Assinatura</strong> = <code>HMAC-SHA256(CLIENT_SECRET, "&lt;ts&gt;.&lt;nonce&gt;.&lt;raw_body&gt;")</code> em hex.</li>
          </ol>
          <p className="text-muted-foreground">
            Os três valores viajam nos headers <code>x-integration-timestamp</code>, <code>x-integration-nonce</code>
            e <code>x-integration-signature</code>. O corpo enviado precisa ser exatamente a mesma string usada
            na assinatura (nunca re-serializar após assinar).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">TypeScript / Node (lado Wian)</CardTitle></CardHeader>
        <CardContent><CodeBlock lang="typescript" code={tsSnippet} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Python</CardTitle></CardHeader>
        <CardContent><CodeBlock lang="python" code={pySnippet} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Referência: verificação no servidor Wiize</CardTitle></CardHeader>
        <CardContent><CodeBlock lang="typescript" code={verifyServer} /></CardContent>
      </Card>

      <Alert>
        <ShieldCheck className="w-4 h-4" />
        <AlertTitle>Erros comuns</AlertTitle>
        <AlertDescription>
          <ul className="pl-5 list-disc mt-2 space-y-1">
            <li><code>AUTH_INVALID_SIGNATURE</code> — geralmente o body foi serializado 2× (com espaços diferentes). Assine a string exata que vai no <code>body</code> do fetch.</li>
            <li><code>AUTH_TIMESTAMP_SKEW</code> — relógio do consumidor fora de sincronia. Rode NTP.</li>
            <li><code>AUTH_REPLAY_NONCE</code> — nonce reutilizado. Gere um novo UUID por request.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
