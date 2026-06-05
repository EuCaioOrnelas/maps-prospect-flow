ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_blog_post_like(_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts SET like_count = like_count + 1 WHERE id = _post_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_blog_post_like(_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = _post_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_post_like(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_blog_post_like(uuid) TO anon, authenticated;