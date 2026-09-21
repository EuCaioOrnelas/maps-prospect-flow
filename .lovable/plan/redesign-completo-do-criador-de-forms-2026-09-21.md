# Redesign completo do criador de Forms

## Resultado
- Refinar os estados de limite no painel e exigir a confirmação `EXCLUIR`, formatada automaticamente em maiúsculas.
- Transformar as seis etapas em uma progressão visual com setas, ícones e navegação clara.
- Reorganizar Informações, Campos, Aparência, CRM, Notificações e Publicação no padrão premium Wiize, mantendo a prévia atualizada em tempo real.

## Experiência de criação
- Começar textos editáveis vazios, usando exemplos somente dentro dos campos; manter valores técnicos seguros apenas como fallback ao salvar.
- Permitir escolher e visualizar o final do link público antes de salvar, com geração profissional automática quando ficar vazio.
- Organizar cada campo em linhas legíveis, remover o indicador de arraste, manter apenas setas e adicionar ícones por tipo.
- Melhorar opções de lista/múltipla escolha, identificação CRM e o aviso responsivo dos identificadores especiais.
- Ajustar seletores de cor para preencherem seus controles, incluir ajuda da URL da logo com recomendação PNG e refletir a logo na prévia.

## CRM, notificações e publicação
- Mostrar a cor de cada coluna do CRM no seletor.
- Usar o seletor Wiize de responsáveis com nome, foto e e-mail; permitir escolha fixa ou distribuição inteligente e justa entre os vendedores selecionados.
- Adicionar uma prévia realista do e-mail de novo lead.
- Salvar novos formulários como rascunho; substituir “Publicado” por controle Ativo/Inativo após o primeiro salvamento.
- Fixar Voltar e Próximo/Publicar no rodapé do editor e corrigir a ação final.

## Rastreamento e funcionamento
- Adicionar configurações opcionais e validadas para Meta Pixel, Google Tag Manager e Google Ads.
- Carregar as tags somente no formulário público configurado, sem expor outras informações da conta.
- Persistir slug, modo de distribuição e rastreamento no formulário; aplicar distribuição justa no recebimento real de leads.
- Validar criação, edição, publicação, exclusão confirmada e visualização em computador e celular.

## Arquivos previstos
- Painel e editor de Forms.
- Formulário público.
- Funções de administração e envio público de Forms.
- Componentes auxiliares específicos do editor, caso necessários para manter o código organizado.
- Roadmap do projeto.
