create extension if not exists "pgcrypto";

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  date date not null,
  month date not null,
  order_number text not null default '',
  status text not null default 'paid',
  gross_revenue numeric(12, 2) not null default 0,
  refunds numeric(12, 2) not null default 0,
  etsy_fees numeric(12, 2) not null default 0,
  etsy_ads numeric(12, 2) not null default 0,
  product_cost numeric(12, 2) not null default 0,
  shipping_paid numeric(12, 2) not null default 0,
  other_fees numeric(12, 2) not null default 0,
  refund_type text,
  refund_amount numeric(12, 2) not null default 0,
  refunded_at timestamp with time zone,
  product_cost_recovered boolean not null default false,
  etsy_fees_refunded numeric(12, 2) not null default 0,
  net_revenue numeric(12, 2) generated always as (
    gross_revenue
    - refund_amount
    - etsy_fees
    - etsy_ads
  ) stored,
  net_profit numeric(12, 2) generated always as (
    gross_revenue
    - refund_amount
    - greatest(
        0,
      etsy_fees - etsy_fees_refunded
      )
    - etsy_ads
    - case when product_cost_recovered then 0 else product_cost end
    - shipping_paid
    - other_fees
  ) stored,
  margin numeric(8, 4) generated always as (
    case
      when gross_revenue > 0
      then (
        gross_revenue
        - refund_amount
        - greatest(
            0,
          etsy_fees - etsy_fees_refunded
          )
        - etsy_ads
        - case when product_cost_recovered then 0 else product_cost end
        - shipping_paid
        - other_fees
      ) / gross_revenue
      else 0
    end
  ) stored,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, order_number)
);

create index if not exists transactions_date_idx on public.transactions(date);
create index if not exists transactions_shop_idx on public.transactions(shop_id);

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

alter table if exists public.shops disable row level security;
alter table if exists public.transactions disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.shops to anon, authenticated;
grant select, insert, update, delete on public.transactions to anon, authenticated;

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  platform text not null default '',
  account_used text not null default '',
  order_date date not null,
  order_number text not null default '',
  total_amount numeric(12, 2) not null default 0,
  order_link text not null default '',
  country text not null default '',
  notes text not null default '',
  status text not null default 'active',
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.supplier_orders
add column if not exists status text default 'active';

alter table public.supplier_orders
add column if not exists completed_at timestamp with time zone;

create index if not exists supplier_orders_status_order_date_idx
on public.supplier_orders(status, order_date);

alter table if exists public.supplier_orders disable row level security;

grant select, insert, update, delete on public.supplier_orders to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('supplier-orders', 'supplier-orders', true)
on conflict (id) do update set public = true;

create table if not exists public.supplier_order_images (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.supplier_orders(id) on delete cascade,
  image_url text not null,
  file_name text,
  storage_path text,
  created_at timestamp with time zone default now()
);

alter table public.supplier_order_images
add column if not exists storage_path text;

create index if not exists supplier_order_images_order_id_idx
on public.supplier_order_images(order_id);

alter table if exists public.supplier_order_images disable row level security;

grant select, insert, update, delete on public.supplier_order_images to anon, authenticated;

drop policy if exists "supplier order images are readable" on storage.objects;
drop policy if exists "supplier order images are insertable" on storage.objects;
drop policy if exists "supplier order images are updatable" on storage.objects;
drop policy if exists "supplier order images are deletable" on storage.objects;

create policy "supplier order images are readable"
on storage.objects for select
using (bucket_id = 'supplier-orders');

create policy "supplier order images are insertable"
on storage.objects for insert
with check (bucket_id = 'supplier-orders');

create policy "supplier order images are updatable"
on storage.objects for update
using (bucket_id = 'supplier-orders')
with check (bucket_id = 'supplier-orders');

create policy "supplier order images are deletable"
on storage.objects for delete
using (bucket_id = 'supplier-orders');

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
