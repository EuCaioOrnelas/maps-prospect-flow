# Wiize AI — Gate de acesso

Este pacote contém **a edge function `verify-ai-access`** que você deve instalar no projeto **Wiize AI** (Supabase `lqfqnqfeuneorxocybru`).

Ela usa os `profiles` do próprio banco do Wiize AI (que é cópia do banco da Wiize principal) para liberar acesso só a quem tem plano **growth** ou **scale** ativo e não está bloqueado.

---

## 📂 Arquivo

```
supabase/functions/verify-ai-access/index.ts
```

## 🚀 Como instalar no projeto Wiize AI (Lovable)

### 1. Criar a edge function lá
No chat do **projeto Wiize AI** (o novo), peça:

> "Cria a edge function `verify-ai-access` com o código abaixo, em `supabase/functions/verify-ai-access/index.ts`"

e cola o conteúdo do arquivo `index.ts`.

### 2. (Opcional, mas recomendado) Adicionar shared secret
No projeto Wiize AI, adicione um secret:
- **Nome:** `WIIZE_AI_SHARED_SECRET`
- **Valor:** uma string aleatória forte (ex: `openssl rand -hex 32`)

> Isso garante que só o seu frontend Wiize AI consegue chamar a função (manda no header `x-ai-secret`). Se não setar, a função aceita qualquer origem.

### 3. Os secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão em qualquer projeto Supabase/Lovable Cloud. Não precisa adicionar nada.

### 4. `supabase/config.toml` do Wiize AI
Garante que a função está pública (sem verify_jwt), porque o usuário ainda não tem sessão quando chama:

```toml
[functions.verify-ai-access]
verify_jwt = false
```

---

## 📡 Como chamar do frontend Wiize AI

```ts
// src/hooks/useWiizeLogin.ts
import { supabase } from "@/integrations/supabase/client";

const SHARED_SECRET = import.meta.env.VITE_WIIZE_AI_SHARED_SECRET; // só se você setou

export async function loginWiizeAI(email: string, password: string) {
  const { data, error } = await supabase.functions.invoke("verify-ai-access", {
    body: { email, password },
    headers: SHARED_SECRET ? { "x-ai-secret": SHARED_SECRET } : {},
  });

  if (error) throw new Error(error.message);

  if (!data?.authorized) {
    // motivos possíveis: 'invalid_credentials' | 'no_access' | 'expired' | 'blocked'
    throw new Error(data?.reason || "unauthorized");
  }

  // Cria sessão Supabase nativa no projeto Wiize AI
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  return data.user; // { id, email, name, plan, expires_at }
}
```

> Se quiser usar a `VITE_WIIZE_AI_SHARED_SECRET`, adicione no `.env` do Wiize AI **com o mesmo valor** do secret da edge function. ⚠️ Como vai pro bundle do navegador, não é um segredo *real* — funciona mais como "chave de API pública pra ofuscar bots". O check forte continua sendo o login Supabase.

---

## 🔄 Sincronização com a Wiize principal

Como você falou que o banco é "cópia", lembra de sincronizar `profiles` periodicamente (cron ou webhook do Stripe replicado) pra refletir:
- Upgrade/downgrade de plano
- Cancelamento de assinatura
- Bloqueios

Se isso não estiver pronto, me avisa que eu te ajudo a montar.

---

## 📝 Resumo dos respostas possíveis da função

| HTTP | `authorized` | `reason`              | Significado                          |
| ---- | ------------ | --------------------- | ------------------------------------ |
| 200  | `true`       | —                     | Liberado, retorna user + tokens      |
| 401  | —            | `invalid_credentials` | Email/senha errados                  |
| 403  | `false`      | `no_access`           | Plano não é growth/scale             |
| 403  | `false`      | `expired`             | Assinatura vencida                   |
| 403  | `false`      | `blocked`             | Conta bloqueada                      |
| 403  | —            | `forbidden`           | Shared secret inválido               |
| 404  | —            | `profile_not_found`   | User existe no auth mas sem profile  |
| 400  | —            | `missing_credentials` | Body sem email/password              |
