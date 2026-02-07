/**
 * ========================================
 * CONTEÚDO DA CONSULTORIA — ESTILO NETFLIX
 * ========================================
 *
 * ESTRUTURA:
 * - Cada FASE = uma "temporada" (card grande na home)
 * - Cada VIDEO = uma "aula" dentro da fase
 *
 * STATUS:
 * - "ativo" = conteúdo liberado, funciona normalmente
 * - "em_breve" = conteúdo em desenvolvimento, aparece bloqueado
 *
 * COMO ADICIONAR CONTEÚDO:
 * 1. Para nova fase: adicione um objeto ao array `fases`
 * 2. Para novo vídeo: adicione ao array `videos` da fase
 * 3. Para trocar capa: altere o campo `capa`
 * 4. Para trocar vídeo: altere o campo `videoId` (ID do YouTube)
 * 5. Para marcar como "em breve": defina `status: "em_breve"` na fase ou vídeo
 */

export type ContentStatus = "ativo" | "em_breve";

export interface Video {
  titulo: string;
  /** Caminho da imagem de capa do vídeo */
  capa: string;
  /** ID do vídeo no YouTube */
  videoId: string;
  /** Status do vídeo: "ativo" (padrão) ou "em_breve" */
  status?: ContentStatus;
}

export interface Fase {
  titulo: string;
  descricao: string;
  /** Caminho da imagem de capa da fase */
  capa: string;
  videos: Video[];
  /** Status da fase: "ativo" (padrão) ou "em_breve" */
  status?: ContentStatus;
}

export const fases: Fase[] = [
  {
    titulo: "FASE 1 — ATIVAÇÃO SEGURA",
    descricao: "Evitar bloqueios, gerar confiança e garantir o primeiro resultado rápido.",
    capa: "/assets/capas/fase1.jpg",
    status: "ativo",
    videos: [
      {
        titulo: "Mentalidade Anti-Bloqueio",
        capa: "/assets/capas/fase1.jpg",
        videoId: "r_cbh4-SOmI",
        status: "ativo"
      },
      {
        titulo: "Setup Correto da Wiize (Prático)",
        capa: "/assets/capas/fase1.jpg",
        videoId: "r_cbh4-SOmI",
        status: "ativo"
      },
      {
        titulo: "Primeiro Resultado em 7 Dias",
        capa: "/assets/capas/fase1.jpg",
        videoId: "r_cbh4-SOmI",
        status: "ativo"
      }
    ]
  },
  {
    titulo: "FASE 2 — ORGANIZAÇÃO E CONTROLE",
    descricao: "Organizar leads, dominar o CRM e controlar números com precisão.",
    capa: "/assets/capas/fase2.jpg",
    status: "ativo",
    videos: [
      {
        titulo: "Uso Estratégico da Ferramenta",
        capa: "/assets/capas/fase2.jpg",
        videoId: "r_cbh4-SOmI",
        status: "ativo"
      },
      {
        titulo: "CRM na Prática (Essencial)",
        capa: "/assets/capas/fase2.jpg",
        videoId: "r_cbh4-SOmI",
        status: "ativo"
      },
      {
        titulo: "Gestão de Números e Contas",
        capa: "/assets/capas/fase2.jpg",
        videoId: "r_cbh4-SOmI",
        status: "ativo"
      }
    ]
  },
  {
    titulo: "FASE 3 — CRESCIMENTO CONTROLADO",
    descricao: "Escalar volume de disparos com segurança e consistência.",
    capa: "/assets/capas/fase3.jpg",
    status: "em_breve",
    videos: [
      {
        titulo: "Estratégias de Crescimento Progressivo",
        capa: "/assets/capas/fase3.jpg",
        videoId: "r_cbh4-SOmI",
        status: "em_breve"
      },
      {
        titulo: "Impulsionamento Sem Risco",
        capa: "/assets/capas/fase3.jpg",
        videoId: "r_cbh4-SOmI",
        status: "em_breve"
      },
      {
        titulo: "Gestão de Múltiplos Números",
        capa: "/assets/capas/fase3.jpg",
        videoId: "r_cbh4-SOmI",
        status: "em_breve"
      }
    ]
  },
  {
    titulo: "FASE 4 — MÉTRICAS, RELATÓRIOS E DECISÃO",
    descricao: "Interpretar dados reais e tomar decisões estratégicas baseadas em métricas.",
    capa: "/assets/capas/fase4.jpg",
    status: "em_breve",
    videos: [
      {
        titulo: "Relatórios da Wiize",
        capa: "/assets/capas/fase4.jpg",
        videoId: "r_cbh4-SOmI",
        status: "em_breve"
      },
      {
        titulo: "Tomada de Decisão Baseada em Dados",
        capa: "/assets/capas/fase4.jpg",
        videoId: "r_cbh4-SOmI",
        status: "em_breve"
      }
    ]
  },
  {
    titulo: "FASE 5 — MATURIDADE E LONGEVIDADE",
    descricao: "Manter a operação saudável a longo prazo e evitar erros fatais.",
    capa: "/assets/capas/fase5.jpg",
    status: "em_breve",
    videos: [
      {
        titulo: "Rotina Mensal Ideal",
        capa: "/assets/capas/fase5.jpg",
        videoId: "r_cbh4-SOmI",
        status: "em_breve"
      },
      {
        titulo: "Erros Avançados que Geram Bloqueio Tardio",
        capa: "/assets/capas/fase5.jpg",
        videoId: "r_cbh4-SOmI",
        status: "em_breve"
      }
    ]
  }
];
