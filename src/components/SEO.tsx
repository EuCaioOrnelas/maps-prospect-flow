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
  title: 'Wiize - Prospecção Inteligente e Disparos em Massa via WhatsApp',
  description: 'Encontre leads estratégicos com IA e faça disparos em massa via WhatsApp. Prospecção inteligente, automação de mensagens e geração de leads B2B para aumentar suas vendas.',
  keywords: 'prospecção, leads, vendas, IA, inteligência artificial, clientes, B2B, geração de leads, marketing, vendas B2B, disparos em massa, WhatsApp marketing, automação WhatsApp, prospecção de clientes, Wiize, ferramenta de prospecção, captar clientes, envio de mensagens em massa, leads qualificados',
  image: 'https://lovable.dev/opengraph-image-p98pqg.png',
  url: 'https://wiize.com.br',
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
  const fullTitle = title ? `${title} | Wiize` : defaultMeta.title;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Wiize" />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Wiize" />
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
      <meta name="application-name" content="Wiize" />
    </Helmet>
  );
};
