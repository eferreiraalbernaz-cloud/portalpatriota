-- Portal Patriota BR — initial schema. Run once in Supabase SQL Editor or with Supabase CLI.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.portal_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'PORTAL PATRIOTA BR',
  logo_url text not null default '/brand/portal-patriota-br.png',
  instagram_url text not null default 'https://www.instagram.com/portalpatriota_br/',
  facebook_url text not null default '',
  youtube_url text not null default '',
  albr_contact_url text not null default '',
  institutional_text text not null default 'Informação com responsabilidade para acompanhar o Brasil.',
  writing_mode text not null default 'medium' check (writing_mode in ('short','medium','long','off')),
  auto_publish boolean not null default false,
  sync_paused boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.portal_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null check (category in ('POLÍTICA','BRASIL','SEGURANÇA','ESPORTES','SAÚDE')),
  category_slug text generated always as (
    case category
      when 'POLÍTICA' then 'politica'
      when 'BRASIL' then 'brasil'
      when 'SEGURANÇA' then 'seguranca'
      when 'ESPORTES' then 'esportes'
      when 'SAÚDE' then 'saude'
    end
  ) stored,
  title text not null check (char_length(title) between 5 and 180),
  subtitle text,
  body text not null default '',
  image_url text,
  status text not null default 'pending' check (status in ('draft','pending','published','scheduled','archived')),
  highlighted boolean not null default false,
  needs_review boolean not null default true,
  review_reason text,
  sources jsonb not null default '[]'::jsonb,
  ai_status text not null default 'queued' check (ai_status in ('queued','processing','completed','skipped','failed')),
  ai_confidence numeric(4,3),
  instagram_url text,
  instagram_media_id text unique,
  original_caption text,
  original_published_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  scheduled_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_publication_idx on public.articles (status, published_at desc);
create index if not exists articles_category_idx on public.articles (category, published_at desc);
create index if not exists articles_highlighted_idx on public.articles (highlighted, published_at desc) where status = 'published';

create table if not exists public.instagram_integrations (
  id integer primary key default 1 check (id = 1),
  ig_user_id text not null,
  username text not null,
  token_ciphertext text not null,
  token_iv text not null,
  token_auth_tag text not null,
  token_expires_at timestamptz,
  last_refresh_attempt_at timestamptz,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text,
  status text not null default 'connected' check (status in ('connected','reauthorization_required','error')),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('instagram_sync','publish_scheduled','article_processing','manual_sync')),
  status text not null check (status in ('running','success','partial','failed','skipped')),
  imported_count integer not null default 0,
  published_count integer not null default 0,
  message text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists automation_runs_started_idx on public.automation_runs (started_at desc);

create table if not exists public.article_processing_logs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  stage text not null,
  status text not null check (status in ('success','warning','failed')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists article_processing_logs_created_idx on public.article_processing_logs (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portal_settings_updated_at on public.portal_settings;
create trigger portal_settings_updated_at before update on public.portal_settings
for each row execute function public.set_updated_at();
drop trigger if exists articles_updated_at on public.articles;
create trigger articles_updated_at before update on public.articles
for each row execute function public.set_updated_at();
drop trigger if exists instagram_integrations_updated_at on public.instagram_integrations;
create trigger instagram_integrations_updated_at before update on public.instagram_integrations
for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.portal_settings enable row level security;
alter table public.articles enable row level security;
alter table public.instagram_integrations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.article_processing_logs enable row level security;

revoke all on public.admin_users, public.portal_settings, public.articles,
  public.instagram_integrations, public.automation_runs, public.article_processing_logs
  from public, anon, authenticated;
grant all on public.admin_users, public.portal_settings, public.articles,
  public.instagram_integrations, public.automation_runs, public.article_processing_logs
  to service_role;
grant select on public.admin_users to authenticated;
grant select (site_name,logo_url,instagram_url,facebook_url,youtube_url,albr_contact_url,institutional_text) on public.portal_settings to anon, authenticated;
grant select (id,slug,category,category_slug,title,subtitle,body,image_url,status,highlighted,sources,instagram_url,original_caption,published_at,created_at,updated_at) on public.articles to anon, authenticated;

drop policy if exists "admins can read their own membership" on public.admin_users;
create policy "admins can read their own membership" on public.admin_users
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "public can read portal settings" on public.portal_settings;
create policy "public can read portal settings" on public.portal_settings
for select to anon, authenticated using (true);
drop policy if exists "admins can manage portal settings" on public.portal_settings;
create policy "admins can manage portal settings" on public.portal_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public can read published articles" on public.articles;
create policy "public can read published articles" on public.articles
for select to anon, authenticated using (status = 'published');
drop policy if exists "admins can manage all articles" on public.articles;
create policy "admins can manage all articles" on public.articles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Secrets and operational logs are never directly exposed through the Data API.
revoke all on public.instagram_integrations, public.automation_runs, public.article_processing_logs from anon, authenticated;
revoke insert, update, delete on public.articles from anon, authenticated;
revoke insert, update, delete on public.portal_settings from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-media', 'portal-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
