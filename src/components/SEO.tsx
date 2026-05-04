import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_URL = 'https://wiize.com.br';
const SITE_NAME = 'Wiize';

const defaultMeta = {
  title: 'Wiize - Inteligência Comercial, Dados Qualificados e Automação B2B',
  description: 'Plataforma de inteligência comercial B2B: dados de empresas qualificados, enriquecimento com IA e automação de vendas. Encontre, qualifique e converta os clientes certos.',
  keywords: 'inteligência comercial, dados B2B, dados qualificados, enriquecimento de dados, sales intelligence, automação de vendas, qualificação de leads, prospecção B2B, CRM inteligente, agente de IA comercial, ICP, dados de empresas, Wiize',
  image: 'https://lovable.dev/opengraph-image-p98pqg.png',
  url: SITE_URL,
  type: 'website',
};

// Organization schema reused across pages
const organizationSchema = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: defaultMeta.description,
  foundingDate: '2024',
  sameAs: [
    'https://www.instagram.com/wiize.com.br/',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    availableLanguage: ['Portuguese'],
    url: `${SITE_URL}/contato`,
  },
};

// WebSite schema with sitelinks search box
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: defaultMeta.description,
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: 'pt-BR',
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
  const fullTitle = title ? `${title} | ${SITE_NAME}` : defaultMeta.title;

  // Build JSON-LD array
  const schemas: Record<string, unknown>[] = [
    { '@context': 'https://schema.org', ...organizationSchema },
    websiteSchema,
  ];

  // Add WebPage schema for every page
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}/#webpage`,
    url,
    name: fullTitle,
    description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'pt-BR',
  });

  // Add any page-specific schemas
  if (jsonLd) {
    if (Array.isArray(jsonLd)) {
      schemas.push(...jsonLd);
    } else {
      schemas.push(jsonLd);
    }
  }

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={SITE_NAME} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Language */}
      <html lang="pt-BR" />
      <meta httpEquiv="content-language" content="pt-BR" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@Wiize" />

      {/* Additional SEO */}
      <meta name="theme-color" content="#22c55e" />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="google" content="notranslate" />
      <meta name="format-detection" content="telephone=no" />

      {/* JSON-LD Structured Data */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
