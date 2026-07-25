-- ProjetRSQ8: finalisation manuelle et rapprochement des versements Etsy.
-- Migration additive, compatible avec les dossiers existants.

alter table public.supplier_orders
  add column if not exists is_finalized boolean not null default false,
  add column if not exists finalized_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'supplier_orders_finalization_consistent') then
    alter table public.supplier_orders
      add constraint supplier_orders_finalization_consistent
      check (
        (not is_finalized and finalized_at is null)
        or (is_finalized and finalized_at is not null and transaction_id is not null)
      ) not valid;
  end if;
end $$;

create index if not exists supplier_orders_finalized_idx
  on public.supplier_orders(is_finalized, finalized_at desc)
  where is_finalized = true;

create table if not exists public.etsy_payouts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  amount numeric(12, 2) not null,
  payout_date date not null,
  reference text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint etsy_payouts_amount_positive check (amount > 0)
);

create index if not exists etsy_payouts_date_shop_idx
  on public.etsy_payouts(payout_date desc, shop_id);

drop trigger if exists etsy_payouts_touch_updated_at on public.etsy_payouts;
create trigger etsy_payouts_touch_updated_at
before update on public.etsy_payouts
for each row execute function public.touch_updated_at();

alter table public.etsy_payouts disable row level security;
grant select, insert, update, delete on public.etsy_payouts to anon, authenticated;
