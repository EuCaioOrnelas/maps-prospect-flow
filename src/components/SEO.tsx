import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
}

const defaultMeta = {
  title: 'Prospex - Prospecção Inteligente com IA',
  description: 'Encontre leads estratégicos com IA. Nossa tecnologia analisa milhares de empresas e entrega apenas os melhores leads para prospectar novos clientes.',
  keywords: 'prospecção, leads, vendas, IA, inteligência artificial, clientes, B2B, geração de leads, marketing, vendas B2B',
  image: 'https://lovable.dev/opengraph-image-p98pqg.png',
  url: 'https://prospex.com.br',
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
}: SEOProps) => {
  const fullTitle = title ? `${title} | Prospex` : defaultMeta.title;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Prospex" />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Prospex" />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@Prospex" />

      {/* Additional SEO */}
      <meta name="theme-color" content="#22c55e" />
      <meta name="application-name" content="Prospex" />
    </Helmet>
  );
};
