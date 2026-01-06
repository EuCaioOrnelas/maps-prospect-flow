import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching preview for:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph and meta tags
    const getMetaContent = (property: string): string | null => {
      // Try og: tags first
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i'));
      if (ogMatch) return ogMatch[1];

      // Try twitter: tags
      const twitterMatch = html.match(new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:${property}["']`, 'i'));
      if (twitterMatch) return twitterMatch[1];

      // Try standard meta tags
      const metaMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i'));
      if (metaMatch) return metaMatch[1];

      return null;
    };

    // Get title
    let title = getMetaContent('title');
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : null;
    }

    // Get description
    const description = getMetaContent('description');

    // Get image
    let image = getMetaContent('image');
    if (image && !image.startsWith('http')) {
      // Handle relative URLs
      const urlObj = new URL(url);
      image = image.startsWith('/') 
        ? `${urlObj.origin}${image}`
        : `${urlObj.origin}/${image}`;
    }

    // Get site name
    const siteName = getMetaContent('site_name') || new URL(url).hostname;

    // Get favicon
    let favicon = null;
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
      || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    if (faviconMatch) {
      favicon = faviconMatch[1];
      if (!favicon.startsWith('http')) {
        const urlObj = new URL(url);
        favicon = favicon.startsWith('/') 
          ? `${urlObj.origin}${favicon}`
          : `${urlObj.origin}/${favicon}`;
      }
    } else {
      favicon = `${new URL(url).origin}/favicon.ico`;
    }

    const preview = {
      url,
      title: title ? decodeHTMLEntities(title) : null,
      description: description ? decodeHTMLEntities(description) : null,
      image,
      siteName,
      favicon,
    };

    console.log('Preview data:', preview);

    return new Response(
      JSON.stringify(preview),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch preview';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}
