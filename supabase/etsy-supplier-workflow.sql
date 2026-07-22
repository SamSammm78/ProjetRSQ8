-- ProjetRSQ8: relation vente Etsy -> dossier fournisseur AliExpress.
-- Migration additive et idempotente. A executer apres schema.sql.

alter table public.transactions
  add column if not exists refund_type text,
  add column if not exists refund_amount numeric(12, 2) not null default 0,
  add column if not exists refunded_at timestamptz,
  add column if not exists product_cost_recovered boolean not null default false,
  add column if not exists etsy_fees_refunded numeric(12, 2) not null default 0,
  add column if not exists actual_supplier_cost numeric(12, 2),
  add column if not exists supplier_refund_amount numeric(12, 2) not null default 0,
  add column if not exists refund_reason text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_actual_supplier_cost_non_negative') then
    alter table public.transactions add constraint transactions_actual_supplier_cost_non_negative
      check (actual_supplier_cost is null or actual_supplier_cost >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_supplier_refund_non_negative') then
    alter table public.transactions add constraint transactions_supplier_refund_non_negative
      check (supplier_refund_amount >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_customer_refund_limit') then
    alter table public.transactions add constraint transactions_customer_refund_limit
      check (refund_amount >= 0 and refund_amount <= gross_revenue) not valid;
  end if;
end $$;

alter table public.transactions
  drop column if exists net_profit,
  drop column if exists net_revenue,
  drop column if exists margin;

alter table public.transactions
  add column net_revenue numeric(12, 2) generated always as (
    gross_revenue - refund_amount - etsy_fees - etsy_ads
  ) stored,
  add column net_profit numeric(12, 2) generated always as (
    gross_revenue
    - refund_amount
    - greatest(0, etsy_fees - etsy_fees_refunded)
    - etsy_ads
    - coalesce(actual_supplier_cost, product_cost)
    + supplier_refund_amount
    - shipping_paid
    - other_fees
  ) stored,
  add column margin numeric(8, 4) generated always as (
    case when gross_revenue > 0 then (
      gross_revenue
      - refund_amount
      - greatest(0, etsy_fees - etsy_fees_refunded)
      - etsy_ads
      - coalesce(actual_supplier_cost, product_cost)
      + supplier_refund_amount
      - shipping_paid
      - other_fees
    ) / gross_revenue else 0 end
  ) stored;

create table if not exists public.supplier_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null default 'aliexpress',
  email text not null default '',
  card_label text not null default '',
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null,
  shop_id uuid references public.shops(id) on delete set null,
  supplier_url text not null,
  usual_cost numeric(12, 2),
  supplier_name text not null default 'AliExpress',
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_products_usual_cost_non_negative
    check (usual_cost is null or usual_cost >= 0)
);

alter table public.supplier_orders
  add column if not exists transaction_id uuid references public.transactions(id) on delete cascade,
  add column if not exists shop_id uuid references public.shops(id) on delete set null,
  add column if not exists etsy_order_number text not null default '',
  add column if not exists sale_date date,
  add column if not exists logistics_status text not null default 'to_order',
  add column if not exists financial_status text not null default 'paid',
  add column if not exists supplier_account_id uuid references public.supplier_accounts(id) on delete set null,
  add column if not exists supplier_product_id uuid references public.supplier_products(id) on delete set null,
  add column if not exists supplier_url text not null default '',
  add column if not exists supplier_order_number text not null default '',
  add column if not exists estimated_product_cost numeric(12, 2) not null default 0,
  add column if not exists actual_supplier_cost numeric(12, 2),
  add column if not exists supplier_shipping numeric(12, 2) not null default 0,
  add column if not exists supplier_currency text not null default 'EUR',
  add column if not exists ordered_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists estimated_delivery_at date,
  add column if not exists delivered_at timestamptz,
  add column if not exists tracking_number text not null default '',
  add column if not exists carrier text not null default '',
  add column if not exists is_standalone boolean not null default true;

update public.supplier_orders
set logistics_status = case
  when status = 'completed' then 'delivered'
  when status = 'cancelled' then 'cancelled'
  when coalesce(order_number, '') <> '' then 'ordered'
  else 'to_order'
end
where transaction_id is null;

create unique index if not exists supplier_orders_transaction_unique_idx
  on public.supplier_orders(transaction_id) where transaction_id is not null;
create index if not exists supplier_orders_logistics_idx
  on public.supplier_orders(logistics_status, sale_date desc);
create index if not exists supplier_orders_account_idx
  on public.supplier_orders(supplier_account_id);

create table if not exists public.supplier_order_problems (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supplier_orders(id) on delete cascade,
  type text not null,
  description text not null default '',
  urgency text not null default 'normal',
  next_action text not null default '',
  reminder_at timestamptz,
  previous_status text not null default 'ordered',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_order_problems_active_idx
  on public.supplier_order_problems(order_id, reminder_at)
  where resolved_at is null;

create table if not exists public.supplier_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supplier_orders(id) on delete cascade,
  event_key text,
  type text not null,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists supplier_order_events_key_unique_idx
  on public.supplier_order_events(order_id, event_key)
  where event_key is not null;
create index if not exists supplier_order_events_order_idx
  on public.supplier_order_events(order_id, created_at desc);

create table if not exists public.app_settings (
  id text primary key default 'default',
  supplier_order_alert_hours integer not null default 12,
  supplier_shipping_alert_days integer not null default 5,
  delivery_late_alert_days integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint app_settings_non_negative check (
    supplier_order_alert_hours >= 0 and
    supplier_shipping_alert_days >= 0 and
    delivery_late_alert_days >= 0
  )
);

insert into public.app_settings (id) values ('default') on conflict (id) do nothing;

-- Relie uniquement les anciennes commandes dont le numero correspond a une seule vente.
with unique_matches as (
  select so.id as order_id, min(t.id::text)::uuid as transaction_id
  from public.supplier_orders so
  join public.transactions t on t.order_number = so.order_number
  where so.transaction_id is null and coalesce(so.order_number, '') <> ''
  group by so.id
  having count(*) = 1
)
update public.supplier_orders so
set transaction_id = match.transaction_id,
    shop_id = t.shop_id,
    etsy_order_number = t.order_number,
    sale_date = t.date,
    financial_status = t.status,
    estimated_product_cost = t.product_cost,
    is_standalone = false
from unique_matches match
join public.transactions t on t.id = match.transaction_id
where so.id = match.order_id
  and not exists (
    select 1 from public.supplier_orders existing
    where existing.transaction_id = match.transaction_id
  );

create or replace function public.create_supplier_order_for_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
begin
  insert into public.supplier_orders (
    transaction_id, shop_id, etsy_order_number, sale_date,
    order_date, platform, logistics_status, financial_status,
    estimated_product_cost, total_amount, status, is_standalone
  ) values (
    new.id, new.shop_id, new.order_number, new.date,
    new.date, 'AliExpress', 'to_order', new.status,
    new.product_cost, new.product_cost, 'active', false
  )
  on conflict (transaction_id) where transaction_id is not null do nothing
  returning id into new_order_id;

  if new_order_id is not null then
    insert into public.supplier_order_events (order_id, event_key, type, title)
    values (new_order_id, 'sale-created', 'sale_created', 'Vente creee')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_create_supplier_order on public.transactions;
create trigger transactions_create_supplier_order
after insert on public.transactions
for each row execute function public.create_supplier_order_for_transaction();

-- Cree un dossier pour chaque transaction historique qui n'en possede pas encore.
insert into public.supplier_orders (
  transaction_id, shop_id, etsy_order_number, sale_date, order_date,
  platform, logistics_status, financial_status, estimated_product_cost,
  total_amount, status, is_standalone
)
select
  t.id, t.shop_id, t.order_number, t.date, t.date,
  'AliExpress', 'to_order', t.status, t.product_cost,
  t.product_cost, 'active', false
from public.transactions t
where not exists (
  select 1 from public.supplier_orders so where so.transaction_id = t.id
)
on conflict (transaction_id) where transaction_id is not null do nothing;

insert into public.supplier_order_events (order_id, event_key, type, title, created_at)
select so.id, 'sale-created', 'sale_created', 'Vente creee', coalesce(t.created_at, now())
from public.supplier_orders so
join public.transactions t on t.id = so.transaction_id
on conflict do nothing;

create or replace function public.sync_supplier_cost_to_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.transaction_id is not null then
    update public.transactions
    set actual_supplier_cost = new.actual_supplier_cost,
        shipping_paid = new.supplier_shipping,
        updated_at = now()
    where id = new.transaction_id;
  end if;
  return new;
end;
$$;

drop trigger if exists supplier_orders_sync_cost on public.supplier_orders;
create trigger supplier_orders_sync_cost
after update of actual_supplier_cost, supplier_shipping on public.supplier_orders
for each row execute function public.sync_supplier_cost_to_transaction();

alter table public.supplier_accounts disable row level security;
alter table public.supplier_products disable row level security;
alter table public.supplier_order_problems disable row level security;
alter table public.supplier_order_events disable row level security;
alter table public.app_settings disable row level security;

grant select, insert, update, delete on public.supplier_accounts to anon, authenticated;
grant select, insert, update, delete on public.supplier_products to anon, authenticated;
grant select, insert, update, delete on public.supplier_order_problems to anon, authenticated;
grant select, insert, update, delete on public.supplier_order_events to anon, authenticated;
grant select, insert, update on public.app_settings to anon, authenticated;
