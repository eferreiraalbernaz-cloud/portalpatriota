-- Extend categories without changing existing article URLs or permissions.
alter table public.articles drop constraint articles_category_check;
alter table public.articles add constraint articles_category_check check (category in ('POLÍTICA','BRASIL','SEGURANÇA','ESPORTES','SAÚDE','RIBEIRA DO POMBAL','BAHIA'));
alter table public.articles alter column category_slug set expression as (
  case category
    when 'POLÍTICA' then 'politica'
    when 'BRASIL' then 'brasil'
    when 'SEGURANÇA' then 'seguranca'
    when 'ESPORTES' then 'esportes'
    when 'SAÚDE' then 'saude'
    when 'RIBEIRA DO POMBAL' then 'ribeira-do-pombal'
    when 'BAHIA' then 'bahia'
  end
);
analyze public.articles;
