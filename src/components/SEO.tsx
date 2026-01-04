import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
  jsonLd?: object;
}

const defaultMeta = {
  title: 'WiizeProspect - Prospecção Inteligente com IA | Disparos em Massa WhatsApp',
  description: 'Prospecte novos clientes com IA. Encontre leads qualificados, faça disparos em massa via WhatsApp e aumente suas vendas. Plataforma completa de prospecção B2B.',
  keywords: 'prospecção, leads, vendas, IA, inteligência artificial, disparos em massa, WhatsApp, WiizeProspect, prospectar clientes, geração de leads, marketing digital, vendas B2B, automação WhatsApp, captação de clientes, prospecção inteligente, buscar leads, encontrar clientes',
  image: 'https://lovable.dev/opengraph-image-p98pqg.png',
  url: 'https://wiizeprospect.com.br',
  type: 'website',
};

export const SEO = ({
  title,
  description = defaultMeta.description,
  keywords = defaultMeta.keywords,
  image = defaultMeta.image,
  url = defaultMeta.url,
  type = defaultMeta.type,
  noIndex = false,
  jsonLd,
}: SEOProps) => {
  const fullTitle = title ? `${title} | WiizeProspect` : defaultMeta.title;

  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "WiizeProspect",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, Android, iOS",
    "description": description,
    "url": url,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "BRL",
      "description": "Teste grátis por 30 dias"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "500"
    }
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="WiizeProspect" />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="WiizeProspect" />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@WiizeProspect" />

      {/* Additional SEO */}
      <meta name="theme-color" content="#22c55e" />
      <meta name="application-name" content="WiizeProspect" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd || defaultJsonLd)}
      </script>
    </Helmet>
  );
};
