/**
 * ========================================
 * CONTEÚDO DA CONSULTORIA EDUCACIONAL
 * ========================================
 * 
 * Para adicionar novo conteúdo:
 * 1. Encontre a fase desejada no array `fases`
 * 2. Adicione um novo módulo ou aula
 * 3. Cole o iframe do YouTube no campo `videoUrl`
 *    (use apenas o ID do vídeo, ex: "r_cbh4-SOmI")
 * 
 * Exemplo de nova aula:
 * {
 *   titulo: "Título da aula",
 *   videoId: "ID_DO_VIDEO_YOUTUBE"
 * }
 */

export interface Aula {
  titulo: string;
  /** ID do vídeo no YouTube (parte após /embed/) */
  videoId: string;
}

export interface Modulo {
  id: string;
  titulo: string;
  descricao: string;
  aulas: Aula[];
}

export interface Fase {
  fase: string;
  descricao: string;
  modulos: Modulo[];
}

export const fases: Fase[] = [
  {
    fase: "FASE 1 — ATIVAÇÃO SEGURA",
    descricao: "Dias 0–7",
    modulos: [
      {
        id: "1.1",
        titulo: "Mentalidade Anti-Bloqueio",
        descricao: "Entenda como as plataformas detectam comportamento de risco e como evitar bloqueios.",
        aulas: [
          {
            titulo: "Como as plataformas detectam comportamento de risco",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Regras invisíveis do WhatsApp Business",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "O que nunca fazer nos primeiros 7 dias",
            videoId: "r_cbh4-SOmI"
          }
        ]
      },
      {
        id: "1.2",
        titulo: "Setup Correto da Wiize (Prático)",
        descricao: "Configure sua conta Wiize do zero com as melhores práticas.",
        aulas: [
          {
            titulo: "Criando e configurando sua conta",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Conectando seu número com segurança",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Configurações iniciais recomendadas",
            videoId: "r_cbh4-SOmI"
          }
        ]
      },
      {
        id: "1.3",
        titulo: "Primeiro Resultado em 7 Dias",
        descricao: "Passo a passo para conseguir seu primeiro resultado rapidamente.",
        aulas: [
          {
            titulo: "Estratégia dos primeiros disparos",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Escolhendo o público certo para começar",
            videoId: "r_cbh4-SOmI"
          }
        ]
      }
    ]
  },
  {
    fase: "FASE 2 — ORGANIZAÇÃO E CONTROLE",
    descricao: "Dias 8–30",
    modulos: [
      {
        id: "2.1",
        titulo: "Uso Estratégico da Ferramenta",
        descricao: "Domine todas as funcionalidades da Wiize para maximizar resultados.",
        aulas: [
          {
            titulo: "Funcionalidades avançadas da Wiize",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Automações e atalhos",
            videoId: "r_cbh4-SOmI"
          }
        ]
      },
      {
        id: "2.2",
        titulo: "CRM na Prática (Essencial)",
        descricao: "Organize seus leads e acompanhe o funil de vendas.",
        aulas: [
          {
            titulo: "Organizando leads no CRM",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Funil de vendas na prática",
            videoId: "r_cbh4-SOmI"
          }
        ]
      },
      {
        id: "2.3",
        titulo: "Gestão de Números e Contas",
        descricao: "Aprenda a gerenciar múltiplos números de forma segura.",
        aulas: [
          {
            titulo: "Quando adicionar um novo número",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Rotação segura de chips",
            videoId: "r_cbh4-SOmI"
          }
        ]
      }
    ]
  },
  {
    fase: "FASE 3 — CRESCIMENTO CONTROLADO",
    descricao: "30+ dias",
    modulos: [
      {
        id: "3.1",
        titulo: "Estratégias de Crescimento Progressivo",
        descricao: "Escale seus disparos de forma sustentável e segura.",
        aulas: [
          {
            titulo: "Escalando volume com segurança",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Indicadores de que você pode crescer",
            videoId: "r_cbh4-SOmI"
          }
        ]
      },
      {
        id: "3.2",
        titulo: "Impulsionamento Sem Risco",
        descricao: "Técnicas avançadas para aumentar resultados sem comprometer sua conta.",
        aulas: [
          {
            titulo: "Técnicas de aquecimento avançado",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Combinando canais de forma inteligente",
            videoId: "r_cbh4-SOmI"
          }
        ]
      },
      {
        id: "3.3",
        titulo: "Gestão de Múltiplos Números",
        descricao: "Gerencie uma operação com vários números simultaneamente.",
        aulas: [
          {
            titulo: "Estrutura ideal multi-número",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Dashboard de controle centralizado",
            videoId: "r_cbh4-SOmI"
          }
        ]
      }
    ]
  },
  {
    fase: "FASE 4 — MÉTRICAS, RELATÓRIOS E DECISÃO",
    descricao: "Análise e otimização",
    modulos: [
      {
        id: "4.1",
        titulo: "Relatórios da Wiize",
        descricao: "Entenda cada métrica e como usá-las a seu favor.",
        aulas: [
          {
            titulo: "Entendendo os relatórios de disparo",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Métricas que importam vs. vaidade",
            videoId: "r_cbh4-SOmI"
          }
        ]
      },
      {
        id: "4.2",
        titulo: "Tomada de Decisão Baseada em Dados",
        descricao: "Use dados reais para tomar decisões estratégicas.",
        aulas: [
          {
            titulo: "Quando pausar, escalar ou pivotar",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Análise de ROI dos disparos",
            videoId: "r_cbh4-SOmI"
          }
        ]
      }
    ]
  },
  {
    fase: "FASE 5 — MATURIDADE E LONGEVIDADE",
    descricao: "Operação sustentável",
    modulos: [
      {
        id: "5.1",
        titulo: "Rotina Mensal Ideal",
        descricao: "Estabeleça uma rotina consistente para resultados duradouros.",
        aulas: [
          {
            titulo: "Checklist mensal de operação",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Manutenção preventiva da conta",
            videoId: "r_cbh4-SOmI"
          }
        ]
      },
      {
        id: "5.2",
        titulo: "Erros Avançados que Geram Bloqueio Tardio",
        descricao: "Evite armadilhas que podem derrubar sua operação meses depois.",
        aulas: [
          {
            titulo: "Padrões que causam bloqueio após meses",
            videoId: "r_cbh4-SOmI"
          },
          {
            titulo: "Como identificar sinais de alerta precoce",
            videoId: "r_cbh4-SOmI"
          }
        ]
      }
    ]
  }
];
