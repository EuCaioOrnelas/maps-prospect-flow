---
name: Limites de prospecção de influenciadores
description: Rate limits e quotas do módulo Admin > Partners > YouTube Prospecting
type: feature
---
Módulo Admin-only `/admin/partners/influenciadores` (edge function `youtube-influencer-prospect`).

Limites aplicados SEMPRE no servidor (fonte de verdade = tabela `influencer_searches`):
- 10 prospecções por admin / 24h corridas
- 25 prospecções globais (toda a equipe) / 24h
- Cooldown de 60s entre buscas do mesmo admin
- Rajada: máx. 3 buscas por admin em 10 min (RPC `check_rate_limit`, endpoint `influencer_prospect_search`)
- Máx. 50 canais analisados por busca

Motivo: quota da YouTube Data API (10.000 unidades/dia; cada `search.list` = 100) e custo OpenAI (1 chamada `gpt-4o-mini` por canal).
Action `quota` retorna o uso atual para a UI. Erros de limite retornam HTTP 429 com `code`: COOLDOWN | DAILY_LIMIT | GLOBAL_LIMIT | BURST_LIMIT.
Chaves `YOUTUBE_API_KEY` e `OPENAI_API_KEY` só existem no backend — nunca no frontend.

Regras adicionais da busca (v3 — funil largo):
- 14-20 queries geradas por IA; até 12 executadas com `maxResults=50` (mesma quota de 15).
- 3 passos de coleta: vídeos recentes → busca por `type=channel` (top 6 queries) → passo adaptativo (2ª página ou repetição sem `publishedAfter`) quando o pool < 8× resultados pedidos.
- Dedupe global: canais já em `influencer_prospects` são ignorados (`include_existing: true` reativa).
- Filtro de país determinístico: canal com `snippet.country` diferente do pedido é descartado.
- Triagem de ICP em lotes paralelos de 50 canais (até 300 canais, `gpt-4o-mini`), threshold adaptativo 6→5→4→3 até atingir 1.6× dos resultados pedidos.
- Fit Score: 1 chamada de IA por canal, concorrência 10.
- Contatos públicos extraídos por regex: `contact_email`, `instagram_url`, `website_url`, `contact_links`.


## Instagram (SerpApi) — edge function `instagram-influencer-prospect`
- Descoberta: `engine=google` com `site:instagram.com <termo>` (até 3 páginas × 12 consultas geradas por IA).
- Coleta: `engine=instagram_profile&profile_id=<username>` (1 crédito SerpApi por perfil).
- Chaves: `SERP_API_KEY`..`SERP_API_KEY_6` com fallback automático. Nunca no frontend.
- Mesmos limites do YouTube (10/admin/24h, 25 globais, cooldown 60s, rajada 3/10min, 50 perfis por busca), contados só para `influencer_searches.platform='instagram'`.
- Dedupe por `influencer_prospects.username` (platform='instagram'); `youtube_channel_id` guarda `ig:<username>` para reaproveitar a unique (platform, youtube_channel_id).
- Perfis coletados há menos de 7 dias não são recoletados (cache).
- Action `reanalyze` roda só a IA (sem gastar SerpApi).
