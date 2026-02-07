/**
 * ========================================
 * CONTEÚDO DA CONSULTORIA — ESTILO NETFLIX
 * ========================================
 *
 * ESTRUTURA:
 * - Cada FASE = uma "temporada" (card grande na home)
 * - Cada VIDEO = uma "aula" dentro da fase
 *
 * COMO ADICIONAR CONTEÚDO:
 * 1. Para nova fase: adicione um objeto ao array `fases`
 * 2. Para novo vídeo: adicione ao array `videos` da fase
 * 3. Para trocar capa: altere o campo `capa`
 * 4. Para trocar vídeo: altere o campo `videoId` (ID do YouTube)
 */

export interface Video {
  titulo: string;
  /** Caminho da imagem de capa do vídeo */
  capa: string;
  /** ID do vídeo no YouTube */
  videoId: string;
}

export interface Fase {
  titulo: string;
  subtitulo: string;
  descricao: string;
  /** Caminho da imagem de capa da fase */
  capa: string;
  videos: Video[];
}

export const fases: Fase[] = [
  {
    titulo: "FASE 1 — ATIVAÇÃO SEGURA",
    subtitulo: "Dias 0–7",
    descricao: "Evitar bloqueios, gerar confiança e garantir o primeiro resultado rápido.",
    capa: "/assets/capas/fase1.jpg",
    videos: [
      {
        titulo: "Mentalidade Anti-Bloqueio",
        capa: "/assets/capas/fase1.jpg",
        videoId: "r_cbh4-SOmI"
      },
      {
        titulo: "Setup Correto da Wiize (Prático)",
        capa: "/assets/capas/fase1.jpg",
        videoId: "r_cbh4-SOmI"
      },
      {
        titulo: "Primeiro Resultado em 7 Dias",
        capa: "/assets/capas/fase1.jpg",
        videoId: "r_cbh4-SOmI"
      }
    ]
  },
  {
    titulo: "FASE 2 — ORGANIZAÇÃO E CONTROLE",
    subtitulo: "Dias 8–30",
    descricao: "Organizar leads, dominar o CRM e controlar números com precisão.",
    capa: "/assets/capas/fase2.jpg",
    videos: [
      {
        titulo: "Uso Estratégico da Ferramenta",
        capa: "/assets/capas/fase2.jpg",
        videoId: "r_cbh4-SOmI"
      },
      {
        titulo: "CRM na Prática (Essencial)",
        capa: "/assets/capas/fase2.jpg",
        videoId: "r_cbh4-SOmI"
      },
      {
        titulo: "Gestão de Números e Contas",
        capa: "/assets/capas/fase2.jpg",
        videoId: "r_cbh4-SOmI"
      }
    ]
  },
  {
    titulo: "FASE 3 — CRESCIMENTO CONTROLADO",
    subtitulo: "30+ dias",
    descricao: "Escalar volume de disparos com segurança e consistência.",
    capa: "/assets/capas/fase3.jpg",
    videos: [
      {
        titulo: "Estratégias de Crescimento Progressivo",
        capa: "/assets/capas/fase3.jpg",
        videoId: "r_cbh4-SOmI"
      },
      {
        titulo: "Impulsionamento Sem Risco",
        capa: "/assets/capas/fase3.jpg",
        videoId: "r_cbh4-SOmI"
      },
      {
        titulo: "Gestão de Múltiplos Números",
        capa: "/assets/capas/fase3.jpg",
        videoId: "r_cbh4-SOmI"
      }
    ]
  },
  {
    titulo: "FASE 4 — MÉTRICAS, RELATÓRIOS E DECISÃO",
    subtitulo: "Análise e otimização",
    descricao: "Interpretar dados reais e tomar decisões estratégicas baseadas em métricas.",
    capa: "/assets/capas/fase4.jpg",
    videos: [
      {
        titulo: "Relatórios da Wiize",
        capa: "/assets/capas/fase4.jpg",
        videoId: "r_cbh4-SOmI"
      },
      {
        titulo: "Tomada de Decisão Baseada em Dados",
        capa: "/assets/capas/fase4.jpg",
        videoId: "r_cbh4-SOmI"
      }
    ]
  },
  {
    titulo: "FASE 5 — MATURIDADE E LONGEVIDADE",
    subtitulo: "Operação sustentável",
    descricao: "Manter a operação saudável a longo prazo e evitar erros fatais.",
    capa: "/assets/capas/fase5.jpg",
    videos: [
      {
        titulo: "Rotina Mensal Ideal",
        capa: "/assets/capas/fase5.jpg",
        videoId: "r_cbh4-SOmI"
      },
      {
        titulo: "Erros Avançados que Geram Bloqueio Tardio",
        capa: "/assets/capas/fase5.jpg",
        videoId: "r_cbh4-SOmI"
      }
    ]
  }
];
