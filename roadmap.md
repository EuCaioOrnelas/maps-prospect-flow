# Roadmap — Wiize Evolui

- [x] Etapa 1: Migration do banco (colunas novas em suggestions, votes, groups, cycles, releases, audit log, triggers de votos e notificações) — drizzle/migrations/0042
- [x] Etapa 2: Página pública /sugestoes (hero, como funciona, formulário preservado + campos progressivos, explorar com votos, releases)
- [x] Etapa 3: Edge function suggestions-analyst (análise GPT, agrupamento, pontuação 0-100) — publicada
- [x] Etapa 4: Admin /admin/sugestoes (dashboard com gráficos, tabela completa, análise inteligente, planejamento mensal)
- [x] Etapa 5: Notificações no sininho (triggers no banco via user_notifications)
- [x] Validação: 6 testes de regras passando, build OK, smoke test sem erros JS
- [ ] Pendente (bloqueado): verificação visual autenticada das páginas — sessão de teste não pôde ser criada (nenhum usuário corresponde ao e-mail do solicitante); usuário precisa entrar no preview
