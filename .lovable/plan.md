# Timeout de sessão por inatividade

## Análise atual
- A sessão é centralizada no `AuthProvider`, que acompanha alterações de autenticação e já expõe o logout oficial da aplicação.
- As páginas privadas usam `ProtectedRoute`; quando o usuário deixa de existir na sessão, esse controle redireciona para `/login`.
- O melhor ponto único para monitorar atividade é dentro do `AuthProvider`, evitando um timer por página ou por rota.
- Não é necessário alterar banco, 2FA, integrações, CRM, Chat, Wian ou automações.

## Implementação
- Criar um hook pequeno de inatividade, ativado somente quando houver usuário autenticado.
- Considerar atividade real por eventos de ponteiro/clique, teclado, toque e navegação/rolagem, com atualização limitada para evitar trabalho excessivo.
- Manter apenas um timeout para os 30 minutos; cada atividade válida reagenda esse mesmo timeout.
- Persistir somente o horário da última atividade no navegador para que múltiplas abas compartilhem o prazo e uma aba parada não prolongue a sessão.
- Ao voltar para uma aba após o prazo, conferir imediatamente a última atividade e encerrar a sessão, sem tratar foco ou aba aberta como atividade.
- Executar o `signOut` já existente; a remoção do usuário no contexto fará as áreas protegidas enviarem para `/login`.

## Validação
- Testar renovação do prazo por interação real.
- Testar expiração após 30 minutos sem interação.
- Testar retorno à aba depois do prazo.
- Testar sincronização entre abas e garantir uma única execução de logout.
- Executar build e checagem de tipos do projeto.
