-- Atualiza a inteligência do Wian (knowledge_base) e o FAQ (faqs)
-- com o novo padrão de planos v3 (corte 2026-09-03).
-- Zera os embeddings alterados para que a função support-embed os regenere.
BEGIN;

-- ============ KNOWLEDGE BASE (Wian) ============

UPDATE public.knowledge_base SET
  solution = '**Padrão atual (novos clientes a partir de 03/09/2026)**
**Atendimento — R$196/mês**: Chat + CRM (1.000 contatos) + 1 número Meta WhatsApp + 2 usuários (dono + 1). NÃO inclui SDR IA (Oportunidades), prospecção com IA nem Agentes IA.
**Growth IA — R$396/mês**: tudo do Atendimento + Oportunidades/SDR IA (até 1.000 oportunidades por mês) + Agentes IA + CRM até 10.000 contatos + 2 números Meta WhatsApp + 3 usuários (dono + 2).
Não há mais planos anuais para novas assinaturas.
**Clientes legados (criados antes de 03/09/2026)** mantêm o padrão antigo: Growth R$696/mês com 3.000 oportunidades, 5 números e 5 usuários — nada muda para eles.
**Expansões (Order Bumps, recorrentes mensais)**: +1 Número e +1 Usuário R$96/mês (ambos os planos), +1.000 Contatos CRM R$48/mês (ambos), +1.000 Oportunidades R$196/mês (apenas Growth IA). Compra em Conta → Assinatura → Expansões Comerciais (cartão em 1 clique; PIX gera nova cobrança recorrente).',
  embedding = NULL
WHERE id = '3889bc36-d397-49a6-879c-27909dd315e0';

UPDATE public.knowledge_base SET
  solution = '**Regra**: 1 busca SerpAPI = 3 créditos = ~60 leads em média.
Perfil da Empresa OBRIGATÓRIO antes da primeira busca (sem ele o scoring por nicho não funciona).
**Limite mensal**: Growth IA (novos, a partir de 03/09/2026) = até 1.000 oportunidades/mês. Growth legado = 3.000 oportunidades/mês. Atendimento NÃO tem prospecção com IA / Oportunidades.
Para ampliar: Order Bump "+1.000 Oportunidades" por R$196/mês (apenas Growth IA), em Conta → Assinatura → Expansões Comerciais.',
  embedding = NULL
WHERE id = 'f07827cf-e913-4eab-bbe2-55077f69a13c';

UPDATE public.knowledge_base SET
  solution = '**Atendimento**: 1.000 contatos. **Growth IA**: 10.000 contatos.
Order Bump "+1.000 Contatos CRM" por R$48/mês (ambos os planos, recorrente mensal).
Após atingir o limite, novas inserções/importações são bloqueadas até liberar espaço ou comprar a expansão em Conta → Assinatura → Expansões Comerciais.',
  embedding = NULL
WHERE id = '923bfce9-a660-4ac1-aae1-7b731ed93018';

UPDATE public.knowledge_base SET
  solution = 'Ir em WhatsApp → Conexões → "Conectar número" → fluxo Embedded Signup da Meta: login Facebook → escolher Business Manager → selecionar WABA → escolher número → autorizar. 100% oficial, sem QR Code.
**Números inclusos**: Atendimento = 1 número. Growth IA = 2 números (novos, a partir de 03/09/2026); Growth legado = 5 números.
Para mais números: Order Bump "+1 Número e +1 Usuário" por R$96/mês (cada unidade libera 1 número e 1 usuário adicionais).',
  embedding = NULL
WHERE id = '467a32b2-16f4-4467-95b1-9c158ff879d6';

INSERT INTO public.knowledge_base (title, category, subtopic, tags, priority, pains, solution, severity, active)
SELECT
  'Limite de usuários (assentos) por plano',
  'financeiro', 'limites',
  ARRAY['usuarios','assentos','membros','equipe','limite','plano'],
  'high',
  'Não consigo convidar mais membros da equipe / atingi o limite de usuários.',
  '**Atendimento**: 2 usuários (dono + 1). **Growth IA**: 3 usuários (dono + 2). **Clientes legados (antes de 03/09/2026)**: 5 usuários no Growth.
Cada Order Bump "+1 Número e +1 Usuário" (R$96/mês) libera 1 assento adicional e 1 número de WhatsApp.
Convites em Configurações → Membros. Papéis: Owner, Admin e Operacional.',
  'media', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.knowledge_base WHERE title = 'Limite de usuários (assentos) por plano'
);

-- ============ FAQ ============

UPDATE public.faqs SET
  content = '**Atendimento — R$196/mês**: Chat + CRM (1.000 contatos) + 1 número Meta WhatsApp + 2 usuários (dono + 1). Sem prospecção com IA, sem SDR IA e sem Agentes IA.
**Growth IA — R$396/mês**: tudo do Atendimento + Oportunidades/SDR IA (até 1.000 prospecções com IA por mês) + Agentes IA + CRM até 10.000 contatos + 2 números + 3 usuários (dono + 2).
Clientes antigos (assinaturas anteriores a 03/09/2026) permanecem nas condições contratadas.',
  embedding = NULL
WHERE id = '6fddf7f8-63de-467e-9143-5e9f51ed365c';

UPDATE public.faqs SET
  content = '**+1 Número WhatsApp e +1 Usuário** R$96/mês (ambos os planos). **+1.000 Contatos CRM** R$48/mês (ambos). **+1.000 Oportunidades** R$196/mês (apenas Growth IA).
São recorrentes mensais e podem ser contratados em Conta → Assinatura → Expansões Comerciais. No cartão a cobrança é ajustada na hora; no PIX é gerada uma nova cobrança recorrente.',
  embedding = NULL
WHERE id = '46de9b83-58af-4821-a152-9df314c1f242';

UPDATE public.faqs SET
  content = 'Sim. O Atendimento permite 1 número. O Growth IA permite 2 números (clientes legados mantêm 5). Para ampliar, use o Order Bump "+1 Número e +1 Usuário" por R$96/mês — cada unidade libera 1 número e 1 assento. Cada número opera de forma independente (chat, campanhas e flows).',
  embedding = NULL
WHERE id = 'fafc7d54-9679-4cea-8eac-ed739c918910';

UPDATE public.faqs SET
  content = 'Order Bump "+1.000 Oportunidades" por R$196/mês (disponível apenas no Growth IA). O Growth IA já inclui até 1.000 oportunidades por mês (clientes legados: 3.000). Contrate no checkout ou em Conta → Assinatura → Expansões Comerciais.',
  embedding = NULL
WHERE id = 'eba641fc-45ee-4527-a1e3-4dc120dadd75';

UPDATE public.faqs SET
  content = 'Atendimento: 1.000 contatos. Growth IA: 10.000 contatos. Precisa de mais? Order Bump "+1.000 Contatos CRM" por R$48/mês (disponível em ambos os planos).',
  embedding = NULL
WHERE id = '1848673e-fb6d-48ad-a840-fbd4abe0202b';

UPDATE public.faqs SET
  content = 'Você tem 7 dias grátis com cartão cadastrado. Pode cancelar a qualquer momento em Conta → Assinatura, sem cobrança. Após os 7 dias, cobramos o plano escolhido: Atendimento R$196/mês ou Growth IA R$396/mês. Não trabalhamos mais com planos anuais para novas assinaturas.',
  embedding = NULL
WHERE id = '10d1f0fc-7f7d-4938-818c-79f7ff71e247';

UPDATE public.faqs SET
  content = 'Sim. Em Configurações → Membros, convide por email. Limites de assentos: Atendimento 2 usuários (dono + 1) e Growth IA 3 usuários (dono + 2); clientes legados mantêm 5. Cada Order Bump "+1 Número e +1 Usuário" (R$96/mês) libera 1 assento extra. Papéis: Owner (dono), Admin (gerencia tudo) e Operacional (chat e CRM apenas). Todos compartilham contatos e números da conta.',
  embedding = NULL
WHERE id = 'b8808aab-c059-4cc6-9f6f-03e003d8a727';

COMMIT;
