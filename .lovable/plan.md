# Wiize Updates e navegação simplificada

## Objetivo
Criar uma central profissional de novidades e comunicados, integrada aos avisos atuais, e reorganizar a navegação conforme o documento e a imagem enviados. Preservar a identidade visual, os módulos, os planos e as integrações da Wiize.

## 1. Evoluir os avisos existentes
- Ampliar os avisos atuais, sem criar uma segunda central de notificações nem perder comunicados já cadastrados.
- Adicionar categoria, prioridade, imagem/vídeo opcional, botão seguro, agendamento e público-alvo.
- Oferecer frequência por usuário: uma vez, 7/15/30 dias, cada novo login ou intervalo personalizado.
- Guardar separadamente visualizações, dispensas, cliques e reaberturas. As regras de público, datas e frequência serão verificadas no servidor, não somente no navegador.
- Preservar históricos; excluir da exibição com confirmação sem apagar registros de interação e auditoria.

## 2. Administração: “Novidades e comunicados”
- Evoluir a área administrativa de Avisos e manter seu endereço atual.
- Criar formulário organizado com conteúdo, mídia, botão, calendário, frequência e seleção de público.
- Gerenciar rascunhos, agendadas, publicadas, pausadas, encerradas e arquivadas; permitir duplicação e exclusão com confirmação.
- Pré-visualizar usando o mesmo modal do usuário, nos formatos desktop e mobile.
- Tabela com pesquisa, filtros e paginação, acompanhada de métricas reais por novidade e período: público elegível, pessoas únicas, visualizações totais, dispensas, cliques e taxas.

## 3. Experiência de novidades e notificações
- Exibir novidades elegíveis após um novo login, em fila por prioridade e publicação, uma por vez, com navegação entre conteúdos.
- Aguardar troca de senha, verificação de segurança, onboarding e tour; coordenar com a promoção WiizePay para impedir sobreposição.
- Vídeos apenas do conteúdo aberto: reprodução automática silenciosa, sem controles, com reprodução inline, imagem de espera e alternativa quando o navegador bloquear a reprodução.
- Inserir aviso individual único quando a publicação ficar disponível; o clique fecha o painel de avisos e reabre a novidade correspondente, sem redirecionamento automático.
- Corrigir o painel existente: cabeçalho fixo, área central com rolagem independente, altura limitada e textos/botões sem cortes. Preservar alertas de conexão, renovação, projetos, conversas e sugestões.

## 4. Navegação global
- Remover a barra superior interna e seus espaços reservados em todas as páginas autenticadas que a utilizam.
- Mover o indicador de oportunidades para o menu lateral, com consumo, limite, progresso e nome real do plano, reutilizando a fonte atual. Não alterar cálculos, limites ou permissões comerciais.
- Preservar a informação de teste gratuito e o acesso à gestão de assinatura em posição compacta no menu lateral.
- Fixar o perfil no rodapé do menu: foto, nome e identificação disponível da conta, com menu de perfil, configurações/preferências, segurança existente e saída segura.
- Manter um acionador acessível para abrir/recolher o menu, inclusive por teclado e em celulares, sem recriar o header removido.
- Usar apenas um botão sol/lua no Dashboard, ao lado do filtro de período. A preferência continua persistida e aplicada em todas as páginas internas.
- Adaptar páginas com disposição própria, como Chat, Fluxos, Projetos, Forms e integrações, sem remover seus comandos locais.

## 5. Segurança e validação
- Somente administradores autorizados podem publicar, alterar público/frequência ou ver métricas globais.
- Usuários só acessam conteúdo destinado a eles e seu próprio histórico; nenhuma seleção de empresa dá acesso a dados de outra conta.
- Upload autenticado com formatos e tamanhos validados no servidor: imagens JPEG/PNG/WebP até 5 MB; vídeos MP4/WebM até 50 MB; sem arquivos executáveis. Essas são as configurações iniciais, pois o documento não define tamanhos.
- Links limitados a rotas internas válidas e endereços HTTPS seguros. Descrições sem scripts.
- Eventos autenticados, idempotentes e limitados; contadores nunca editáveis pelo usuário. Cliques representam interações registradas, não confirmação de visita ao destino externo.
- Testes de frequência (incluindo 7/15/30 dias), início/fim, público, isolamento, sessão e duplicidade; testes autenticados de criar → publicar → visualizar → dispensar → reabrir pelo aviso.
- Conferir vídeo/fallback, rolagem com muitos avisos, perfil/saída, tema e navegação em desktop, notebook, tablet e celular. Qualquer verificação bloqueada será informada, sem declarar validação completa.

## Detalhes técnicos
- Reaproveitar `announcements`, `user_announcement_reads`, `user_notifications`, as verificações administrativas baseadas em `user_roles`, os componentes de diálogo/menu e o provedor atual de tema.
- Migração aditiva para campos de novidades, histórico individual, eventos e auditoria; concessões explícitas, políticas de acesso restritas e funções autenticadas para elegibilidade e gravação de eventos.
- Substituir as políticas atuais de leitura ampla de `announcements` por acesso administrativo ou público-alvo autorizado. Integrar a contagem do sininho sem duplicar avisos antigos e novos.
- Usar o Storage existente para mídia autenticada e limitada; não adicionar servidor próprio nem exigir novos serviços ou secrets para este módulo.
- Reutilizar `AppSidebar`, `MobileNav`, `MainDashboard`, `AnnouncementsDialog` e a área administrativa existente, extraindo somente os elementos compartilhados necessários.
- Datas armazenadas em UTC e editadas/exibidas no fuso `America/Sao_Paulo`, identificado no formulário. Repetidos eventos de autenticação por refoco não contam como novo login; frequência por login usa identidade de sessão autenticada.

## Entrega
Relatório com arquivos criados/editados separados de migrations e eventuais funções, componentes reaproveitados, segurança, mídia, testes, problemas encontrados e pendências de produção. As alterações do banco compartilhado afetam também o site publicado; a interface só chega ao site após uma publicação solicitada.