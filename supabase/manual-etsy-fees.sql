update public.transactions
set etsy_fees = coalesce(
  nullif(etsy_fees, 0),
  actual_etsy_fees,
  estimated_etsy_fees,
  0
)
where etsy_fees = 0;

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
      - greatest(0, etsy_fees - etsy_fees_refunded)
      - etsy_ads
      - case when product_cost_recovered then 0 else product_cost end
      - shipping_paid
      - other_fees
    ) / gross_revenue
    else 0
  end
) stored;

alter table public.shops
drop column if exists fee_calculation_mode,
drop column if exists estimated_fee_percentage,
drop column if exists estimated_fixed_fee;
