import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowRight, Sparkles } from "lucide-react";

interface ProductContent {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bullets: string[];
}

const PRODUCTS: ProductContent[] = [
  {
    slug: "prospeccao-inteligente",
    name: "Prospecção Inteligente",
    tagline: "Encontre empresas prontas para comprar",
    description:
      "A Wiize pesquisa, qualifica e prioriza empresas do seu nicho com sinais reais de intenção — sem listas frias.",
    bullets: [
      "Busca automática de empresas por nicho e região",
      "Score de 0 a 1000 com critérios do seu mercado",
      "Abordagem personalizada gerada por IA",
    ],
  },
  {
    slug: "sdr-inteligente",
    name: "SDR Inteligente",
    tagline: "Uma IA que qualifica e agenda por você",
    description:
      "O SDR Inteligente conversa no WhatsApp, entende o contexto do lead, qualifica e marca a reunião direto na sua agenda.",
    bullets: [
      "Atendimento 24/7 com tom da sua empresa",
      "Qualificação, follow-up e reativação automáticos",
      "Transferência para humano no momento certo",
    ],
  },
  {
    slug: "agenda-inteligente",
    name: "Agenda Inteligente",
    tagline: "Reuniões marcadas sem esforço manual",
    description:
      "Horários sugeridos com inteligência, confirmações automáticas, lembretes por e-mail e sincronização com o Google Agenda.",
    bullets: [
      "Sugestão de horários por período e disponibilidade",
      "Lembretes automáticos e status de atraso",
      "Sincronização com Google Agenda",
    ],
  },
  {
    slug: "ia-de-engajamento",
    name: "IA de Engajamento",
    tagline: "Conversas que reativam oportunidades",
    description:
      "Ciclos inteligentes de follow-up que mantêm o lead aquecido até a decisão, com mensagens sempre contextuais.",
    bullets: [
      "Ciclos de follow-up de 30 dias",
      "Mensagens contextuais, nunca repetidas",
      "Respeito total a opt-out e LGPD",
    ],
  },
  {
    slug: "automacao-comercial",
    name: "Automação Comercial",
    tagline: "Fluxos multicanal WhatsApp e Instagram",
    description:
      "Construa fluxos comerciais com gatilhos, condições, testes A/B e integrações — pelas APIs oficiais da Meta.",
    bullets: [
      "Editor visual de fluxos com IA",
      "Gatilhos de WhatsApp e Instagram",
      "Integrações com Google Sheets, Calendar e Gmail",
    ],
  },
  {
    slug: "gestao-de-contratos",
    name: "Gestão de Contratos",
    tagline: "Renovações, vencimentos e receita sob controle",
    description:
      "Acompanhe contratos, receba avisos de vencimento e renove sem perder receita recorrente.",
    bullets: [
      "Status de contratos vencendo e vencidos",
      "Avisos automáticos de renovação",
      "Visão de receita e projeções",
    ],
  },
];

export default function ProdutoPage() {
  const { slug } = useParams();
  const product = PRODUCTS.find((p) => p.slug === slug) ?? PRODUCTS[0];

  useEffect(() => {
    document.title = `${product.name} | Wiize`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", product.description.slice(0, 155));
  }, [product]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles size={13} /> Produto Wiize
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{product.name}</h1>
        <p className="mt-3 text-xl text-foreground/80">{product.tagline}</p>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        <ul className="mt-8 space-y-3">
          {product.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/signup/escolher-plano">
            <Button variant="hero" className="rounded-full">
              Começar agora <ArrowRight size={15} className="ml-1" />
            </Button>
          </Link>
          <Link to="/contato">
            <Button variant="outline" className="rounded-full">
              Falar com vendas
            </Button>
          </Link>
        </div>

        <p className="mt-12 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Estamos finalizando a página completa deste produto. Enquanto isso, fale com nosso time
          para ver uma demonstração ao vivo.
        </p>
      </main>
      <Footer />
    </div>
  );
}
