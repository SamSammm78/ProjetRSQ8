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
