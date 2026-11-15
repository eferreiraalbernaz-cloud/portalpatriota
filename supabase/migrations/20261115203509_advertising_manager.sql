create table public.advertisers (
 id uuid primary key default gen_random_uuid(), seed_key text unique,
 display_name text not null check(length(btrim(display_name)) between 2 and 160),
 internal_name text not null default '' check(length(internal_name)<=180),
 target_url text not null default '', enabled boolean not null default false,
 priority integer not null default 1 check(priority between 1 and 100),
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ad_media (
 id uuid primary key default gen_random_uuid(), path text not null unique check(path like 'advertising/%'),
 width integer, height integer, mime text not null check(mime in ('image/jpeg','image/png','image/webp','image/avif')),
 bytes integer not null check(bytes between 1 and 8388608), deleting_at timestamptz, created_at timestamptz not null default now()
);
create table public.ad_placements (key text primary key, label text not null);
insert into public.ad_placements values
 ('home','Entre notícias · Página inicial'),('category','Entre notícias · Editorias'),('search','Resultados da busca'),
 ('small_grid','Grades menores'),('article_end','Final da notícia'),('sidebar','Barra lateral · Desktop'),('article_inline','Corpo da notícia · Requer habilitação explícita');
create table public.ad_creatives (
 id uuid primary key default gen_random_uuid(), advertiser_id uuid not null references public.advertisers(id),
 title text not null default '' check(length(title)<=160), description text not null default '' check(length(description)<=500),
 target_url text not null default '', media_id uuid references public.ad_media(id) on delete restrict,
 reviewed_media_id uuid references public.ad_media(id) on delete set null,
 enabled boolean not null default false, show_text boolean not null default true,
 weight integer not null default 1 check(weight between 1 and 100),
 placements text[] not null default array['home','category','small_grid','article_end','sidebar']::text[]
  check(placements <@ array['home','category','search','small_grid','article_end','sidebar','article_inline']::text[]),
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint ad_creative_publishable check(not enabled or (media_id is not null and reviewed_media_id is not null and reviewed_media_id=media_id and length(btrim(title))>=3 and cardinality(placements)>0))
);
create table public.ad_distribution (
 id integer primary key default 1 check(id=1), interval_news integer not null default 4 check(interval_news between 1 and 100),
 small_grids boolean not null default true, own_percent integer not null default 70 check(own_percent between 0 and 100),
 monetag_percent integer not null default 30 check(monetag_percent between 0 and 100),
 allow_inline boolean not null default false,
 monetag_placements text[] not null default array['home','category','search','small_grid','article_end','sidebar']::text[] check(monetag_placements <@ array['home','category','search','small_grid','article_end','sidebar','article_inline']::text[]), check(own_percent+monetag_percent=100)
);
insert into public.ad_distribution(id) values(1);
create table public.ad_daily_stats (
 creative_id uuid not null references public.ad_creatives(id), day date not null default current_date,
 impressions bigint not null default 0, clicks bigint not null default 0, primary key(creative_id,day)
);
create table public.ad_event_receipts (
 nonce uuid not null, event_type text not null check(event_type in ('impression','click')),
 expires_at timestamptz not null, primary key(nonce,event_type)
);
create index ad_advertisers_live on public.advertisers(created_at desc) where deleted_at is null;
create index ad_creatives_advertiser on public.ad_creatives(advertiser_id,created_at desc) where deleted_at is null;
create index ad_creatives_placements on public.ad_creatives using gin(placements) where enabled and deleted_at is null;
create index ad_events_expiry on public.ad_event_receipts(expires_at);
create trigger advertisers_updated before update on public.advertisers for each row execute function public.set_updated_at();
create trigger ad_creatives_updated before update on public.ad_creatives for each row execute function public.set_updated_at();

alter table public.advertisers enable row level security;
alter table public.ad_media enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_placements enable row level security;
alter table public.ad_distribution enable row level security;
alter table public.ad_daily_stats enable row level security;
alter table public.ad_event_receipts enable row level security;
revoke all on public.advertisers,public.ad_media,public.ad_creatives,public.ad_placements,public.ad_distribution,public.ad_daily_stats,public.ad_event_receipts from public,anon,authenticated;
grant all on public.advertisers,public.ad_media,public.ad_creatives,public.ad_placements,public.ad_distribution,public.ad_daily_stats,public.ad_event_receipts to service_role;
-- Internal/personal advertiser names are never readable through the public Data API.
grant select(id,enabled,priority,deleted_at) on public.advertisers to anon,authenticated;
grant select on public.ad_creatives,public.ad_placements,public.ad_distribution to anon,authenticated;
grant select(id,path,width,height,deleting_at) on public.ad_media to anon,authenticated;
create policy advertisers_public on public.advertisers for select to anon,authenticated using(enabled and deleted_at is null);
create policy creatives_public on public.ad_creatives for select to anon,authenticated using(
 enabled and deleted_at is null and media_id=reviewed_media_id and exists(select 1 from public.advertisers a where a.id=advertiser_id and a.enabled and a.deleted_at is null));
create policy media_public on public.ad_media for select to anon,authenticated using(deleting_at is null and exists(select 1 from public.ad_creatives c where c.media_id=ad_media.id and c.enabled and c.deleted_at is null));
create policy placements_public on public.ad_placements for select to anon,authenticated using(true);
create policy distribution_public on public.ad_distribution for select to anon,authenticated using(true);
create policy stats_backend_only on public.ad_daily_stats for all to service_role using(true) with check(true);
create policy receipts_backend_only on public.ad_event_receipts for all to service_role using(true) with check(true);

create function public.ad_pick(p_placement text,p_count integer default 1)
returns table(id uuid,advertiser_id uuid,title text,description text,target_url text,storage_path text,width integer,height integer,show_text boolean,effective_weight numeric)
language sql volatile security invoker set search_path=public as $$
 select id,advertiser_id,title,description,target_url,storage_path,width,height,show_text,effective_weight from (
 select c.id,c.advertiser_id,c.title,c.description,c.target_url,m.path storage_path,m.width,m.height,c.show_text,(c.weight*a.priority)::numeric/sum(c.weight) over(partition by c.advertiser_id) effective_weight,
 row_number() over(partition by c.advertiser_id order by -ln(greatest(random(),0.000001))/(c.weight*a.priority)) advertiser_round,
 -ln(greatest(random(),0.000001))/(c.weight*a.priority) score
 from public.ad_creatives c join public.advertisers a on a.id=c.advertiser_id join public.ad_media m on m.id=c.media_id
 where c.enabled and a.enabled and c.deleted_at is null and a.deleted_at is null and m.deleting_at is null
 and c.media_id=c.reviewed_media_id and p_placement=any(c.placements)
 ) ranked order by advertiser_round,score limit greatest(1,least(p_count,200));
$$;
revoke all on function public.ad_pick(text,integer) from public;
grant execute on function public.ad_pick(text,integer) to anon,authenticated,service_role;

create function public.ad_save_creative(p_id uuid,p_advertiser uuid,p_data jsonb,p_publish boolean,p_confirm boolean)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid; v_media uuid; v_reviewed uuid; v_media_row public.ad_media; v_previous public.ad_creatives;
begin
 perform 1 from public.advertisers where id=p_advertiser and deleted_at is null for update;
 if not found then raise exception 'Anunciante não encontrado'; end if;
 if p_id is not null then
  select * into v_previous from public.ad_creatives where id=p_id and advertiser_id=p_advertiser and deleted_at is null for update;
  if not found then raise exception 'Anúncio não encontrado'; end if;
 end if;
 v_media=nullif(p_data->>'media_id','')::uuid;
 if v_media is not null then
  select * into v_media_row from public.ad_media where id=v_media and deleting_at is null for share;
  if not found then raise exception 'Imagem indisponível'; end if;
 end if;
 v_reviewed=v_previous.reviewed_media_id;
 if p_confirm and v_media is not null then v_reviewed=v_media; end if;
 if p_publish and (v_media is null or v_reviewed is distinct from v_media) then raise exception 'Confirme a autorização da imagem antes de publicar'; end if;
 if p_id is null then
  insert into public.ad_creatives(advertiser_id,title,description,target_url,media_id,reviewed_media_id,enabled,show_text,weight,placements)
  values(p_advertiser,p_data->>'title',p_data->>'description',p_data->>'target_url',v_media,v_reviewed,p_publish,(p_data->>'show_text')::boolean,(p_data->>'weight')::integer,array(select jsonb_array_elements_text(p_data->'placements'))) returning id into v_id;
 else
  update public.ad_creatives set title=p_data->>'title',description=p_data->>'description',target_url=p_data->>'target_url',media_id=v_media,reviewed_media_id=v_reviewed,enabled=p_publish,
  show_text=(p_data->>'show_text')::boolean,weight=(p_data->>'weight')::integer,placements=array(select jsonb_array_elements_text(p_data->'placements')) where id=p_id returning id into v_id;
 end if;
 if p_publish then update public.advertisers set enabled=true where id=p_advertiser; end if;
 return v_id;
end $$;
create function public.ad_remove(p_advertiser uuid,p_creative uuid default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from public.advertisers where id=p_advertiser for update;
 update public.ad_creatives set enabled=false,deleted_at=now(),media_id=null,reviewed_media_id=null
 where advertiser_id=p_advertiser and (p_creative is null or id=p_creative) and deleted_at is null;
 if p_creative is null then update public.advertisers set enabled=false,deleted_at=now() where id=p_advertiser; end if;
end $$;
create function public.ad_claim_unused_media(p_id uuid)
returns text language plpgsql security invoker set search_path=public as $$
declare v_path text;
begin
 select path into v_path from public.ad_media where id=p_id for update;
 if v_path is null then raise exception 'Imagem não encontrada'; end if;
 if exists(select 1 from public.ad_creatives where media_id=p_id and deleted_at is null) then raise exception 'Imagem em uso por um anúncio'; end if;
 update public.ad_media set deleting_at=now() where id=p_id;
 return v_path;
end $$;
create function public.ad_record_event(p_creative uuid,p_nonce uuid,p_event text)
returns void language plpgsql security invoker set search_path=public as $$
declare inserted integer;
begin
 if p_event not in ('impression','click') then return; end if;
 if not exists(select 1 from public.ad_creatives c join public.advertisers a on a.id=c.advertiser_id where c.id=p_creative and c.enabled and c.deleted_at is null and a.enabled and a.deleted_at is null) then return; end if;
 insert into public.ad_event_receipts values(p_nonce,p_event,now()+interval '2 days') on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return; end if;
 insert into public.ad_daily_stats(creative_id,day,impressions,clicks)
 values(p_creative,current_date,case when p_event='impression' then 1 else 0 end,case when p_event='click' then 1 else 0 end)
 on conflict(creative_id,day) do update set impressions=ad_daily_stats.impressions+excluded.impressions,clicks=ad_daily_stats.clicks+excluded.clicks;
 delete from public.ad_event_receipts where (nonce,event_type) in (select nonce,event_type from public.ad_event_receipts where expires_at<now() limit 100);
end $$;
create function public.ad_admin_summary()
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
 'advertisers',(select count(*) from public.advertisers where deleted_at is null),
 'active',(select count(*) from public.ad_creatives c join public.advertisers a on a.id=c.advertiser_id where c.deleted_at is null and a.deleted_at is null and c.enabled and a.enabled),
 'inactive',(select count(*) from public.ad_creatives where deleted_at is null and not enabled),
 'pending',(select count(*) from public.ad_creatives where deleted_at is null and media_id is null),
 'impressions',coalesce((select sum(impressions) from public.ad_daily_stats where day>=current_date-29),0),
 'clicks',coalesce((select sum(clicks) from public.ad_daily_stats where day>=current_date-29),0));
$$;
create function public.ad_admin_advertisers(p_offset integer,p_limit integer,p_search text default '')
returns jsonb language sql stable security invoker set search_path=public as $$
 with filtered as(select * from public.advertisers where deleted_at is null and (display_name ilike '%'||p_search||'%' or internal_name ilike '%'||p_search||'%')),
 page as(select * from filtered order by created_at,id offset greatest(p_offset,0) limit least(greatest(p_limit,1),50))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (
 select p.*, (select count(*) from public.ad_creatives c where c.advertiser_id=p.id and c.deleted_at is null) creative_count,
 (select count(*) from public.ad_creatives c where c.advertiser_id=p.id and c.deleted_at is null and c.media_id is null) pending_count,
 (select m.path from public.ad_creatives c join public.ad_media m on m.id=c.media_id where c.advertiser_id=p.id and c.deleted_at is null order by c.created_at limit 1) thumbnail_path,
 coalesce((select sum(s.impressions) from public.ad_daily_stats s join public.ad_creatives c on c.id=s.creative_id where c.advertiser_id=p.id and s.day>=current_date-29),0) impressions,
 coalesce((select sum(s.clicks) from public.ad_daily_stats s join public.ad_creatives c on c.id=s.creative_id where c.advertiser_id=p.id and s.day>=current_date-29),0) clicks
 from page p) x),'[]'::jsonb));
$$;
create function public.ad_admin_creatives(p_advertiser uuid,p_offset integer,p_limit integer)
returns jsonb language sql stable security invoker set search_path=public as $$
 with filtered as(select * from public.ad_creatives where advertiser_id=p_advertiser and deleted_at is null),
 page as(select * from filtered order by created_at,id offset greatest(p_offset,0) limit least(greatest(p_limit,1),50))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (
 select p.*,m.path,m.width,m.height,
 coalesce((select sum(impressions) from public.ad_daily_stats where creative_id=p.id and day>=current_date-29),0) impressions,
 coalesce((select sum(clicks) from public.ad_daily_stats where creative_id=p.id and day>=current_date-29),0) clicks
 from page p left join public.ad_media m on m.id=p.media_id) x),'[]'::jsonb));
$$;
revoke all on function public.ad_save_creative(uuid,uuid,jsonb,boolean,boolean),public.ad_remove(uuid,uuid),public.ad_claim_unused_media(uuid),public.ad_record_event(uuid,uuid,text),public.ad_admin_summary(),public.ad_admin_advertisers(integer,integer,text),public.ad_admin_creatives(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.ad_save_creative(uuid,uuid,jsonb,boolean,boolean),public.ad_remove(uuid,uuid),public.ad_claim_unused_media(uuid),public.ad_record_event(uuid,uuid,text),public.ad_admin_summary(),public.ad_admin_advertisers(integer,integer,text),public.ad_admin_creatives(uuid,integer,integer) to service_role;

with seeds(seed_key,display_name,internal_name,title,description,target_url) as(values
 ('gk-games','G&K Games','G&K Games','G&K Games','Conheça a G&K Games e acompanhe suas novidades, produtos e ofertas pelo Instagram.','https://www.instagram.com/gkgamesevariedades/'),
 ('otica-portela','Ótica Portela','Ótica Portela','Ótica Portela','Sua visão merece o melhor. Conheça a Ótica Portela e acompanhe suas novidades pelo Instagram.','https://www.instagram.com/oticaportelapombal.ba/'),
 ('sabino','Antônio Sabino — Material de Construção','Antônio Sabino — Material de Construção','Antônio Sabino — Material de Construção','Conheça a Antônio Sabino Material de Construção e acompanhe as novidades da loja pelo Instagram.','https://www.instagram.com/sabino_material_construcao/'),
 ('desenvolvimento-web','Desenvolvimento Web','Enzo Albernaz | Desenvolvedor Web','Precisando de um site?','Sites modernos, rápidos e personalizados para destacar seu negócio na internet.','https://albr-agency.pages.dev/')),
 inserted as(insert into public.advertisers(seed_key,display_name,internal_name,target_url) select seed_key,display_name,internal_name,target_url from seeds returning id,seed_key)
 insert into public.ad_creatives(advertiser_id,title,description,target_url) select i.id,s.title,s.description,s.target_url from inserted i join seeds s using(seed_key);

create function public.ad_media_usage(p_ids uuid[]) returns table(id uuid,used boolean) language sql stable security invoker set search_path=public as $$
 select m.id,exists(select 1 from public.ad_creatives c where c.media_id=m.id and c.deleted_at is null) from public.ad_media m where m.id=any(p_ids);
$$;
revoke all on function public.ad_media_usage(uuid[]) from public,anon,authenticated;
grant execute on function public.ad_media_usage(uuid[]) to service_role;
