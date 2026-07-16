import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Security() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Segurança</h1>
        <p className="mt-1 text-muted-foreground">Defense in depth. Múltiplas camadas independentes.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Autenticação</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. <strong className="text-foreground">Client credentials</strong> (client_id + client_secret) provam que a requisição vem do produto autorizado. Comparação constant-time para evitar timing attacks.</p>
          <p>2. <strong className="text-foreground">JWT do usuário Wiize</strong> valida a identidade final e é a fonte única de <code>user_id</code> e <code>company_id</code>. O body <em>nunca</em> pode influenciar esses campos.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Isolamento multi-tenant</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Toda consulta filtra por <code>company_id</code> derivado do JWT (usando o dono da conta via <code>account_members</code> quando o usuário for sub-usuário). É impossível uma empresa acessar dados de outra pela API.
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Auditoria</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Toda requisição (sucesso ou falha) grava <code>integration_audit_log</code> com client, user, empresa, endpoint, módulos, filtros, tempo, IP e User-Agent. Somente admins leem; escrita apenas via service role.
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Superfície mínima de exposição</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          DTOs específicos jamais retornam tokens Meta, phone_number_id, waba_id, secrets ou colunas administrativas. Nunca é retornado stack trace ou SQL.
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Comunicação</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Somente HTTPS (edge Supabase). CORS restrito a headers conhecidos. Endpoint é privado e destinado a chamadas backend-to-backend.
        </CardContent>
      </Card>
    </div>
  );
}
