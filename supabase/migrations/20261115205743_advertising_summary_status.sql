create or replace function public.ad_admin_summary()
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
 'advertisers',(select count(*) from public.advertisers where deleted_at is null),
 'active',(select count(*) from public.ad_creatives c join public.advertisers a on a.id=c.advertiser_id where c.deleted_at is null and a.deleted_at is null and c.enabled and a.enabled),
 'inactive',(select count(*) from public.ad_creatives c join public.advertisers a on a.id=c.advertiser_id where c.deleted_at is null and a.deleted_at is null and (not c.enabled or not a.enabled)),
 'pending',(select count(*) from public.ad_creatives where deleted_at is null and media_id is null),
 'impressions',coalesce((select sum(impressions) from public.ad_daily_stats where day>=current_date-29),0),
 'clicks',coalesce((select sum(clicks) from public.ad_daily_stats where day>=current_date-29),0));
$$;
