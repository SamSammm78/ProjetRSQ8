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
