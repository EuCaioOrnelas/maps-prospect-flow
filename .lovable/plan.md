# Refatoração da copy dos e-mails de Trial

## Objetivo
Criar um SQL único, pronto para copiar e colar, que atualize os 9 e-mails do Trial sem recriar tabelas ou duplicar etapas.

## Conteúdo
- Reescrever assunto, prévia, nome e corpo dos Dias 0 a 8.
- Estruturar cada mensagem em problema, possibilidade, desejo e ação.
- Usar títulos, `<strong>`, listas e botões destacados compatíveis com e-mail.
- Incluir links dinâmicos para acessar a Wiize e contratar um plano.
- Manter linguagem B2B, intensa e persuasiva, sem resultados, números ou garantias inventadas.
- Preservar as regras atuais de público e ativação de cada etapa.

## Entrega técnica
- Novo arquivo SQL idempotente em `docs/sql/`.
- Atualização somente da campanha `trial_wiize`, identificando cada etapa pela chave `day_0` a `day_8`.
- Validação final para confirmar que exatamente nove etapas foram encontradas e atualizadas; se a campanha estiver incompleta, a transação falha sem alteração parcial.
- Resultado final também fornecido como bloco de copiar e colar.
