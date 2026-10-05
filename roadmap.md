# Roadmap

- [ ] Atualizar Atendimento para R$ 89, Growth IA para R$ 129 e expansões para R$ 49/R$ 39/R$ 99 em todas as jornadas.
- [ ] Manter os novos IDs Stripe em aberto e impedir cobrança acidental pelos IDs antigos.
- [ ] Validar preços e ancoragem no upgrade, checkout, trial e gestão de expansões.

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
