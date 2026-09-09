# Inteligência Wiize — como funciona

## 1. Ideia central

A Inteligência é **um único motor** que lê os dados que a Wiize já tem sobre o contato e devolve
**um número principal (Oportunidade, de 0 a 100)** mais dimensões de apoio e uma recomendação de ação.

Não existe um segundo score. O score comercial antigo (`revenue_leads.score_total`) continua vivo e é
uma das entradas do motor, normalizado para a escala 0 a 100.

## 2. O que o motor lê

| Fonte | O que entra |
|---|---|
| `chat_conversations` / `chat_messages` | conversas do WhatsApp (Evolution e Meta Cloud no mesmo pipeline), áudios transcritos |
| `revenue_leads`, `revenue_conversations`, `revenue_score_logs` | engajamento e histórico de pontuação já existentes |
| `revenue_intent_logs`, `intel_signals` | sinais de intenção, objeção, urgência, diagnóstico |
| `leads` (prospecção) | empresa, segmento, cidade, nota do Google, site, diagnóstico da IA |
| `lead_deals` | negociações abertas, ganhas e perdidas |
| `intel_patterns` | padrões de conversão da própria conta (o que costuma fechar) |

Tudo é filtrado por conta (RLS por `owner_user_id`), então uma conta nunca vê dados de outra.

## 3. O resultado

- **Oportunidade (0 a 100)** — resultado único, gravado em `intel_lead_profiles.opportunity_score`.
  É a mesma fonte usada no card do funil e dentro do contato, então os dois valores batem sempre.
- **Dimensões** (também 0 a 100, apenas explicativas): Intenção, Engajamento, Momentum, Risco,
  Qualidade, Fit, Comportamento e Recência.
- **Estado da análise**:
  - `NO_DATA` — sem conversa e sem sinal comercial (sinais de diagnóstico/prospecção não contam como evidência). A Oportunidade é forçada a 0, exibida de forma neutra como "0 de 100 · Não analisado" tanto no card do CRM quanto na aba interna. Zero significa ausência de análise, nunca baixa oportunidade. A etapa vem do CRM/prospecção (`PROSPECTING`/`NEW`) e a próxima ação é sempre `FIRST_CONTACT`.
  - `PARTIAL` — pouca evidência (poucas mensagens ou poucos sinais). Aparece o selo "Análise parcial".
  - `COMPLETE` — conversa e sinais suficientes.
- **Próxima melhor ação** — código da ação, prioridade, canal, momento, motivo, objetivo, roteiro de
  passos, pergunta que destrava, o que evitar, resultado esperado e mensagem sugerida quando há contexto real.

## 4. Regras que evitam número inflado

- Sinais repetidos na mesma janela de 5 minutos são deduplicados (fica o de maior confiança).
- Retornos decrescentes por tipo de sinal: o quinto sinal igual vale bem menos que o primeiro.
- Mensagens muito curtas recebem penalidade.
- Decay por tempo: sinal antigo pesa menos.
- Debounce de 20 segundos por contato para não recalcular em looping.
- Quando não há nenhuma mensagem trocada, a interface **nunca** afirma que houve conversa, mesmo que
  existam sinais de prospecção ou diagnóstico.

## 5. Áudio

Áudios recebidos entram no mesmo pipeline: são transcritos e a transcrição vira texto analisável,
contando como mensagem e podendo gerar sinais de intenção. Não há motor separado para áudio.

## 6. Custo

Cálculo determinístico primeiro. A OpenAI (`gpt-4o-mini`) só é chamada quando o texto exige
interpretação que as regras não resolvem. Perfis são cacheados e versionados; o recálculo em massa
roda uma vez por dia (06:10) e por evento quando o contato se mexe.

## 7. Onde aparece

- Card do lead no funil: Oportunidade (mesma fonte do painel).
- Aba Inteligência dentro do contato: painel completo com Visão geral, Conversa, Prospecção,
  Comercial e Evolução.
- Hot Opportunities, radar e ranking usam o mesmo `opportunity_score`.

## 8. Limitações atuais (honestas)

- A maior parte da base ainda não tem perfil calculado, então muitos contatos aparecem como
  "Sem análise" até o motor processar.
- Contatos com histórico legado podem mostrar engajamento sem mensagens espelhadas no chat; nesse caso
  o painel diz explicitamente que a origem é o histórico de pontuação do motor.
- O módulo está marcado como Beta na interface.
