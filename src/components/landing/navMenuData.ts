import {
  Search,
  Bot,
  CalendarClock,
  Sparkles,
  Workflow,
  FileSignature,
  Users,
  MessageSquare,
  Send,
  Target,
  BarChart3,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  LifeBuoy,
  Handshake,
  Rocket,
  Mail,
  FileText,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  label: string;
  description?: string;
  to: string;
  icon?: LucideIcon;
  external?: boolean;
}

export interface MenuColumn {
  title: string;
  items: MenuItem[];
}

/** Produtos — páginas dedicadas de produto (algumas ainda em construção) */
export const PRODUCT_COLUMNS: MenuColumn[] = [
  {
    title: "Prospecção & Vendas",
    items: [
      {
        label: "Prospecção Inteligente",
        description: "Encontre empresas prontas para comprar",
        to: "/produtos/prospeccao-inteligente",
        icon: Search,
      },
      {
        label: "SDR Inteligente",
        description: "IA que qualifica e agenda no WhatsApp",
        to: "/produtos/sdr-inteligente",
        icon: Bot,
      },
      {
        label: "Agenda Inteligente",
        description: "Reuniões marcadas sem esforço manual",
        to: "/produtos/agenda-inteligente",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "Relacionamento",
    items: [
      {
        label: "IA de Engajamento",
        description: "Conversas que reativam oportunidades",
        to: "/produtos/ia-de-engajamento",
        icon: Sparkles,
      },
      {
        label: "Automação Comercial",
        description: "Fluxos multicanal WhatsApp e Instagram",
        to: "/produtos/automacao-comercial",
        icon: Workflow,
      },
      {
        label: "Gestão de Contratos",
        description: "Renovações, vencimentos e receita",
        to: "/produtos/gestao-de-contratos",
        icon: FileSignature,
      },
    ],
  },
];

/** Recursos — módulos e materiais existentes na plataforma */
export const RESOURCE_COLUMNS: MenuColumn[] = [
  {
    title: "Plataforma",
    items: [
      { label: "CRM de Vendas", description: "Pipeline, score e negociações", to: "/#features", icon: Users },
      { label: "Chat Multicanal", description: "WhatsApp e Instagram oficiais", to: "/#features", icon: MessageSquare },
      { label: "Campanhas Meta", description: "Disparos oficiais e templates", to: "/#features", icon: Send },
      { label: "Score de Leads", description: "Priorize quem tem intenção real", to: "/#features", icon: Target },
    ],
  },
  {
    title: "Conteúdo & Confiança",
    items: [
      { label: "Blog", description: "Estratégias de vendas B2B", to: "/blog", icon: BookOpen },
      { label: "Tour completo", description: "Veja a plataforma por dentro", to: "/tour-completo", icon: BarChart3 },
      { label: "Segurança & LGPD", description: "Como protegemos seus dados", to: "/seguranca-faq", icon: ShieldCheck },
      { label: "Diretrizes de envio", description: "Boas práticas de mensageria", to: "/diretrizes-de-envio", icon: FileText },
    ],
  },
];

/** Coluna lateral destacada (igual ao anexo 3) */
export const MENU_SIDE_LINKS: MenuColumn[] = [
  {
    title: "Comece agora",
    items: [
      { label: "Criar conta gratuita", to: "/signup/escolher-plano", icon: Rocket },
      { label: "Planos e preços", to: "/#pricing", icon: FileText },
      { label: "Ver demonstração", to: "/demonstracao", icon: BarChart3 },
    ],
  },
  {
    title: "Suporte",
    items: [
      { label: "Central de ajuda", to: "/ajuda", icon: LifeBuoy },
      { label: "FAQ", to: "/ajuda/faq", icon: HelpCircle },
      { label: "Falar com vendas", to: "/contato", icon: Mail },
    ],
  },
  {
    title: "Parcerias",
    items: [
      { label: "Seja parceiro Wiize", to: "/partners/apply", icon: Handshake },
      { label: "Wiize Partners", to: "/partners/login", icon: Users },
      { label: "Enterprise", to: "/enterprise", icon: ShieldCheck },
    ],
  },
];
