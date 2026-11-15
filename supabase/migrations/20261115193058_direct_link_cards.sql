create table public.advertising_creative (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  image_url text not null default '' check (length(image_url) <= 2048),
  title text not null default '' check (length(title) <= 100),
  description text not null default '' check (length(description) <= 240),
  target_url text not null default 'https://uplcm.com/4/12272346'
    check (length(target_url) <= 2048 and target_url ~ '^https://uplcm[.]com/4/[1-9][0-9]*([?][^#]*)?$'),
  review_confirmed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint advertising_creative_complete_when_enabled check (
    not enabled or (review_confirmed and length(btrim(title)) >= 3 and length(btrim(description)) >= 10 and length(btrim(image_url)) > 0)
  )
);
create trigger advertising_creative_updated_at before update on public.advertising_creative
for each row execute function public.set_updated_at();
alter table public.advertising_creative enable row level security;
revoke all on public.advertising_creative from public, anon, authenticated;
grant select on public.advertising_creative to anon, authenticated;
grant select, insert, update on public.advertising_creative to service_role;
create policy "public can read enabled reviewed creative" on public.advertising_creative
for select to anon, authenticated using (enabled and review_confirmed);
insert into public.advertising_creative (id) values (1);
