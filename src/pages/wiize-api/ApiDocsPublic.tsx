import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiPublicNavbar } from "@/components/wiize-api/ApiPublicNavbar";
import { ApiDocsContent } from "@/components/wiize-api/ApiDocsContent";
import { supabase } from "@/integrations/supabase/client";

const CANONICAL = "https://wiize.com.br/api/docs";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Documentação da Wiize API",
  description:
    "Guia de integração da Wiize API: autenticação, endpoints de prospecção B2B, Wiize Tokens, idempotência, erros, limites de uso e política de uso justo.",
  url: CANONICAL,
  inLanguage: "pt-BR",
  publisher: { "@type": "Organization", name: "Wiize", url: "https://wiize.com.br" },
};

/** Documentação pública da Wiize API — acessível sem login e legível por IAs. */
export default function ApiDocsPublic() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(Boolean(data.session));
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Documentação da Wiize API — integração de prospecção B2B</title>
        <meta
          name="description"
          content="Documentação pública da Wiize API: autenticação por API Key, endpoints de busca, análise e abordagem, Wiize Tokens, idempotência, erros e limites de uso."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Documentação da Wiize API" />
        <meta
          property="og:description"
          content="Autenticação, endpoints, tokens, idempotência, erros e limites da Wiize API. Também disponível em llms.txt e OpenAPI para IAs."
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={CANONICAL} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <ApiPublicNavbar />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Wiize API</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Documentação da API
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Tudo o que você (ou sua IA) precisa para integrar a inteligência comercial da Wiize ao seu
            sistema. Acesso livre, sem login.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hasSession ? (
              <Button asChild size="sm">
                <Link to="/api/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao painel
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/api/login">
                  Criar conta e obter chave <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <a href="/wiize-api-llms-full.txt" target="_blank" rel="noopener noreferrer">
                Documentação para IA (.txt)
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href="/wiize-api-documentacao.pdf" target="_blank" rel="noopener noreferrer">
                Baixar PDF
              </a>
            </Button>
          </div>
        </header>

        <ApiDocsContent />
      </main>
    </div>
  );
}
