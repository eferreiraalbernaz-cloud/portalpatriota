-- Staging only: there is no approved In-Page Push tag yet.
-- Never infer the format from the supplied Service Worker zone 12194090.
create table public.monetization_config (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  format text not null default 'in_page_push' check (format = 'in_page_push'),
  zone_id text check (zone_id ~ '^[1-9][0-9]{0,19}$'),
  updated_at timestamptz not null default now(),
  constraint monetag_requires_reviewed_ipp_tag check (enabled = false)
);

create trigger monetization_config_updated_at before update on public.monetization_config
for each row execute function public.set_updated_at();

alter table public.monetization_config enable row level security;
revoke all on public.monetization_config from public, anon, authenticated;
grant select, insert, update on public.monetization_config to service_role;

insert into public.monetization_config (id, enabled) values (1, false);
