# Prévia dinâmica do cartão

## Objetivo
Fazer o cartão visual reagir enquanto o usuário digita e atualizar automaticamente a bandeira detectada pela Stripe.

## Alterações
- Encaminhar a bandeira detectada pelo campo seguro para a prévia em trial e checkout.
- Mostrar o primeiro dígito indicativo e uma máscara progressiva no cartão, sem copiar ou armazenar números sensíveis.
- Exibir Visa, Mastercard, Elo ou Discover conforme a identificação da Stripe; usar “Cartão” enquanto a bandeira ainda não for reconhecida.
- Manter as animações de nome, validade e virada no CVV.
- Validar o comportamento no formulário aberto em desktop e mobile.

## Observação técnica
Os dados completos permanecem dentro do campo seguro da Stripe. A prévia usa somente o estado e a bandeira permitidos pela Stripe, preservando a segurança PCI.
