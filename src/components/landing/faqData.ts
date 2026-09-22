// Dados do FAQ isolados do componente: assim a landing page consegue montar o
// JSON-LD sem puxar o componente inteiro (Accordion, ícones) para o bundle inicial.
export const faqs = [
  {
    question: "O que é a Wiize?",
    answer: "A Wiize é uma plataforma de inteligência comercial B2B que reúne prospecção, SDR Inteligente, CRM, WhatsApp, formulários, automações e análise de oportunidades em uma só operação."
  },
  {
    question: "Como a Wiize encontra e prioriza empresas?",
    answer: "Você define o perfil de empresa que procura. A Wiize pesquisa fontes empresariais, analisa sinais públicos e organiza as oportunidades por aderência e contexto. A pontuação é uma recomendação para priorização, não uma garantia de venda."
  },
  {
    question: "O que o SDR Inteligente faz?",
    answer: "O SDR Inteligente conversa com leads, faz perguntas de qualificação, responde com base nas informações da sua empresa, executa follow-ups e pode encaminhar a conversa para uma pessoa ou para o agendamento. Sua equipe pode acompanhar e assumir o atendimento quando quiser."
  },
  {
    question: "O que é a Wian?",
    answer: "A Wian é a inteligência da Wiize. Ela resume o que aconteceu na operação, destaca oportunidades e próximos passos e também orienta usuários na área de suporte. As recomendações apoiam a equipe, que continua responsável pelas decisões comerciais."
  },
  {
    question: "Como funcionam o CRM, os formulários e os links rastreados?",
    answer: "O CRM centraliza contatos, conversas, atividades e etapas comerciais. Formulários com a sua marca enviam respostas e arquivos ao CRM, enquanto links rastreados preservam a origem e as UTMs para você entender de onde veio cada oportunidade."
  },
  {
    question: "Como funcionam os templates de mensagem?",
    answer: "Você cria e gerencia modelos de mensagem na Wiize e os envia para análise da Meta. Fora da janela de atendimento de 24 horas, o WhatsApp exige um template aprovado para iniciar ou reabrir uma conversa. Aprovação, categoria e qualidade são definidas pela Meta."
  },
  {
    question: "Qual a diferença entre Número de Marketing e Número de Suporte?",
    answer: "O Número de Marketing usa a API Oficial da Meta para campanhas e mensagens com templates aprovados. O Número de Suporte é voltado a atendimento individual, chat, SDR e automações de suporte. Cada modalidade segue limites e condições próprios; campanhas devem usar o canal oficial da Meta."
  },
  {
    question: "Como a Wiize protege dados e conversas?",
    answer: "A Wiize usa conexões seguras, controles de acesso, isolamento dos dados de cada empresa, proteção de credenciais e registros de segurança. O cliente controla sua equipe e é responsável pela base legal dos contatos inseridos ou captados na plataforma."
  },
  {
    question: "Como funciona o suporte?",
    answer: "A Wian oferece orientação inicial a qualquer hora. Quando uma solicitação precisa de análise humana, ela pode ser encaminhada ao time de suporte, que atende pelos canais e horários informados na página de contato."
  },
  {
    question: "Como funcionam o teste grátis e o cancelamento?",
    answer: "O teste gratuito dura 7 dias nas condições mostradas no cadastro. Se você não cancelar antes do fim do período, a cobrança do plano escolhido começa no 8º dia. O cancelamento pode ser feito na plataforma, sem fidelidade, e o acesso segue até o fim do período pago."
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

