# Forms + Links Rastreados (MVP funcional)

Nova área **Forms** na Wiize: formulários públicos de captação que enviam leads direto para o CRM, e links rastreados com UTM.

## O que o cliente vai poder fazer

1. Criar um formulário em um passo a passo: informações, campos, aparência, CRM, notificações e publicação.
2. Publicar em uma URL pública (`/form/{slug}`), abrir no celular e receber envios.
3. Escolher o funil, a coluna e os responsáveis que recebem o lead no CRM.
4. Receber e-mail de aviso a cada novo lead, com botão "Ver no CRM".
5. Criar links rastreados (`/r/{slug}`) que registram o clique e redirecionam com UTM.
6. Ver painel com formulários criados, visualizações, leads, conversão, origem das campanhas e últimos leads.
7. Duplicar, ativar/desativar e excluir formulários e links, com confirmação.

## Limites por plano

- Atendimento: 1 formulário e 1 link rastreado.
- Growth IA: 5 formulários e 5 links rastreados.
- Enterprise: estrutura preparada para limite configurável (por padrão, sem bloqueio).
- O bloqueio é verificado no servidor antes de criar/duplicar; a tela mostra "x de y utilizados", aviso de proximidade e botão "Fazer upgrade".

## Detalhes técnicos

### Banco (nova migration)
Seguindo o padrão multi-tenant atual (`owner_user_id`, RLS + GRANT):
`forms`, `form_fields`, `form_submissions`, `form_views`, `tracked_links`, `tracked_link_clicks`.
- `forms`: nome interno, slug único global, título, descrição, texto do botão, mensagem de sucesso, status, `config` JSON (aparência), `crm_enabled`, `crm_stage_id`, `crm_responsibles` (uuid[]), `notify_user_ids` (uuid[]), `created_by`.
- `form_submissions` guarda `data` JSON, UTMs, referrer, landing_url, user_agent, device e o `lead_id` criado.
- Leitura/escrita autenticada restrita ao dono da conta (reuso de `accessible_owner_ids()`); nenhuma tabela exposta ao público — o tráfego público passa só pelas Edge Functions.
- Em `leads` serão reusados os campos existentes (`source`, `origin`, `email`, `phone`, `pipeline_stage_id`, `responsible_user_id`) mais uma coluna nova `form_submission_id` para manter a relação Formulário → Lead → Venda.

### Edge Functions
- `forms-admin`: CRUD autenticado de formulários, campos e links, com validação de limite de plano, checagem de posse do funil/coluna/usuários e geração de slug único.
- `forms-public`: rota pública sem login — carrega formulário ativo (só dados visuais), registra visualização, recebe o envio com rate limit por IP, honeypot antispam, sanitização e validação; cria/atualiza o lead no CRM (dedupe por e-mail ou telefone dentro da mesma conta) e dispara o e-mail.
- `tracked-link-redirect`: registra clique e redireciona com UTMs.
- Notificação por e-mail reusa a função `send-email` existente (Resend), sem criar sistema novo.

### Telas
- `/forms` — painel com abas Formulários / Links rastreados / Campanhas, métricas reais e estados vazios.
- `/forms/novo` e `/forms/:id/editar` — wizard de 6 etapas com preview em tempo real.
- `/forms/:id/analytics` — visão geral, evolução (7/30/90 dias), origem, UTMs, dispositivo e aba de leads paginada.
- `/form/:slug` — página pública, responsiva, sem login.
- `/r/:slug` — redirecionamento rastreado.
- Item **Forms** no sidebar, usando os componentes, cores e espaçamentos já existentes.

### Fora do MVP
- Embed via iframe, webhooks, WhatsApp/Slack, ROI/CAC (só a estrutura fica preparada).
- Arrastar para ordenar campos: usarei botões subir/descer para manter simples.

### Verificação
Build e typecheck, além de teste real de ponta a ponta: criar formulário, abrir a URL pública, enviar, conferir o lead no CRM com UTM, checar bloqueio de limite e o redirecionamento do link rastreado.
