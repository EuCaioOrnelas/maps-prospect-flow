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
