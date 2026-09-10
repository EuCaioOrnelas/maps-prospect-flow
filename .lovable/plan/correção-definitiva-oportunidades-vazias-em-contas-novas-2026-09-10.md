# Correção definitiva: oportunidades vazias em contas novas

## Diagnóstico confirmado até aqui

- O histórico funciona porque lê `search_history`, que recebe uma cópia dos resultados mesmo quando a gravação real em `leads` falha.
- A Gestão de Oportunidades lê exclusivamente `leads`; portanto, “busca concluída” não prova que as oportunidades foram persistidas ou ficaram visíveis para a conta.
- Cookies não participam desse vínculo. A diferença relevante entre conta antiga e nova está na criação do perfil, definição do dono da conta, responsável, políticas de acesso e versão publicada da função de busca.
- A função atual ainda pode retornar sucesso com empresas encontradas mesmo quando nenhuma linha ficou efetivamente legível pela sessão do usuário. A verificação existente usa o cliente privilegiado e, por isso, não comprova a visibilidade real pelas permissões da conta.

## Correção

1. **Tornar a persistência obrigatória antes do sucesso**
   - Na função `search-leads`, validar o usuário e resolver o dono da conta antes de montar os registros.
   - Gravar `user_id`, `owner_user_id`, `created_by_user_id`, `responsible_user_id` e `origin` de forma determinística.
   - Tratar duplicados como oportunidades existentes, reativando e corrigindo dono/origem/responsável quando necessário.
   - Se nenhum resultado ficar persistido, retornar erro explícito e não exibir “Busca concluída”.

2. **Verificar com a mesma identidade da tela**
   - Após a gravação, consultar as oportunidades usando um cliente autenticado com o token real do usuário, não o cliente privilegiado.
   - Considerar sucesso somente quando essa consulta comprovar que a própria sessão consegue ler os registros.
   - Registrar no retorno quantos resultados foram encontrados, persistidos e realmente visíveis.

3. **Eliminar corrida em contas recém-criadas**
   - Confirmar que o perfil existe e que o dono efetivo foi resolvido antes da busca.
   - Corrigir a função de dono da conta para sempre retornar o próprio usuário quando ele é owner, mesmo sem linha em `account_members`.
   - Garantir defaults e triggers de `leads` para owner/criador/responsável sem depender do tempo de carregamento do frontend.

4. **Fortalecer a tela de Gestão**
   - Consultar por dono efetivo e manter compatibilidade com linhas legadas do próprio usuário.
   - Remover qualquer estado vazio enganoso causado por erro de consulta; mostrar o erro real.
   - Após redirecionar da busca, repetir a leitura por um curto período para cobrir a confirmação da gravação, sem depender de realtime.

5. **Recuperar buscas já afetadas**
   - Preparar uma correção segura que reconstrua em `leads` os resultados recentes existentes em `search_history` para usuários afetados, sem duplicar contatos.
   - Corrigir dono, origem, responsável e arquivamento dos registros já existentes.

## Validação

- Conta antiga: nova busca continua aparecendo normalmente.
- Conta recém-criada: busca → persistência → redirecionamento → oportunidades visíveis.
- Conta nova sem linha em `account_members`: usa o próprio usuário como dono.
- Subusuário: grava e lê na conta do owner, com responsável correto.
- Duplicados: reaparecem na Gestão sem cobrança indevida ou duplicação.
- Falha de gravação/permissão: a interface mostra erro e nunca “Busca concluída”.
- Comparar `search_history`, `leads`, dono, responsável e visibilidade pela sessão real.

## Arquivos previstos

- `supabase/functions/search-leads/index.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/OpportunitiesManagement.tsx`
- Uma migration pequena apenas se a auditoria final confirmar divergência em função, trigger ou política de acesso.
