# Corrigir as mensagens manual e de follow-up

## Resultado esperado
- A abordagem manual seguirá o ritmo do exemplo: saudação, observação real sobre o lead, apresentação contextual, motivo do contato, percepção cautelosa, curiosidade, baixa pressão e pergunta final simples.
- O follow-up começará agradecendo a resposta, fará uma apresentação curta, usará uma observação relevante e conectará essa observação ao que a empresa do usuário realmente vende.
- As duas mensagens serão adaptadas ao perfil comercial salvo: internet, representação, distribuição, indústria, revenda, serviços, software, agência ou outro negócio B2B.

## Regras de conteúdo
- Separar claramente quem vende e quem é o lead.
- Usar somente fatos disponíveis sobre o lead; hipóteses devem ser cautelosas, sem afirmar problemas não comprovados.
- Escolher um ângulo compatível com a oferta real: conectividade para internet, abastecimento para distribuidores/representantes, operação para software/serviços e presença digital apenas para agências.
- Na mensagem manual, não apresentar planos, preços, catálogo ou proposta; apenas despertar curiosidade e pedir autorização para explicar.
- No follow-up, continuar a conversa após a resposta positiva, sem recomeçar como contato frio e sem inventar necessidades do lead.
- Preservar modelo, integrações, tokens, endpoints, armazenamento e regras de envio existentes.

## Implementação
- Simplificar e tornar coerentes as instruções do gerador manual, removendo exemplos genéricos que conflitam com o modelo de negócio salvo.
- Ajustar a estrutura do follow-up para reproduzir o formato solicitado e escolher o insight conforme perfil da empresa e dados reais do lead.
- Reforçar a revisão automática para rejeitar oferta antecipada no manual, troca de papéis, tema incompatível e mensagem sem personalização.

## Validação
- Publicar somente os dois geradores alterados.
- Gerar testes sem envio real para perfis contrastantes, incluindo agência e representante de internet.
- Confirmar que o manual não oferece produto e que o follow-up relaciona corretamente o nicho do lead à oferta da empresa.

## Arquivos previstos
- `supabase/functions/approach-lead-manual/index.ts`
- `supabase/functions/approach-lead/index.ts`
- `roadmap.md`
