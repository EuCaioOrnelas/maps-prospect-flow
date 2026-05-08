# Sistema de Suporte IA Wiize — "Wian"

Esse é um projeto grande. Vou implementar em **5 fases sequenciais** para que você possa validar cada etapa antes de avançar. Em cada fase entrego algo funcional de ponta a ponta.

> ⚠️ Antes de começar, preciso confirmar 2 coisas (responda no chat depois de aprovar este plano):
> 1. **Embeddings com pgvector**: posso habilitar a extensão `vector` no Lovable Cloud? (necessário para busca semântica real do Mind IA)
> 2. **Vídeos do FAQ**: prefere apenas URL externa (YouTube/Vimeo) ou também upload direto pro Storage? Upload consome storage e exige bucket dedicado.

---

## Fase 1 — Banco de dados + Chat público "Wian" (substitui o Typebot)

**Banco (1 migration):**
- `support_tickets` — id, user_id (nullable p/ visitantes), name, email, phone, status (open/in_progress/resolved/escalated/closed), priority, category, resolved_by (ai/human), ai_confidence, ai_summary, rating, rating_comment, created_at, updated_at
- `support_messages` — ticket_id, role (user/ai/agent/system), content, metadata jsonb
- `knowledge_base` — title, category, subtopic, tags[], pains (text), solution (rich text/html), guided_flow jsonb, severity, auto_escalate, min_confidence, embedding vector(1536), active
- `faq_topics` — name, slug, order, icon, active
- `faqs` — topic_id, title, content (html), video_url, tags[], order, active, embedding
- `ai_logs` — ticket_id, query, matched_kb_ids[], confidence, model, tokens
- `support_ratings` — ticket_id, stars, comment
- `system_alerts` — type, message, count, period_start, resolved
- RLS: usuário vê só seus tickets; admins veem tudo (`has_role admin`); FAQ público

**Edge functions:**
- `support-chat` (público) — busca semântica via pgvector + GPT-4o-mini + streaming, persiste mensagens, gera resumo, decide escalonamento
- `support-embed` — gera embedding ao criar/editar KB ou FAQ (trigger via app)

**Frontend público:**
- Substituir iframe Typebot em `src/pages/Contact.tsx` pelo novo chat Wian
- Novo componente `src/components/support/WianChat.tsx` — bolhas, avatar Wiize, "Wian está digitando…", scroll auto, persistência local + ticket no Supabase, fluxo "resolveu? → avaliação OU coletar nome/email/telefone → escalar"
- Tom em PT-BR, objetivo, profissional

## Fase 2 — Admin: Tickets

- Nova entrada na sidebar `Admin → Suporte → Tickets`
- `/admin/suporte/tickets` — tabela com filtros (status, prioridade, categoria, resolvido por IA, avaliação), busca (nome/email/conteúdo), paginação
- `/admin/suporte/tickets/:id` — conversa completa, resumo IA, dados do usuário, ações: responder manualmente, mudar status, marcar resolvido, observações internas

## Fase 3 — Admin: Mind IA

- `/admin/suporte/mind-ia` — CRUD de conhecimentos
- Form com: título, categoria, subtópico, tags, prioridade, dores (textarea grande), solução (rich text), fluxo guiado (builder simples de perguntas condicionais), gravidade, escalar auto, score mínimo
- Ao salvar → chama `support-embed` para gerar embedding
- Lista com filtros, busca, ativar/desativar

## Fase 4 — Admin: FAQs (substitui FAQ atual)

- `/admin/suporte/faqs` — gerenciar tópicos (drag-to-reorder) e FAQs dentro de cada
- Seed inicial dos 13 tópicos listados (Plataforma, IA e Prospecção, WhatsApp e Disparos, etc.)
- FAQ form: título, conteúdo rich text, URL de vídeo (e upload se confirmado), tags
- Página pública `/ajuda/faq` consome essa nova base
- Embedding automático → IA usa FAQs como contexto também

## Fase 5 — Dashboard de métricas + Detecção de problemas sistêmicos

- `/admin/suporte/metricas` — KPIs (totais, % resolução IA, tempo médio resposta, avaliação média), gráficos (linha por período, barras por categoria, pizza resolvido IA vs humano), top dores, top erros
- Cron job (edge function agendada): detecta N+ tickets com mesma categoria/dor em janela curta → cria `system_alerts` → badge na sidebar admin

---

## Detalhes técnicos

- **Modelo IA**: `google/gemini-3-flash-preview` para chat (rápido/barato), `text-embedding-3-small` (1536d) para embeddings — via Lovable AI Gateway, sem chave manual
- **Busca semântica**: função SQL `match_knowledge(query_embedding, threshold, count)` usando `<=>` do pgvector
- **Stack respeitada**: tokens semânticos Tailwind, modais com `bg-black/70` (sem blur), B2B only, idempotente
- **Sidebar admin**: nova seção "Suporte" com 4 itens (Tickets, Mind IA, FAQs, Métricas)
- **Performance**: paginação 20/página, debounce 300ms na busca, React Query com cache, lazy load das páginas admin

---

## Confirmação

Responda:
- ✅ **"pode começar"** → executo Fase 1 (DB + chat Wian) e paro pra você validar
- ✅ **"faz tudo de uma vez"** → executo todas as 5 fases em sequência (vai gerar muitos arquivos numa rodada só)
- 🔧 Ou ajuste qualquer parte antes de eu começar

E me confirme as 2 perguntas do topo (pgvector + upload de vídeo).