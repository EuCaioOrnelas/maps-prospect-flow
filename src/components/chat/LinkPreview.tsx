import { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

interface LinkPreviewProps {
  url: string;
  fromMe: boolean;
}

// Cache for previews to avoid refetching
const previewCache = new Map<string, LinkPreviewData | null>();

const LinkPreviewComponent = ({ url, fromMe }: LinkPreviewProps) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      // Check cache first
      if (previewCache.has(url)) {
        const cached = previewCache.get(url);
        setPreview(cached || null);
        setLoading(false);
        if (!cached) setError(true);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.functions.invoke('fetch-link-preview', {
          body: { url },
        });

        if (fetchError || data?.error) {
          throw new Error(fetchError?.message || data?.error);
        }

        previewCache.set(url, data);
        setPreview(data);
      } catch (err) {
        console.error('Error fetching link preview:', err);
        previewCache.set(url, null);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (error || (!loading && !preview?.title && !preview?.image)) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn(
        'mt-2 rounded-lg overflow-hidden border',
        fromMe ? 'border-primary-foreground/20 bg-primary/80' : 'border-border bg-muted/50'
      )}>
        <Skeleton className="h-32 w-full" />
        <div className="p-2 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'mt-2 rounded-lg overflow-hidden border cursor-pointer transition-opacity hover:opacity-90',
        fromMe ? 'border-primary-foreground/20 bg-primary/80' : 'border-border bg-muted/50'
      )}
    >
      {preview?.image && !imageError && (
        <div className="relative w-full h-32 bg-muted">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )}
      <div className="p-2">
        <div className="flex items-center gap-1 mb-1">
          {preview?.favicon && !imageError ? (
            <img
              src={preview.favicon}
              alt=""
              className="w-3 h-3"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-3 h-3 opacity-60" />
          )}
          <span className={cn(
            'text-[10px] truncate',
            fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {preview?.siteName || new URL(url).hostname}
          </span>
          <ExternalLink className={cn(
            'w-2.5 h-2.5 ml-auto shrink-0',
            fromMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )} />
        </div>
        {preview?.title && (
          <p className={cn(
            'text-xs font-medium line-clamp-2',
            fromMe ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {preview.title}
          </p>
        )}
        {preview?.description && (
          <p className={cn(
            'text-[10px] line-clamp-2 mt-0.5',
            fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {preview.description}
          </p>
        )}
      </div>
    </div>
  );
};

export const LinkPreview = memo(LinkPreviewComponent);
