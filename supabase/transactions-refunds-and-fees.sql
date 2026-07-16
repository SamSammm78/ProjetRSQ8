alter table public.shops
add column if not exists fee_calculation_mode text not null default 'automatic',
add column if not exists estimated_fee_percentage numeric(6, 2) not null default 11,
add column if not exists estimated_fixed_fee numeric(12, 2) not null default 0.30;

alter table public.transactions
add column if not exists estimated_etsy_fees numeric(12, 2) not null default 0,
add column if not exists actual_etsy_fees numeric(12, 2),
add column if not exists fees_status text not null default 'estimated',
add column if not exists refund_type text,
add column if not exists refund_amount numeric(12, 2) not null default 0,
add column if not exists refunded_at timestamp with time zone,
add column if not exists product_cost_recovered boolean not null default false,
add column if not exists etsy_fees_refunded numeric(12, 2) not null default 0;

alter table public.transactions
alter column status set default 'paid';

update public.transactions
set
  status = case when status = 'refunded' then 'refunded' else 'paid' end,
  estimated_etsy_fees = case when estimated_etsy_fees = 0 then etsy_fees else estimated_etsy_fees end,
  refund_amount = case when refund_amount = 0 then refunds else refund_amount end
where status is distinct from 'paid'
  or estimated_etsy_fees = 0
  or refund_amount = 0;

alter table public.transactions
drop column if exists net_profit,
drop column if exists net_revenue,
drop column if exists margin;

alter table public.transactions
add column net_revenue numeric(12, 2) generated always as (
  gross_revenue
  - refund_amount
  - case
      when fees_status = 'confirmed' then coalesce(actual_etsy_fees, etsy_fees)
      else coalesce(nullif(estimated_etsy_fees, 0), etsy_fees)
    end
  - etsy_ads
) stored,
add column net_profit numeric(12, 2) generated always as (
  gross_revenue
  - refund_amount
  - greatest(
      0,
      case
        when fees_status = 'confirmed' then coalesce(actual_etsy_fees, etsy_fees)
        else coalesce(nullif(estimated_etsy_fees, 0), etsy_fees)
      end - etsy_fees_refunded
    )
  - etsy_ads
  - case when product_cost_recovered then 0 else product_cost end
  - shipping_paid
  - other_fees
) stored,
add column margin numeric(8, 4) generated always as (
  case
    when gross_revenue > 0
    then (
      gross_revenue
      - refund_amount
      - greatest(
          0,
          case
            when fees_status = 'confirmed' then coalesce(actual_etsy_fees, etsy_fees)
            else coalesce(nullif(estimated_etsy_fees, 0), etsy_fees)
          end - etsy_fees_refunded
        )
      - etsy_ads
      - case when product_cost_recovered then 0 else product_cost end
      - shipping_paid
      - other_fees
    ) / gross_revenue
    else 0
  end
) stored;

create unique index if not exists transactions_shop_order_unique_idx
on public.transactions(shop_id, order_number);
