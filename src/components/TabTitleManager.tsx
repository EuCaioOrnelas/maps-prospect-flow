import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type TabTitleRule = {
  pattern: RegExp;
  label: string;
};

// Páginas de vendas e de produtos usam apenas "Wiize" na aba.
const BRAND_ONLY_PATTERNS: RegExp[] = [/^\/$/, /^\/produtos(?:\/.*)?$/];

const TAB_TITLE_RULES: TabTitleRule[] = [
  { pattern: /^\/login\/?$/, label: "Entrar" },
  { pattern: /^\/signup(?:\/.*)?$/, label: "Criar Conta" },
  { pattern: /^\/forgot-password\/?$/, label: "Recuperar Senha" },
  { pattern: /^\/reset-password\/?$/, label: "Redefinir Senha" },
  { pattern: /^\/onboarding\/?$/, label: "Primeiros Passos" },
  { pattern: /^\/demonstracao\/?$/, label: "Demonstração" },
  { pattern: /^\/tour-(?:completo|guiado)\/?$/, label: "Tour Guiado" },
  { pattern: /^\/enterprise\/?$/, label: "Enterprise" },
  { pattern: /^\/blog(?:\/.*)?$/, label: "Blog" },
  { pattern: /^\/contato\/?$/, label: "Contato" },
  { pattern: /^\/terms\/?$/, label: "Termos de Uso" },
  { pattern: /^\/privacy\/?$/, label: "Privacidade" },
  { pattern: /^\/refund-policy\/?$/, label: "Reembolso" },
  { pattern: /^\/seguranca-faq\/?$/, label: "Segurança" },
  { pattern: /^\/diretrizes-de-envio\/?$/, label: "Diretrizes de Envio" },
  { pattern: /^\/ajuda(?:\/.*)?$/, label: "Central de Ajuda" },
  { pattern: /^\/inteligencia\/?$/, label: "Inteligência Wiize" },
  { pattern: /^\/upgrade(?:-promo)?\/?$/, label: "Upgrade" },
  { pattern: /^\/checkout-(?:pix|card|success|failed)\/?$/, label: "Checkout" },
  { pattern: /^\/renewal-success\/?$/, label: "Assinatura Renovada" },
  { pattern: /^\/thank-you\/?$/, label: "Obrigado" },
  { pattern: /^\/avaliacao\/[^/]+\/?$/, label: "Avaliação" },
  { pattern: /^\/descadastro\/?$/, label: "Descadastro" },
  { pattern: /^\/shared-report\/[^/]+\/?$/, label: "Relatório" },
  { pattern: /^\/acesso-negado\/?$/, label: "Acesso Negado" },
  { pattern: /^\/prospeccao\/?$/, label: "Prospecção" },

  { pattern: /^\/dashboard\/?$/, label: "Painel" },
  { pattern: /^\/reports\/prospeccao\/?$/, label: "Relatórios de Prospecção" },
  { pattern: /^\/profile\/?$/, label: "Meu Perfil" },
  { pattern: /^\/usuarios\/?$/, label: "Usuários" },
  { pattern: /^\/sugestoes\/?$/, label: "Sugestões" },
  { pattern: /^\/minha-assinatura\/?$/, label: "Minha Assinatura" },
  { pattern: /^\/trial-expired\/?$/, label: "Trial Expirado" },

  { pattern: /^\/oportunidades\/web\/?$/, label: "Prospecção Web" },
  { pattern: /^\/oportunidades\/gestao\/?$/, label: "Gestão de Oportunidades" },
  { pattern: /^\/oportunidades\/sdr\/novo\/?$/, label: "Novo SDR Inteligente" },
  { pattern: /^\/oportunidades\/sdr\/[^/]+\/editar\/?$/, label: "Editar SDR Inteligente" },
  { pattern: /^\/oportunidades\/sdr\/?$/, label: "SDR Inteligente" },
  { pattern: /^\/oportunidades\/?$/, label: "Prospecção IA" },

  { pattern: /^\/meta-campaigns\/?$/, label: "Campanhas" },
  { pattern: /^\/meta-api-guide\/?$/, label: "Guia Meta" },
  { pattern: /^\/crm\/vendas\/renovacao\/?$/, label: "Renovações" },
  { pattern: /^\/crm\/vendas\/?$/, label: "Vendas" },
  { pattern: /^\/crm\/?$/, label: "CRM" },
  { pattern: /^\/agenda\/lembretes\/?$/, label: "Lembretes da Agenda" },
  { pattern: /^\/agenda\/?$/, label: "Agenda" },

  { pattern: /^\/chat\/configuracoes\/mensagens-rapidas\/?$/, label: "Respostas Rápidas" },
  { pattern: /^\/chat\/configuracoes\/resposta-automatica\/?$/, label: "Resposta Automática" },
  { pattern: /^\/chat\/configuracoes\/privacidade\/?$/, label: "Privacidade do Chat" },
  { pattern: /^\/chat\/configuracoes\/?$/, label: "Configurações do Chat" },
  { pattern: /^\/chat\/?$/, label: "Chat" },
  { pattern: /^\/fluxos\/novo\/?$/, label: "Novo Fluxo" },
  { pattern: /^\/fluxos\/[^/]+\/?$/, label: "Editor de Fluxo" },
  { pattern: /^\/fluxos\/?$/, label: "Fluxos" },
  { pattern: /^\/equipe-ia(?:\/.*)?$/, label: "Equipe de IA" },
  { pattern: /^\/consultoria\/?$/, label: "Consultoria" },

  { pattern: /^\/meta\/campanhas\/?$/, label: "Campanhas Meta" },
  { pattern: /^\/meta\/templates\/?$/, label: "Templates Meta" },
  { pattern: /^\/meta\/modelos-internos\/?$/, label: "Modelos internos" },
  { pattern: /^\/meta\/configuracoes\/?$/, label: "Configurações Meta" },
  { pattern: /^\/meta\/?$/, label: "Meta" },
  { pattern: /^\/numeros\/comparativo\/?$/, label: "Comparativo de Números" },
  { pattern: /^\/numeros\/?$/, label: "Números" },

  { pattern: /^\/admin\/usuarios\/[^/]+\/?$/, label: "Admin - Detalhes do Usuário" },
  { pattern: /^\/admin\/trial-email-flow\/?$/, label: "Admin - Automação Trial" },
  { pattern: /^\/admin\/partners\/parceiros\/[^/]+\/?$/, label: "Admin - Detalhes do Parceiro" },
  { pattern: /^\/admin\/partners(?:\/.*)?$/, label: "Admin - Parceiros" },
  { pattern: /^\/admin\/integration(?:\/.*)?$/, label: "Admin - Integrações" },
  { pattern: /^\/admin\/blog(?:\/.*)?$/, label: "Admin - Blog" },
  { pattern: /^\/admin\/suporte(?:\/.*)?$/, label: "Admin - Suporte" },
  { pattern: /^\/admin\/usuarios\/?$/, label: "Admin - Usuários" },
  { pattern: /^\/admin\/trials\/?$/, label: "Admin - Trials" },
  { pattern: /^\/admin\/assinaturas\/?$/, label: "Admin - Assinaturas" },
  { pattern: /^\/admin\/mrr-audit\/?$/, label: "Admin - MRR" },
  { pattern: /^\/admin\/auditoria\/?$/, label: "Admin - Auditoria" },
  { pattern: /^\/admin(?:\/.*)?$/, label: "Admin" },

  { pattern: /^\/partners\/leads\/?$/, label: "Parceiros - Leads" },
  { pattern: /^\/partners\/links\/?$/, label: "Parceiros - Links" },
  { pattern: /^\/partners\/comissoes\/?$/, label: "Parceiros - Comissões" },
  { pattern: /^\/partners\/saques\/?$/, label: "Parceiros - Saques" },
  { pattern: /^\/partners\/materiais\/?$/, label: "Parceiros - Materiais" },
  { pattern: /^\/partners\/metas\/?$/, label: "Parceiros - Metas" },
  { pattern: /^\/partners\/niveis\/?$/, label: "Parceiros - Níveis" },
  { pattern: /^\/partners\/(?:dados-bancarios|banco)\/?$/, label: "Parceiros - Dados Bancários" },
  { pattern: /^\/partners\/?$/, label: "Parceiros - Painel" },
  { pattern: /^\/partners\/login\/?$/, label: "Parceiros - Entrar" },
  { pattern: /^\/(?:partners\/apply|wiize-partners\/candidatura)\/?$/, label: "Parceiros - Candidatura" },
  { pattern: /^\/(?:partners\/terms|parceiros\/termos)\/?$/, label: "Parceiros - Termos" },
  { pattern: /^\/(?:partners\/verify|parceiros\/verificar)\/?$/, label: "Parceiros - Verificação" },
  { pattern: /^\/parceiros\/?$/, label: "Parceiros" },

  { pattern: /^\/api\/login\/?$/, label: "API - Entrar" },
  { pattern: /^\/api\/dashboard\/?$/, label: "API - Painel" },
  { pattern: /^\/api\/keys\/?$/, label: "API - Chaves" },
  { pattern: /^\/api\/usage\/?$/, label: "API - Consumo" },
  { pattern: /^\/api\/docs\/?$/, label: "API - Documentação" },
  { pattern: /^\/api\/billing\/?$/, label: "API - Cobrança" },
  { pattern: /^\/api\/settings\/?$/, label: "API - Configurações" },
];

function getTabTitle(pathname: string) {
  if (BRAND_ONLY_PATTERNS.some((p) => p.test(pathname))) return "Wiize";
  const rule = TAB_TITLE_RULES.find(({ pattern }) => pattern.test(pathname));
  return rule ? `Wiize - ${rule.label}` : "Wiize";
}

export function TabTitleManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = getTabTitle(pathname);
    const applyTitle = () => {
      if (document.title !== title) document.title = title;
    };

    applyTitle();

    // Helmet may update the title after navigation. Internal pages always keep
    // the concise tab title, while their remaining SEO tags stay untouched.
    const observer = new MutationObserver(applyTitle);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}