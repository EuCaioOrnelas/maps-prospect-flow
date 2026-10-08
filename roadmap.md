# Roadmap

- [ ] Igualar a paleta completa do tema escuro à WiizePay, incluindo fundos, cards, verde e superfícies especiais; preservar o claro e conferir na tela.

- [x] Melhorar carregamento e encaixe das janelas WiizePay no assistente de venda, sem bordas duplicadas; quatro testes passaram e carregamento/rolagem conferidos com conteúdo simulado, sem cobrança real.
- [x] Retirar aviso repetido de cookies nas janelas integradas; a WiizePay deixou de exibir o aviso nas telas embutidas.
- [x] Passar nome, valor e tipo do serviço escolhido para a venda registrada, usando o campo confirmado `service_type`.
- [x] Mostrar contratos e serviços já cadastrados na WiizePay antes de escolher na janela; listas conferidas no navegador.
- [ ] Registrar uma venda real de ponta a ponta e conferir 3D Secure; bloqueado até autorização explícita para cobrança real.

- [x] Atualizar Atendimento para R$ 89, Growth IA para R$ 129 e expansões para R$ 49/R$ 39/R$ 99 em todas as jornadas.
- [x] Manter os novos IDs Stripe em aberto e impedir cobrança acidental pelos IDs antigos.
- [x] Validar preços e ancoragem no upgrade, checkout, trial e gestão de expansões.

- [x] Corrigir o endereço usado para enviar clientes ao Wiize Pay e nunca descartar clientes da fila.
- [ ] Clientes chegarem no Wiize Pay; bloqueado até publicar a versão mais recente do projeto Wiize Pay.
- [x] Tela de venda abrir já no modo Wiize Pay, com prazo de contrato livre, etapas Cliente > Contrato > Serviço > Cobrança e sem comprovante.
- [ ] Débito em conta e criação de contrato pela integração; bloqueado até o Wiize Pay aceitar pela API.

- [x] Refinar visual da conexão e dados disponíveis da página Wiize Pay e limpar os controles de seleção.
- [x] Mover Ajuda e Sugestões do menu lateral e móvel para cartões no perfil.

- [x] Auditar páginas públicas de Segurança, Termos, Privacidade e Cookies
- [x] Auditar FAQ principal e FAQs públicas
- [x] Auditar Wian e textos das novas funcionalidades
- [x] Consolidar escopo e propor atualização sem claims não comprovados
- [x] Atualizar conteúdo público e preferências de cookies
- [x] Atualizar artigos ativos da Central de Ajuda
- [x] Validar páginas e links em computador e celular
- [x] Reorganizar a avaliação em dois cards lado a lado no desktop e empilhados no celular
- [x] Ampliar os cards de emojis e remover o comentário opcional
- [x] Separar empresa prospectora e lead nas duas abordagens por IA
- [x] Bloquear geração sem oferta cadastrada e registrar correções automáticas

- [x] Persistir `company_business_model`, preencher a Bless como representante e remover o fallback silencioso do perfil.
- [x] Ajustar abordagem manual e follow-up Meta para usar somente observações do lead conectadas ao produto da empresa prospectora.
- [ ] Validar geração real alinhada; persistência e reabertura da Gestão confirmadas.

- [x] Auditar e corrigir os campos Stripe do checkout e do trial, reproduzindo clique, foco e digitação em computador e celular.
- [x] Eliminar remontagens e bloqueios intermitentes dos campos Stripe e adicionar testes de regressão.
- [x] Unificar cadastro da venda e criação da cobrança Wiize Pay em uma única tela, sem repetir dados.
- [x] Preservar o fluxo interno quando desconectado e as vendas anteriores à conexão.
- [x] Remover a segunda janela após cadastrar uma venda no card do contato e na página Vendas e Receita.
- [ ] Validar visual e funcionamento do novo fluxo em computador e celular.
- [ ] Corrigir a preferência de tema no fluxo de autorização; bloqueado até o projeto Wiize Pay aceitar `ui_theme`.

- [x] Padronizar a marca WiizePay, melhorar os cards de recomendação e corrigir a exibição do banner no painel.
- [x] Substituir o banner do cockpit por um aviso de entrada com a arte completa, fechável e recorrente a cada 30 dias.
- [x] Remover o chip "Responder agora" dos cards do CRM e da lista de atenção, corrigir o link de venda para wiizepay.com/cobrancas e dar acabamento profissional ao cabeçalho "Venda fechada com {cliente}".
- [x] Deixar o card do CRM limpo, igual ao modelo: remover tempo relativo ("há 2 dias"), etiquetas e sugestão de próxima ação.
- [x] Remover o botão "Criar cobrança" da tabela de Vendas e Receita (mantidos os indicadores de recebimento).
- [x] Remover o botão "Criar cobrança" do card de venda na aba Vendas do contato (mantidos selos de status e indicadores de recebimento).
