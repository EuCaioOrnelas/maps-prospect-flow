# Roadmap — Wiize Evolui

## Abertura de avisos e notificações de tarefas
- [x] Corrigir reabertura de novidades pelo sininho, inclusive no painel administrativo; reabertura manual não bloqueada por visualização automática recente.
- [x] Deixar notificações de tarefas compactas e ocultar tarefas concluídas ou canceladas; migration 0056 aplicada e SQL preparado para a cópia de produção.
- [x] Testar as regras: 25 testes passaram; teste no banco com conclusão, cancelamento e preservação da tarefa ativa passou e foi desfeito.
- [ ] Verificar o clique e a aparência com login real: bloqueado porque não há sessão injetada nem conta correspondente ao solicitante na prévia.

## Envio de vídeos dos avisos
- [x] Identificar “Bucket not found” no print; pasta wiize-updates confirmada no ambiente conectado da Lovable.
- [x] Corrigir orientação do SQL consolidado e mensagem de falha no envio; documentar configuração privada por ambiente.
- [x] Corrigir regra de envio que dependia de metadados ainda incompletos; MP4 enviado pela tela com sessão de administrador, confirmado por “Mídia anexada”.
- [ ] Configurar a pasta na cópia de produção do usuário: bloqueado por falta de acesso ao ambiente externo dessa cópia.

## Correção solicitada: administração e primeiro acesso
- [x] Conferir a ligação da página nova de avisos: App.tsx liga AdminAnnouncements; campo MP4 confirmado com sessão autenticada.
- [x] Bloquear novidades no login do onboarding/tour e liberar somente em login posterior; 15 testes passaram. Teste com conta recém-criada em produção não disponível.

- [x] Etapa 1: Migration do banco (colunas novas em suggestions, votes, groups, cycles, releases, audit log, triggers de votos e notificações) — drizzle/migrations/0042
- [x] Etapa 2: Página pública /sugestoes (hero, como funciona, formulário preservado + campos progressivos, explorar com votos, releases)
- [x] Etapa 3: Edge function suggestions-analyst (análise GPT, agrupamento, pontuação 0-100) — publicada
- [x] Etapa 4: Admin /admin/sugestoes (dashboard com gráficos, tabela completa, análise inteligente, planejamento mensal)
- [x] Etapa 5: Notificações no sininho (triggers no banco via user_notifications)
- [x] Validação: 6 testes de regras passando, build OK, smoke test sem erros JS
- [ ] Pendente (bloqueado): verificação visual autenticada das páginas — sessão de teste não pôde ser criada (nenhum usuário corresponde ao e-mail do solicitante); usuário precisa entrar no preview

## Wiize Updates e navegação

- [x] Auditar avisos, notificações, navegação e regras existentes; apresentar plano.
- [x] Ampliar novidades com público, frequência individual, histórico e métricas seguras.
- [x] Administração, mídia e pré-visualização de novidades.
- [x] Fila após login e integração com notificações existentes.
- [x] Remover header global; mover oportunidades e perfil ao sidebar; tema apenas no Dashboard.
- [x] Testar regras (14 testes), criação/publicação autenticada, menu, tema, avisos e telas de diferentes tamanhos.
- [ ] Validação completa de popup, frequência por sessão, mídia e isolamento com duas contas: bloqueada pela sessão injetada sem session_id e ausência de conta do solicitante para gerar sessão completa; requer login real na prévia.
