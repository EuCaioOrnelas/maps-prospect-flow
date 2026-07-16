import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Overview() {
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          <Badge variant="secondary">v1 · Fundação</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          A Integration Layer é a única forma oficial de outros produtos da Wiize (a começar pelo Wian) consumirem contexto da plataforma.
          Nenhum produto externo acessa banco, tabelas ou lógica de negócio diretamente.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>Princípios</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Source of truth.</strong> Toda regra e todo cálculo permanece na Wiize. O Wian interpreta, nunca calcula.</p>
          <p><strong className="text-foreground">Zero acoplamento.</strong> Consumidores não conhecem tabelas, colunas, IDs internos ou schemas.</p>
          <p><strong className="text-foreground">Multi-tenant estrito.</strong> `company_id` sempre derivado do JWT — nunca do body.</p>
          <p><strong className="text-foreground">Contrato padronizado.</strong> Toda resposta (sucesso ou erro) segue o mesmo envelope.</p>
          <p><strong className="text-foreground">Auditoria total.</strong> Toda requisição é registrada em <code>integration_audit_log</code>.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Arquitetura</CardTitle></CardHeader>
        <CardContent>
          <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
{`Cliente (Wian)
     │  POST /api/v1/context
     ▼
┌─────────────────────────────────────────────┐
│  Edge Function integration-v1-context       │
│  ├─ CORS + parse body                       │
│  ├─ verifyClient (client_id + secret)       │
│  ├─ verifyUser  (JWT → user_id, company_id) │
│  ├─ rateLimit   (60 req/min por chave)      │
│  ├─ parseFilters (Zod-like)                 │
│  ├─ Context Builder                         │
│  │    ├─ CRM Provider                       │
│  │    ├─ Meta Campaigns Provider            │
│  │    └─ KPIs / Forecast Provider           │
│  ├─ audit → integration_audit_log           │
│  └─ envelope padronizado                    │
└─────────────────────────────────────────────┘`}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fora do escopo desta fase</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• Cache Redis distribuído (arquitetura preparada, MVP sem cache persistente)</p>
          <p>• Eventos em tempo real via webhook Wiize → Wian</p>
          <p>• Providers de chat, warming, score, agentes, fluxos, receita, oportunidades</p>
          <p>• OAuth 2.0 formal (auth atual: client credentials + JWT do usuário)</p>
        </CardContent>
      </Card>
    </div>
  );
}
