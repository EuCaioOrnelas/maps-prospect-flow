// Dados do FAQ isolados do componente: assim a landing page consegue montar o
// JSON-LD sem puxar o componente inteiro (Accordion, ícones) para o bundle inicial.
export const faqs = [
 {
 question: "O que é a Wiize?",
 answer: "A Wiize é uma máquina de vendas B2B. Você diz o que vende e quem quer alcançar, e ela encontra empresas, inicia conversas, faz follow-up, qualifica o interesse e agenda reuniões para o seu time."
 },
 {
 question: "Como a Wiize encontra as empresas?",
 answer: "Você define nicho, região e o tipo de empresa que quer alcançar. A Wiize busca essas empresas, faz o diagnóstico e a análise de cada uma com IA (site, redes, presença digital, porte e maturidade) e mostra quais têm mais potencial. Depois gera a abordagem de cada empresa com base no perfil da sua empresa e no que você vende, pronta para enviar."
 },
 {
 question: "A Wiize escreve a abordagem para mim?",
 answer: "Sim. A partir do perfil da sua empresa, do que você vende e do diagnóstico feito em cada empresa encontrada, a IA gera uma abordagem individual e contextualizada. Você pode revisar, editar e enviar direto pela plataforma."
 },
 {
 question: "Consigo disparar campanhas de mensagem no WhatsApp?",
 answer: "Sim. Você cria campanhas de mensagem pela API oficial da Meta, usando modelos aprovados e variáveis personalizadas por empresa, com envio controlado dentro de limites seguros. As respostas caem direto no atendimento e ficam registradas no CRM."
 },
 {
 question: "O que é a Wian AI?",
 answer: "A Wian AI é a inteligência que acompanha sua operação. Todo dia ela lê o que aconteceu, monta um briefing executivo com as métricas, aponta quais oportunidades merecem atenção, o que está travando as vendas e o que fazer hoje. Você conversa com a Wian AI por texto ou áudio dentro da plataforma."
 },
 {
 question: "Como sei quais oportunidades merecem atenção?",
 answer: "A Wiize cruza o que sabe da empresa, o que acontece na conversa e o histórico das suas vendas anteriores para mostrar quem está mais perto de uma reunião, quem precisa de atenção agora e quem está esfriando. O engajamento é uma das leituras; o que você vê é a lista de quem chamar primeiro e o que fazer em cada caso."
 },
 {
 question: "Quem conversa com o lead?",
 answer: "A IA responde no WhatsApp a qualquer hora, entende o contexto, qualifica o interesse e passa a conversa para uma pessoa do time no momento certo. Tudo fica registrado no CRM."
 },
 {
 question: "O que acontece quando meu time está ocupado?",
 answer: "A máquina continua trabalhando. Follow-ups, movimentação das oportunidades, avisos e tarefas acontecem sozinhos, e a IA assume a conversa até alguém do time poder entrar."
 },
 {
 question: "Consigo falar com muitas empresas de uma vez?",
 answer: "Sim. Você escolhe o público e a Wiize escreve uma mensagem diferente para cada empresa, envia dentro de limites seguros e devolve as respostas no mesmo lugar. Não é disparo igual para todo mundo."
 },
 {
 question: "Preciso trocar de CRM?",
 answer: "A Wiize já vem com o CRM incluído. Cada conversa, atividade e oportunidade gerada pela máquina fica registrada e organizada lá automaticamente, sem alguém precisar preencher nada."
 },
 {
 question: "Como funciona o WhatsApp na Wiize?",
 answer: "Você conecta sua conta ao WhatsApp Business oficial da Meta. É a mesma infraestrutura usada por grandes empresas, com estabilidade e segurança para falar em volume com leads opt-in."
 },
 {
 question: "Corro risco de bloqueio no WhatsApp?",
 answer: "A Wiize opera com duas camadas: Meta API Oficial (relacionamento com leads opt-in) com risco zero, e infraestrutura outbound para prospecção ativa, com boas práticas operacionais como delays inteligentes, variações de mensagem, pausas adaptativas e limites diários para proteger seus números em cada disparo."
 },
 {
 question: "Quantos números WhatsApp posso conectar?",
 answer: "Como a Wiize opera com a Meta API Oficial, não existe limite de disparos por número. O que define o seu uso é o volume de oportunidades geradas dentro do plano contratado. Atendimento, Growth IA e Enterprise liberam diferentes capacidades de oportunidades e números conectados, com a robustez e estabilidade da infraestrutura oficial do WhatsApp Business."
 },
 {
 question: "Posso cancelar quando quiser?",
 answer: "Sim. Sem fidelidade, sem taxa de cancelamento. Você cancela direto na plataforma e mantém o acesso até o fim do período pago."
 },
 {
 question: "Como funciona o teste grátis?",
 answer: "São 7 dias de acesso total ao plano escolhido. No cadastro, você seleciona o plano desejado (Atendimento, Growth IA ou Enterprise) e informa um cartão de crédito, mas nenhuma cobrança é feita durante o período de teste. Durante os 7 dias, você tem acesso completo a tudo que o plano oferece. A cobrança só acontece no 8º dia, caso você não cancele antes. Sem fidelidade e cancelamento direto na plataforma."
 },
];

// FAQ JSON-LD for Google rich results
export const faqJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'FAQPage',
 mainEntity: faqs.map(faq => ({
 '@type': 'Question',
 name: faq.question,
 acceptedAnswer: {
 '@type': 'Answer',
 text: faq.answer,
 },
 })),
};

