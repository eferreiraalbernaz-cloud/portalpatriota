-- Provider credentials are encrypted by the application before being written here.
-- This table is only reachable by the backend service role.
create table if not exists public.provider_config (
  id integer primary key default 1 check (id = 1),
  meta_app_id text,
  meta_app_secret_ciphertext text,
  meta_app_secret_iv text,
  meta_app_secret_tag text,
  openai_api_key_ciphertext text,
  openai_api_key_iv text,
  openai_api_key_tag text,
  openai_model text not null default 'gpt-5-mini',
  updated_at timestamptz not null default now(),
  constraint meta_secret_fields_complete check (
    (meta_app_secret_ciphertext is null and meta_app_secret_iv is null and meta_app_secret_tag is null)
    or (meta_app_secret_ciphertext is not null and meta_app_secret_iv is not null and meta_app_secret_tag is not null)
  ),
  constraint openai_secret_fields_complete check (
    (openai_api_key_ciphertext is null and openai_api_key_iv is null and openai_api_key_tag is null)
    or (openai_api_key_ciphertext is not null and openai_api_key_iv is not null and openai_api_key_tag is not null)
  )
);

drop trigger if exists provider_config_updated_at on public.provider_config;
create trigger provider_config_updated_at before update on public.provider_config
for each row execute function public.set_updated_at();

alter table public.provider_config enable row level security;
revoke all on public.provider_config from public, anon, authenticated;
grant all on public.provider_config to service_role;
