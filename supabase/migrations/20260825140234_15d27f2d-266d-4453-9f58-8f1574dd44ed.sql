UPDATE public.influencer_prospects p
SET video_count = v.cnt
FROM (SELECT prospect_id, count(*)::int AS cnt FROM public.influencer_videos GROUP BY prospect_id) v
WHERE v.prospect_id = p.id
  AND p.platform = 'instagram'
  AND coalesce(p.video_count, 0) < v.cnt;