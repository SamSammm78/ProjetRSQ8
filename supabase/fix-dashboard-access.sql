-- Run this once in the Supabase SQL editor if the app returns empty shops/transactions.
-- It converts the database from the old account/RLS setup to the current dashboard setup.

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "profiles are private" on public.profiles';
  end if;

  if to_regclass('public.shops') is not null then
    execute 'drop policy if exists "shops are private" on public.shops';
  end if;

  if to_regclass('public.transactions') is not null then
    execute 'drop policy if exists "transactions are private" on public.transactions';
  end if;
end $$;

alter table if exists public.profiles disable row level security;
alter table if exists public.shops disable row level security;
alter table if exists public.transactions disable row level security;

alter table if exists public.shops drop column if exists user_id;
alter table if exists public.transactions drop column if exists user_id;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.shops to anon, authenticated;
grant select, insert, update, delete on public.transactions to anon, authenticated;
