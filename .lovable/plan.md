# IA de abordagem: entender de verdade o negócio de quem vende

## O problema real

Um distribuidor de bebidas recebe mensagens escritas como se ele fosse uma agência de marketing
para empresas de bebidas. A causa é concreta:

1. O gerador de abordagem classifica o negócio do usuário por **palavras-chave** ("marketing", "internet",
   "solar", "uniforme"...). "Distribuidor de bebidas" não bate com nenhuma regra e cai no caminho
   **genérico**, que não diz qual é o papel do usuário na cadeia.
2. Sem essa informação, o modelo assume o padrão mais comum no texto do prompt (venda de serviço /
   marketing digital) e escreve sobre presença digital, engajamento e conversão.
3. O perfil da empresa hoje só pergunta nicho, o que vende, diferencial, objetivo e público. Não existe
   nenhum campo que diga **se o usuário vende produto físico, revende/distribui, industrializa ou presta
   serviço** — nem o que exatamente são os produtos.

## O que vai mudar

### 1. Perfil da empresa passa a capturar o modelo de negócio

No cadastro do perfil (e na edição), dois novos campos:

- **Como sua empresa atua**: escolha entre Distribuidor/Atacadista, Indústria/Fabricante,
  Revenda/Varejo, Prestador de serviço, Software/Tecnologia, Agência/Marketing, Representante comercial,
  Outro. Campo de uma escolha só, obrigatório.
- **Principais produtos e descrição**: lista curta (nome + descrição breve de cada item), para a
  mensagem citar o que o usuário realmente vende, e não uma categoria vaga.

Perfis já existentes continuam funcionando: quando o campo estiver vazio, o sistema deduz o modelo a
partir do texto já preenchido e pede a confirmação do usuário na próxima vez que ele abrir o perfil.

### 2. A IA passa a raciocinar sobre o papel na cadeia antes de escrever

Antes de gerar a mensagem, o gerador monta um bloco fixo de contexto com:

- papel do usuário na cadeia (distribui, fabrica, revende, presta serviço);
- o que ele entrega de fato (produtos com descrição);
- quem compra dele (o lead é **cliente comprador**, não alguém que ele vai "ajudar a divulgar");
- a ponte natural entre o produto e a operação do lead (ex.: bar/restaurante comprando bebida por
  volume, prazo, mix, logística e reposição).

Quando o modelo de negócio não é de marketing, entram travas explícitas: proibido falar de presença
digital, redes sociais, tráfego, conversão, engajamento, site ou "divulgar sua marca" como oferta.
Esses temas só podem aparecer se o usuário for de fato agência/marketing.

### 3. Estratégias de abordagem reescritas por modelo de negócio

Sai a lista de palavras-chave e entra uma estratégia por modelo:

- **Distribuidor/Atacadista**: mix de produtos, prazo de entrega, regularidade de reposição, condição
  comercial, cobertura da região. Gancho = operação de compra do lead.
- **Indústria/Fabricante**: produção sob demanda, volume, customização, fornecimento direto sem
  intermediário.
- **Revenda/Varejo**: disponibilidade, pronta entrega, condição de pagamento.
- **Serviço**: dor operacional e terceirização.
- **Software**: processo manual que o sistema elimina.
- **Agência/Marketing**: mantém a lógica atual de presença digital.
- **Representante**: portfólio representado e acesso à marca.

### 4. Verificação final da mensagem

Antes de devolver, a mensagem é conferida contra o modelo de negócio: se aparecer oferta de serviço que
o usuário não vende (marketing para quem é distribuidor, por exemplo), ela é reescrita uma vez com o
erro apontado. Isso vale para a geração automática e para a manual.

## Detalhes técnicos

- Migration: `company_profiles` ganha `company_business_model` (texto) e `company_product_catalog` (jsonb,
  lista `{nome, descricao}`), ambos opcionais, com GRANTs mantidos pela tabela existente.
- `supabase/functions/approach-lead/index.ts` e `supabase/functions/approach-lead-manual/index.ts`:
  substituem o bloco de regex `isDigitalNiche/isInfrastructureNiche/...` por `resolveBusinessModel()`
  (usa o campo salvo; sem campo, infere por termos incluindo atacado/distribui/revenda/indústria) e por
  `buildBusinessModelBlock()` com as travas e a estratégia. Adiciona um passo de revisão que reescreve a
  mensagem quando o texto contém termos de outro modelo de negócio. Cada função continua com só um
  `index.ts`, sem `_shared`, e mantém `gpt-4o-mini`.
- `src/components/opportunities/CompanyProfileOnboarding.tsx` e `src/pages/Profile.tsx`: novos passos de
  modelo de negócio (seleção) e catálogo de produtos (lista editável), com o mesmo visual atual.
- `src/integrations/supabase/types.ts` atualizado após a migration.
