# Evolução premium do Forms

## Resultado
Transformar a criação de formulários em um fluxo amplo, claro e profissional, mantendo as cores, fonte e componentes atuais da Wiize. O formulário novo começa realmente vazio; exemplos aparecem apenas dentro dos campos.

## Painel e exclusão
- Deixar “Limite atingido” em verde Wiize esmaecido, sem glow e com aparência inequivocamente inativa.
- Exigir a digitação de `EXCLUIR` para apagar formulário ou link; o campo converte automaticamente para maiúsculas e o botão só libera com o texto correto.

## Criação do formulário
- Substituir as abas soltas por uma barra de progresso conectada, com ícones, setas entre etapas e cantos no padrão dos botões Wiize.
- Adotar fluxo amplo em uma coluna, com uma etapa por vez e prévia integrada/recolhível; manter Voltar e Próximo fixos na base da tela.
- Reorganizar cada etapa em seções claras, com títulos, descrições curtas e ícones funcionais.
- Informações: formulário vazio, exemplos como placeholder e escolha manual do nome do link; mostrar imediatamente a URL final na prévia, com fallback curto e profissional quando vazio.
- Campos: cada campo em bloco organizado, controles sempre empilhados, ícone conforme o tipo, somente setas para ordenar e editor visual de opções para listas/múltipla escolha.
- Corrigir o aviso dos identificadores do CRM para quebrar linhas corretamente em qualquer largura.
- Aparência: seletores de cor ocupando toda a largura, com cantos consistentes; ajuda na URL da logo explicando hospedagem pública e recomendando PNG.

## CRM e distribuição
- Mostrar a cor real da coluna do CRM antes do nome no seletor.
- Criar seletor profissional de responsáveis com foto, nome e e-mail.
- Permitir responsável fixo ou distribuição inteligente entre vendedores selecionados.
- Na distribuição inteligente, atribuir cada novo lead ao vendedor elegível com menos leads recebidos por esse formulário, com desempate estável; validar todos os membros no servidor.

## Notificações, rastreamento e publicação
- Melhorar a escolha de destinatários e adicionar prévia realista do e-mail de novo lead com os campos configurados e ação “Ver no CRM”.
- Adicionar IDs opcionais do Meta Pixel e Google Tag Manager/Google Ads, validados e carregados apenas no formulário público.
- Salvar sem publicar como rascunho; substituir “Publicar” por controle Ativo/Inativo na etapa final.
- Na última etapa, mostrar resumo, URL, cópia/abertura e status; o botão final será “Salvar formulário”, não “Próximo”.

## Segurança e compatibilidade
- Preservar autenticação, limites de plano, RLS, captura UTM, CRM e links rastreados existentes.
- Validar slug, IDs de rastreamento, coluna e responsáveis no servidor; não aceitar scripts livres.
- Manter formulários existentes compatíveis com os novos campos de configuração.

## Arquivos previstos
- Editar `src/pages/forms/FormBuilder.tsx`, `src/pages/forms/Forms.tsx`, `src/pages/PublicForm.tsx`, `supabase/functions/forms-admin/index.ts`, `supabase/functions/forms-public/index.ts` e `roadmap.md`.
- Criar componentes pequenos para o seletor de responsáveis e a prévia do e-mail, se necessário.
- Criar uma migração somente se a validação do banco mostrar que a configuração JSON atual não é suficiente.

## Verificação
- Validar criação vazia, slug personalizado/aleatório, rascunho, ativação, tipos com opções, ordenação, exclusão digitada e limite visual.
- Testar formulário público com Pixel/GTM configurados, entrada no CRM, cor/coluna, responsável fixo e distribuição inteligente.
- Conferir a prévia e o fluxo em desktop e celular, além da compilação e publicação das funções alteradas.
