UPDATE public.blog_posts SET
  title = regexp_replace(title, ' — ', ', ', 'g'),
  excerpt = regexp_replace(coalesce(excerpt,''), ' — ', ', ', 'g'),
  subtitle = regexp_replace(coalesce(subtitle,''), ' — ', ', ', 'g'),
  content = regexp_replace(content, ' — ', ', ', 'g'),
  ai_short_answer = regexp_replace(coalesce(ai_short_answer,''), ' — ', ', ', 'g'),
  ai_summary = regexp_replace(coalesce(ai_summary,''), ' — ', ', ', 'g'),
  seo_title = regexp_replace(coalesce(seo_title,''), ' — ', ', ', 'g'),
  seo_description = regexp_replace(coalesce(seo_description,''), ' — ', ', ', 'g');