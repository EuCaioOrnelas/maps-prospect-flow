import { Helmet } from "react-helmet-async";
import { ApiDocsContent } from "@/components/wiize-api/ApiDocsContent";

/** Documentação da Wiize API — área autenticada. Arquivos para IA (llms.txt, PDF, OpenAPI) ficam públicos em /public. */
export default function ApiDocs() {
  return (
    <div className="mx-auto max-w-6xl">
      <Helmet>
        <title>Documentação — Wiize API</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="mb-10 border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Wiize API</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Documentação da API
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tudo o que você (ou sua IA) precisa para integrar a inteligência comercial da Wiize ao seu
          sistema. Versões para IA: <a href="/llms.txt" className="text-primary underline">llms.txt</a>,{" "}
          <a href="/wiize-api-llms-full.txt" className="text-primary underline">documentação completa (.txt)</a>{" "}
          e <a href="/wiize-api-openapi.json" className="text-primary underline">OpenAPI</a>.
        </p>
      </header>
      <ApiDocsContent />
    </div>
  );
}
