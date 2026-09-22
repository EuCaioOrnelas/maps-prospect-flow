# Corrigir abordagem manual e follow-up

## Objetivo
Fazer as duas mensagens funcionarem como contato comercial real da empresa: apresentar o vendedor, conectar o negócio do lead ao que a empresa vende, despertar interesse e terminar com uma pergunta clara.

## Alterações
- **Abordagem manual:** remover a construção excessivamente consultiva e vaga; exigir apresentação breve, motivo comercial contextualizado e uma chamada final específica sobre o assunto levantado.
- **Follow-up após template:** tratar respostas como “bom dia”, “boa tarde” ou “boa noite” apenas como abertura da conversa; não agradecer, não presumir interesse ou alinhamento e não mencionar uma conversa que ainda não aconteceu.
- **Ambas:** manter personalização por dados reais, impedir invenções e impedir catálogo, planos, preços ou proposta precoce; permitir dizer claramente a área em que o remetente atua para que a mensagem faça sentido.
- **Proteções automáticas:** detectar frases vagas ou falsas, como “estamos alinhados”, “fiquei curioso para saber” e agradecimentos indevidos no follow-up, e reescrever uma vez.

## Validação
- Publicar as duas funções atualizadas.
- Gerar exemplos com o perfil Bless Internet e um lead de academia.
- Confirmar que a manual inicia uma conversa comercial coerente e que o follow-up funciona mesmo quando a única resposta ao template foi uma saudação.
- Não enviar nenhuma mensagem real pelo WhatsApp durante o teste.

## Arquivos
- `supabase/functions/approach-lead/index.ts`
- `supabase/functions/approach-lead-manual/index.ts`
