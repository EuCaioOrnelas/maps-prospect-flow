CREATE OR REPLACE FUNCTION public.increment_blog_post_view(_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = _post_id
    AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_post_view(uuid) TO anon, authenticated;