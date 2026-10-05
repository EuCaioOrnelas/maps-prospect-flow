# Recomendar o Wiize Pay aos usuarios da Wiize

## O que o usuario vera
Um card em destaque, so para quem NAO conectou o Wiize Pay, em 3 lugares:

1. Painel inicial: banner grande com titulo "Receba suas vendas sem sair da Wiize", beneficios (PIX, boleto, cartao, debito em conta, cobranca recorrente, status de pagamento automatico) e botao "Conectar Wiize Pay". Tem botao de dispensar (volta a aparecer depois de 30 dias).
2. Tela de Nova venda: faixa em destaque no topo do formulario: "Cobre esta venda pelo Wiize Pay" com 3 beneficios e botao "Conectar agora" (leva a Integracoes > Wiize Pay). Nao bloqueia o cadastro da venda (continua como Controle interno).
3. Contato vira cliente (ao mover o lead para fechado/ganho no CRM): card apos a conversao oferecendo "Criar cobranca no Wiize Pay para este cliente", com botao Conectar.

Regras:
- Some assim que a conexao existir (mesma regra ja usada pela venda).
- Visual limpo e profissional, mesmo estilo premium das Integracoes (cores do tema, sem verde forte, sem blur).
- Um unico componente reutilizavel com 3 variacoes (banner, faixa, card).
- Dispensar fica salvo por usuario (local), sem mudanca no banco.

## Detalhes tecnicos
- Novo `src/components/crm/WiizePayPromo.tsx` (props: variant "banner" | "strip" | "card", onConnect).
- Hook de estado de conexao: reaproveitar a consulta de `integration_connections` ja usada em `RegisterSaleDialog.tsx` / `useWiizePayCharges.ts` (extrair para `useWiizePayConnected`).
- Encaixar em `MainDashboard.tsx` (topo), `RegisterSaleDialog.tsx` (topo do formulario) e no fluxo de fechamento do lead (local exato a confirmar na leitura do CRM).
- Dispensar: localStorage com data; exibe de novo apos 30 dias.
- Sem migracao, sem edge function, sem alteracao no projeto Wiize Pay.
