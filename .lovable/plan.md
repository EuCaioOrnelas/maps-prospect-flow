# Prospecção IA + Sistema de Vendas no CRM

## Visão geral

Três mudanças que se conectam:

1. **Rebrand** "Oportunidades" → **"Prospecção IA"** (apenas label, rota e tabelas inalteradas).
2. **Sistema de Vendas** dentro do CRM: novo modal ao marcar lead como "Fechado (Ganho)", bloco no popup do lead, e nova sub-página `/crm/vendas` com KPIs financeiros.
3. **Receita recorrente**: vendas com contrato gerando receita projetada até expiração (MRR real, não estimado).

---

## 1. Rebrand "Prospecção IA"

**Onde trocar (só label visual, sem mudar rotas/tabelas):**

- Sidebar (`AppSidebar.tsx`) — item "Oportunidades" vira "Prospecção IA"
- Títulos de página (`Opportunities.tsx`, breadcrumbs)
- Guide (`useGuidedTour.tsx`) — textos dos steps
- Cockpit — cards e CTAs que dizem "Oportunidades"
- Modais e dialogs de upgrade que mencionam o módulo
- Help center / FAQ menções

**Mantém igual:**
- Rota `/oportunidades`
- Tabelas `opportunities`, `opportunity_*`
- Variáveis/funções no código
- A "unidade de consumo" interna (continua sendo "Opportunity unit")

---

## 2. Estrutura de navegação do CRM

CRM vira pai com 2 abas no topo:

```
/crm           → Pipeline (kanban atual, comportamento inalterado)
/crm/vendas    → Vendas & Receita (NOVA página)
```

Abas renderizadas no topo da página, estilo `Tabs` do shadcn. Sidebar continua mostrando só "CRM" como item único.

---

## 3. Banco de dados — nova tabela `sales`

```sql
CREATE TABLE public.sales (
  id uuid PK,
  user_id uuid (FK auth ref, scoped via RLS),
  lead_id uuid (FK leads, ON DELETE SET NULL),
  
  -- Identificação
  title text NOT NULL,
  description text,
  
  -- Valores
  amount numeric(12,2) NOT NULL,              -- valor total ou mensal (ver type)
  sale_type text NOT NULL,                    -- 'one_time' | 'recurring'
  payment_method text,                        -- pix, credit_card, boleto, transfer, other
  
  -- Contrato (só se recurring)
  contract_months integer,                    -- 1, 3, 6, 12, 24, ou null (one_time)
  start_date date NOT NULL DEFAULT today,
  expiration_date date,                       -- calculado: start_date + contract_months
  
  -- Status do contrato
  status text NOT NULL DEFAULT 'active',      -- active | expired | cancelled | renewed
  
  -- Anexos (Supabase Storage: bucket 'sales-attachments')
  receipt_url text,                           -- comprovante
  contract_url text,                          -- contrato assinado
  
  created_at, updated_at
);

-- Bucket privado 'sales-attachments' com RLS por user_id
```

**Cálculo de receita total:**
- `one_time`: vale o `amount`
- `recurring`: `amount * contract_months`
- **MRR atual**: soma `amount` de todas vendas `recurring` com status `active` e `expiration_date >= today`

**Job/edge function diário** (ou trigger no read) atualiza `status` para `expired` quando `expiration_date < today`.

---

## 4. Modal "Cadastrar Venda" (ao marcar Ganho)

Trigger: quando lead é movido para coluna **"Fechado (Ganho)"** (drag ou via popup), abre modal obrigatório.

**Campos:**
- Título da venda *
- Descrição
- Tipo: One-time / Recorrente *
- Valor (R$) * — label muda: "Valor total" vs "Valor mensal"
- Se recorrente: Tempo de contrato (1, 3, 6, 12, 24 meses, custom) *
- Data de início * (default: hoje)
- Forma de pagamento
- Upload comprovante (PDF/IMG, opcional)
- Upload contrato (PDF/IMG, opcional)

Botão "Pular por ora" — permite mover sem cadastrar (cria placeholder editável depois).

---

## 5. Popup do lead — novo bloco "Vendas"

Dentro do `LeadDetailDialog` (componente atual do CRM), adicionar uma seção **"Vendas & Receita"** com:

- 4 mini-cards no topo:
  - Receita total recebida (soma de tudo)
  - Vendas ativas (count)
  - MRR (recorrentes ativas)
  - Próxima expiração (data + dias restantes)
- Lista de vendas do lead (cards expandíveis): título, valor, status badge, contrato, datas, anexos
- Botão "+ Nova venda" — abre o mesmo modal acima

---

## 6. Página `/crm/vendas` — Vendas & Receita

**Topo: 4 KPIs (cards premium)**
- Receita total recebida (acumulado)
- MRR ativo
- Vendas ativas / Total
- Receita projetada (próximos 12 meses, baseada em contratos ativos)

**Filtros:** período (mês atual, últ. 3m, 6m, 12m, custom), tipo (one-time/recurring), status

**Gráfico:** linha de receita por mês (últimos 12 meses) — usar Recharts (já no projeto)

**Tabela de vendas:**
Colunas: Lead, Título, Valor, Tipo, Início, Expira em, Status, Ações (editar/ver anexo/cancelar)

**Card lateral "Expirando em breve"** (próximos 30 dias) com CTA "Renovar".

---

## 7. Cockpit principal (Dashboard)

Adicionar **1 KPI novo** discreto: "Receita do mês" → linka pra `/crm/vendas`.
Não substituir nenhum KPI existente, só somar.

---

## Arquivos a criar

- `supabase/migrations/...sales.sql` (tabela, RLS, GRANT, bucket, índices)
- `src/hooks/useSales.ts` (CRUD + métricas)
- `src/pages/CRMSales.tsx` (nova página)
- `src/components/crm/SalesLayout.tsx` (tabs Pipeline | Vendas)
- `src/components/crm/RegisterSaleDialog.tsx` (modal cadastro)
- `src/components/crm/LeadSalesBlock.tsx` (bloco no popup)
- `src/components/crm/SalesKPIs.tsx` (4 KPIs)
- `src/components/crm/SalesRevenueChart.tsx` (gráfico)
- `src/components/crm/SalesTable.tsx` (tabela)
- `src/components/crm/ExpiringSoonCard.tsx`

## Arquivos a editar

- `src/App.tsx` — rota `/crm/vendas`
- `src/pages/CRM.tsx` — wrap com `SalesLayout` (tabs)
- `src/components/layout/AppSidebar.tsx` — "Oportunidades" → "Prospecção IA"
- `src/components/crm/LeadDetailDialog.tsx` (ou equivalente) — inserir `LeadSalesBlock`
- `src/components/crm/KanbanBoard.tsx` (ou onde move stage) — disparar `RegisterSaleDialog` ao ir pra Ganho
- `src/hooks/useGuidedTour.tsx` — textos "Prospecção IA"
- `src/pages/MainDashboard.tsx` — novo KPI "Receita do mês"
- Páginas/textos com "Oportunidades" visíveis ao usuário (busca por regex)

---

## Detalhes técnicos

- **Storage**: bucket `sales-attachments`, privado, RLS por `user_id`, paths: `{user_id}/{sale_id}/{receipt|contract}.{ext}`
- **MRR query**: `SUM(amount) WHERE sale_type='recurring' AND status='active' AND expiration_date >= CURRENT_DATE`
- **Atualização de status**: edge function diária `update-sales-status` (cron 03:00) marca `expired`
- **Memory**: adicionar `mem://features/crm/sales-and-revenue-system` com schema, fórmulas MRR, e regra de rebrand "Prospecção IA"
- **Permissão por plano**: Atendimento (sem SDR) continua sem ver Prospecção IA; Vendas dentro do CRM fica visível pra todos (faz sentido pro Atendimento também controlar vendas)

---

## Implementação em 2 fases

**Fase 1 (esta tarefa):** rebrand + tabela + modal Ganho + bloco no popup + página `/crm/vendas` com KPIs e tabela básica.

**Fase 2 (próxima):** gráfico de receita mensal, cron de expiração, alertas de renovação, edição/cancelamento avançado.

Se aprovar, executo a Fase 1 inteira.