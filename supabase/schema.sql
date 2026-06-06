create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  date date not null,
  month date not null,
  order_number text not null default '',
  status text not null default 'Payee',
  gross_revenue numeric(12, 2) not null default 0,
  refunds numeric(12, 2) not null default 0,
  etsy_fees numeric(12, 2) not null default 0,
  etsy_ads numeric(12, 2) not null default 0,
  product_cost numeric(12, 2) not null default 0,
  shipping_paid numeric(12, 2) not null default 0,
  other_fees numeric(12, 2) not null default 0,
  net_revenue numeric(12, 2) generated always as (gross_revenue - refunds) stored,
  net_profit numeric(12, 2) generated always as (
    gross_revenue - refunds - etsy_fees - etsy_ads - product_cost - shipping_paid - other_fees
  ) stored,
  margin numeric(8, 4) generated always as (
    case
      when (gross_revenue - refunds) > 0
      then (
        gross_revenue - refunds - etsy_fees - etsy_ads - product_cost - shipping_paid - other_fees
      ) / (gross_revenue - refunds)
      else 0
    end
  ) stored,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, order_number)
);

create index if not exists shops_user_id_idx on public.shops(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date);
create index if not exists transactions_user_shop_idx on public.transactions(user_id, shop_id);

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.transactions enable row level security;

create policy "profiles are private"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "shops are private"
on public.shops
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "transactions are private"
on public.transactions
for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.shops
    where shops.id = transactions.shop_id
      and shops.user_id = auth.uid()
  )
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shops_touch_updated_at on public.shops;
create trigger shops_touch_updated_at
before update on public.shops
for each row execute function public.touch_updated_at();

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
before update on public.transactions
for each row execute function public.touch_updated_at();
