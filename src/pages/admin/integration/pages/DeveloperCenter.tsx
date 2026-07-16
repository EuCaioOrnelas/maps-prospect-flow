// Developer Center — documentação completa para integradores externos (Wian).
// Consolida em uma única página tudo o que um dev precisa: auth, JWT, refresh,
// exemplos, DTOs, providers, filtros, erros, rate limit, cache e versionamento.
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  BookOpen, KeyRound, Shield, Clock, Layers, Filter as FilterIcon,
  AlertOctagon, Gauge, Database, GitBranch, PlayCircle, Rocket, Terminal,
} from "lucide-react";
import { PROVIDER_DOCS } from "../registry/providers";
import { ERROR_DOCS } from "../registry/errors";
import { FILTER_DOCS } from "../registry/filters";

const BASE_URL = "https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1";
const AUTH_URL = "https://wgokhkawjdxsmvfuhazb.supabase.co/auth/v1";

function Code({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <pre className={`overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed ${className}`}>
      <code>{children}</code>
    </pre>
  );
}

function SectionTitle({ icon: Icon, title, id }: { icon: any; title: string; id?: string }) {
  return (
    <div id={id} className="flex items-center gap-2 scroll-mt-20">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  );
}

export default function DeveloperCenter() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold">Developer Center</h1>
          <Badge variant="outline">Integration Layer · v1</Badge>
        </div>
        <p className="max-w-3xl text-muted-foreground">
          Documentação oficial para integradores externos (Wian e futuros produtos). Aqui está tudo
          que você precisa para autenticar, consumir Providers, tratar erros e escalar a integração.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm"><Link to="../playground"><PlayCircle className="mr-2 h-4 w-4" />Abrir Playground</Link></Button>
          <Button asChild size="sm" variant="outline"><a href="#quickstart"><Terminal className="mr-2 h-4 w-4" />Quickstart</a></Button>
        </div>
      </header>

      {/* Índice */}
      <Card>
        <CardHeader><CardTitle className="text-base">Índice</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-1 text-sm md:grid-cols-3">
            {[
              ["#quickstart","Quickstart"],
              ["#auth","Autenticação"],
              ["#jwt","JWT & Refresh Token"],
              ["#endpoints","Endpoints"],
              ["#examples","Exemplos de requisição"],
              ["#providers","Providers & DTOs"],
              ["#filters","Filtros"],
              ["#errors","Erros"],
              ["#rate","Rate limit"],
              ["#cache","Cache"],
              ["#version","Versionamento"],
              ["#sdk","Snippets SDK"],
            ].map(([href, label]) => (
              <li key={href}><a href={href} className="text-primary hover:underline">{label}</a></li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Quickstart */}
      <section className="space-y-4">
        <SectionTitle icon={Rocket} title="Quickstart" id="quickstart" />
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            <ol className="ml-4 list-decimal space-y-3 text-muted-foreground">
              <li>Receba do time Wiize suas credenciais <code>CLIENT_ID</code> e <code>CLIENT_SECRET</code> (armazene em variáveis de ambiente, nunca no frontend).</li>
              <li>Autentique o usuário final via <code>/auth/v1/token?grant_type=password</code> e obtenha <code>access_token</code> e <code>refresh_token</code>.</li>
              <li>Chame <code>POST /api/v1/context</code> (orquestrador) ou <code>POST /api/v1/providers/&lt;nome&gt;</code> com os 4 headers obrigatórios.</li>
              <li>Trate erros pelo campo <code>errors[].code</code>. Respeite <code>Retry-After</code> em 429.</li>
              <li>Renove o <code>access_token</code> quando ele expirar usando o <code>refresh_token</code>.</li>
            </ol>
            <Alert>
              <AlertTitle>Base URL</AlertTitle>
              <AlertDescription>
                <code className="text-xs">{BASE_URL}</code>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      {/* Autenticação */}
      <section className="space-y-4">
        <SectionTitle icon={Shield} title="Autenticação em duas camadas" id="auth" />
        <Card>
          <CardHeader>
            <CardDescription>
              Toda requisição precisa provar <strong>quem é o cliente</strong> (Wian) e <strong>quem é o usuário</strong> (multi-tenant).
              O <code>company_id</code> NUNCA vem do body — é derivado do JWT no servidor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-border p-4">
                <div className="mb-2 flex items-center gap-2"><KeyRound className="h-4 w-4" /><strong>1. Client Credentials</strong></div>
                <p className="text-muted-foreground">Prova que a chamada vem de um produto autorizado.</p>
                <Code>{`x-integration-client-id: <CLIENT_ID>
x-integration-client-secret: <CLIENT_SECRET>`}</Code>
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="mb-2 flex items-center gap-2"><KeyRound className="h-4 w-4" /><strong>2. JWT do usuário</strong></div>
                <p className="text-muted-foreground">Identifica <code>user_id</code> e <code>company_id</code>.</p>
                <Code>{`Authorization: Bearer <access_token>`}</Code>
              </div>
            </div>
            <Alert variant="destructive">
              <AlertTitle>Nunca exponha o Client Secret no browser</AlertTitle>
              <AlertDescription>
                Client credentials devem viver apenas no backend do Wian. Do frontend do usuário, envie a requisição para o seu backend, que a repassa à Integration Layer.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      {/* JWT & Refresh */}
      <section className="space-y-4">
        <SectionTitle icon={Clock} title="Fluxo de login, JWT e Refresh Token" id="jwt" />
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            <Tabs defaultValue="login">
              <TabsList>
                <TabsTrigger value="login">Login (email + senha)</TabsTrigger>
                <TabsTrigger value="refresh">Refresh Token</TabsTrigger>
                <TabsTrigger value="logout">Logout</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-3">
                <p className="text-muted-foreground">Chame o endpoint de auth do Supabase que o Wiize usa:</p>
                <Code>{`POST ${AUTH_URL}/token?grant_type=password
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>

{
  "email": "user@empresa.com",
  "password": "***"
}`}</Code>
                <p className="text-muted-foreground">Resposta:</p>
                <Code>{`{
  "access_token": "eyJhbGciOi…",   // JWT (curto — ~1h)
  "token_type": "bearer",
  "expires_in": 3600,
  "expires_at": 1761234567,
  "refresh_token": "v1.d3f…",      // longo, single-use
  "user": { "id": "…", "email": "…" }
}`}</Code>
                <p className="text-muted-foreground">
                  Guarde <code>access_token</code> em memória, <code>refresh_token</code> em armazenamento seguro do backend (cookie httpOnly ou store server-side).
                </p>
              </TabsContent>

              <TabsContent value="refresh" className="space-y-3">
                <p className="text-muted-foreground">Quando o <code>access_token</code> expirar (ou ~2min antes), troque pelo refresh:</p>
                <Code>{`POST ${AUTH_URL}/token?grant_type=refresh_token
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>

{ "refresh_token": "v1.d3f…" }`}</Code>
                <p className="text-muted-foreground">
                  A resposta retorna um novo <code>access_token</code> e um novo <code>refresh_token</code> (rotativo). Descarte o antigo imediatamente — usá-lo de novo invalida a sessão.
                </p>
                <Alert>
                  <AlertTitle>Estratégia recomendada</AlertTitle>
                  <AlertDescription>
                    Antes de cada chamada à Integration Layer, verifique <code>expires_at</code>. Se estiver a menos de 60s do vencimento, faça refresh primeiro. Se receber <code>AUTH_INVALID_USER_TOKEN</code>, faça refresh e retente uma única vez.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="logout" className="space-y-3">
                <Code>{`POST ${AUTH_URL}/logout
Authorization: Bearer <access_token>
apikey: <SUPABASE_ANON_KEY>`}</Code>
                <p className="text-muted-foreground">Invalida a sessão do usuário no servidor.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* Endpoints */}
      <section className="space-y-4">
        <SectionTitle icon={Layers} title="Endpoints" id="endpoints" />
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-border p-4">
                <div className="mb-1 flex items-center gap-2"><Badge>POST</Badge><code className="text-xs">/api/v1/context</code></div>
                <p className="text-muted-foreground text-xs">Orquestrador. Executa múltiplos Providers em paralelo e consolida.</p>
                <p className="mt-2 text-xs">URL real: <code>{BASE_URL}/integration-v1-context</code></p>
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="mb-1 flex items-center gap-2"><Badge>POST</Badge><code className="text-xs">/api/v1/providers/&lt;nome&gt;</code></div>
                <p className="text-muted-foreground text-xs">Executa um único Provider. Informe o nome em <code>body.provider</code> ou <code>x-provider-name</code>.</p>
                <p className="mt-2 text-xs">URL real: <code>{BASE_URL}/integration-v1-provider</code></p>
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Headers obrigatórios</div>
              <Code>{`Authorization: Bearer <access_token>
apikey: <SUPABASE_ANON_KEY>
x-integration-client-id: <CLIENT_ID>
x-integration-client-secret: <CLIENT_SECRET>
Content-Type: application/json

// Opcionais
x-request-id: <id idempotente para tracing>
x-integration-cache-bypass: true   // força refresh de Provider
x-provider-name: <nome>            // alternativa a body.provider`}</Code>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Exemplos */}
      <section className="space-y-4">
        <SectionTitle icon={Terminal} title="Exemplos de requisição" id="examples" />
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="curl">
              <TabsList>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="ts">TypeScript</TabsTrigger>
                <TabsTrigger value="py">Python</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
              </TabsList>

              <TabsContent value="curl">
                <Code>{`curl -X POST "${BASE_URL}/integration-v1-context" \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "apikey: $SUPABASE_ANON_KEY" \\
  -H "x-integration-client-id: $CLIENT_ID" \\
  -H "x-integration-client-secret: $CLIENT_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "version": "v1",
    "modules": ["cockpit", "crm", "pipeline"],
    "filters": {
      "period": { "from": "2026-01-01", "to": "2026-01-31" },
      "pagination": { "page": 1, "size": 20 }
    }
  }'`}</Code>
              </TabsContent>

              <TabsContent value="ts">
                <Code>{`async function fetchContext(accessToken: string) {
  const res = await fetch(
    "${BASE_URL}/integration-v1-context",
    {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${accessToken}\`,
        apikey: process.env.SUPABASE_ANON_KEY!,
        "x-integration-client-id": process.env.WIAN_CLIENT_ID!,
        "x-integration-client-secret": process.env.WIAN_CLIENT_SECRET!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "v1",
        modules: ["cockpit", "crm"],
        filters: { pagination: { page: 1, size: 20 } },
      }),
    },
  );
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 5);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return fetchContext(accessToken);
  }
  return res.json();
}`}</Code>
              </TabsContent>

              <TabsContent value="py">
                <Code>{`import os, requests

def fetch_provider(name: str, access_token: str, filters: dict | None = None):
    r = requests.post(
        "${BASE_URL}/integration-v1-provider",
        headers={
            "Authorization": f"Bearer {access_token}",
            "apikey": os.environ["SUPABASE_ANON_KEY"],
            "x-integration-client-id": os.environ["WIAN_CLIENT_ID"],
            "x-integration-client-secret": os.environ["WIAN_CLIENT_SECRET"],
            "Content-Type": "application/json",
        },
        json={"provider": name, "filters": filters or {}},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()`}</Code>
              </TabsContent>

              <TabsContent value="response">
                <Code>{`{
  "status": 200,
  "success": true,
  "timestamp": "2026-07-16T12:00:00.000Z",
  "request_id": "8f2c…",
  "company_id": "1a…",
  "version": "v1",
  "processing_time_ms": 320,
  "cache": { "hit": false, "ttl_s": 0 },
  "filters_applied": { "pagination": { "page": 1, "size": 20 } },
  "context": {
    "cockpit": {
      "data": { "leads_total": 120, "leads_conversion_rate": 0.32 },
      "metadata": {
        "version": "1.0.0",
        "processing_time_ms": 60,
        "cache": { "hit": true, "ttl_s": 44 },
        "filters_applied": {},
        "records_count": 1
      }
    },
    "crm": {
      "data": { "items": [ /* … */ ], "meta": { "total": 340 } },
      "metadata": { "version": "1.0.0", "records_count": 20, "cache": { "hit": false, "ttl_s": 30 } }
    }
  },
  "errors": []
}`}</Code>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* Providers */}
      <section className="space-y-4">
        <SectionTitle icon={Database} title="Providers & DTOs" id="providers" />
        <p className="text-sm text-muted-foreground">
          Cada Provider é um domínio isolado. Ver detalhes completos em <Link to="../providers" className="text-primary hover:underline">Providers</Link> e catálogo vivo em <Link to="../registry" className="text-primary hover:underline">Provider Registry</Link>.
        </p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Provider</th>
                <th className="px-3 py-2 text-left">Domínio</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Plano mín.</th>
                <th className="px-3 py-2 text-left">Cache TTL</th>
                <th className="px-3 py-2 text-left">Depende de</th>
                <th className="px-3 py-2 text-left">Filtros</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDER_DOCS.map((p) => (
                <tr key={p.key} className="border-t border-border">
                  <td className="px-3 py-2"><code className="text-xs">{p.key}</code></td>
                  <td className="px-3 py-2 text-muted-foreground">{p.domain}</td>
                  <td className="px-3 py-2">
                    <Badge variant={p.status === "stable" ? "default" : "outline"}>{p.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.minimum_plan}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.default_cache_ttl}s</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{p.dependencies.join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.filters.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filtros */}
      <section className="space-y-4">
        <SectionTitle icon={FilterIcon} title="Filtros" id="filters" />
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Filtro</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Formato</th>
                    <th className="px-3 py-2 text-left">Exemplo</th>
                    <th className="px-3 py-2 text-left">Aplica-se a</th>
                  </tr>
                </thead>
                <tbody>
                  {FILTER_DOCS.map((f) => (
                    <tr key={f.name} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{f.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
                      <td className="px-3 py-2 text-muted-foreground">{f.format}</td>
                      <td className="px-3 py-2 font-mono text-xs">{f.example}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{f.applies_to.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Erros */}
      <section className="space-y-4">
        <SectionTitle icon={AlertOctagon} title="Catálogo de erros" id="errors" />
        <Card>
          <CardContent className="pt-6 space-y-4 text-sm">
            <p className="text-muted-foreground">
              Toda resposta de erro segue o mesmo envelope, com <code>success: false</code> e <code>errors[]</code>. Nunca são retornados stack traces ou SQL.
            </p>
            <Code>{`{
  "status": 401,
  "success": false,
  "request_id": "…",
  "errors": [{ "code": "AUTH_INVALID_USER_TOKEN", "message": "Token do usuário inválido ou expirado." }]
}`}</Code>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">HTTP</th>
                    <th className="px-3 py-2 text-left">Significado</th>
                    <th className="px-3 py-2 text-left">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_DOCS.map((e) => (
                    <tr key={e.code} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{e.code}</td>
                      <td className="px-3 py-2"><Badge variant="outline">{e.status}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">{e.meaning}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Rate limit */}
      <section className="space-y-4">
        <SectionTitle icon={Gauge} title="Rate limit" id="rate" />
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li><code>/api/v1/context</code>: <strong>60 req/min</strong> por <code>client_id</code> + <code>user_id</code>.</li>
              <li><code>/api/v1/providers/&lt;nome&gt;</code>: <strong>120 req/min</strong> por <code>client_id</code> + <code>user_id</code> + provider.</li>
              <li>Ao estourar → HTTP <code>429</code> com header <code>Retry-After</code> em segundos.</li>
            </ul>
            <Alert>
              <AlertTitle>Boas práticas</AlertTitle>
              <AlertDescription>
                Prefira <code>/context</code> com múltiplos módulos em vez de N chamadas paralelas. Use um agendador (queue) no seu backend e respeite backoff exponencial.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      {/* Cache */}
      <section className="space-y-4">
        <SectionTitle icon={Database} title="Cache" id="cache" />
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li>Cada Provider define seu próprio <code>defaultCacheTTL</code> (ver tabela de Providers).</li>
              <li>Chave de cache: <code>company_id + provider + filters</code>. Multi-tenant é sempre isolado.</li>
              <li>Resposta expõe <code>metadata.cache.hit</code> e <code>ttl_s</code> por provider.</li>
              <li>Para forçar refresh, envie header <code>x-integration-cache-bypass: true</code>.</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Versionamento */}
      <section className="space-y-4">
        <SectionTitle icon={GitBranch} title="Versionamento" id="version" />
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
            <p>Versão atual: <Badge>v1</Badge>. Toda requisição envia <code>version: "v1"</code> no body.</p>
            <p>Breaking changes sempre geram uma nova versão (<code>v2</code>). A versão anterior mantém suporte por no mínimo 6 meses após o anúncio.</p>
            <p>Cada Provider tem sua própria <code>version</code> semver interna, exposta em <code>metadata.version</code>. Mudanças aditivas (novos campos) não incrementam a versão do endpoint.</p>
          </CardContent>
        </Card>
      </section>

      {/* SDK helpers */}
      <section className="space-y-4">
        <SectionTitle icon={BookOpen} title="Snippets SDK sugeridos" id="sdk" />
        <Card>
          <CardContent className="pt-6 space-y-4 text-sm">
            <p className="text-muted-foreground">Cliente mínimo com refresh automático (TypeScript):</p>
            <Code>{`export class WiizeClient {
  constructor(private opts: {
    baseUrl: string; supabaseUrl: string; anonKey: string;
    clientId: string; clientSecret: string;
    getSession: () => { access_token: string; refresh_token: string; expires_at: number };
    saveSession: (s: any) => void;
  }) {}

  private async ensureFresh() {
    const s = this.opts.getSession();
    if (s.expires_at - Date.now() / 1000 > 60) return s.access_token;
    const r = await fetch(\`\${this.opts.supabaseUrl}/auth/v1/token?grant_type=refresh_token\`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: this.opts.anonKey },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    const next = await r.json();
    this.opts.saveSession(next);
    return next.access_token;
  }

  async provider<T = unknown>(name: string, filters: Record<string, unknown> = {}) {
    const token = await this.ensureFresh();
    const r = await fetch(\`\${this.opts.baseUrl}/integration-v1-provider\`, {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${token}\`,
        apikey: this.opts.anonKey,
        "x-integration-client-id": this.opts.clientId,
        "x-integration-client-secret": this.opts.clientSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider: name, filters }),
    });
    return r.json() as Promise<T>;
  }
}`}</Code>
          </CardContent>
        </Card>
      </section>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Última atualização sincronizada com o Provider Registry desta build. Dúvidas: contate o time Wiize Platform.
      </p>
    </div>
  );
}
