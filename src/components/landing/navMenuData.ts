import {
  Bot,
  CalendarClock,
  Sparkles,
  Workflow,
  FileSignature,
  Search,
  LifeBuoy,
  HelpCircle,
  Code2,
  Mail,
  ShieldCheck,
  BookOpen,
  BarChart3,
  Brain,
  
  Handshake,
  UserPlus,
  LogIn,
  Rocket,
  CreditCard,
  PlayCircle,
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

/** Produtos — páginas dedicadas de produto */
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

/** Recursos — módulos, materiais e suporte */
export const RESOURCE_COLUMNS: MenuColumn[] = [
  {
    title: "Conteúdo & Confiança",
    items: [
      { label: "Inteligência do Wiize", description: "Como a plataforma lê e prioriza oportunidades", to: "/inteligencia", icon: Brain },
      { label: "Blog", description: "Estratégias de vendas B2B", to: "/blog", icon: BookOpen },
      { label: "Tour completo", description: "Veja a plataforma por dentro", to: "/tour-guiado", icon: BarChart3 },
      { label: "Segurança & LGPD", description: "Como protegemos seus dados", to: "/seguranca-faq", icon: ShieldCheck },
    ],
  },
  {
    title: "Suporte",
    items: [
      { label: "Central de ajuda", description: "Tutoriais e guias da plataforma", to: "/ajuda", icon: LifeBuoy },
      { label: "FAQ", description: "Perguntas frequentes sobre a plataforma", to: "/ajuda/faq", icon: HelpCircle },
      { label: "Falar com vendas", description: "Converse com nosso time", to: "/contato", icon: Mail },
    ],
  },
  {
    title: "Wiize Partners",
    items: [
      { label: "Seja parceiro", description: "Indique e ganhe comissões", to: "/parceiros", icon: Handshake },
      { label: "Candidatar-se", description: "Envie sua candidatura agora", to: "/partners/apply", icon: UserPlus },
      { label: "Área do parceiro", description: "Acesse seu painel de parceiro", to: "/partners/login", icon: LogIn },
    ],
  },
  {
    title: "Comece agora",
    items: [
      { label: "Criar conta", description: "Comece seu teste em minutos", to: "/signup/escolher-plano", icon: Rocket },
      { label: "Planos e preços", description: "Escolha o plano ideal", to: "/#pricing", icon: CreditCard },
      { label: "Ver demonstração", description: "Explore a plataforma sem login", to: "/tour-guiado", icon: PlayCircle },
    ],
  },
];

