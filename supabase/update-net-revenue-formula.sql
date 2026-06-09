alter table public.transactions
drop column if exists margin,
drop column if exists net_profit,
drop column if exists net_revenue;

alter table public.transactions
add column net_revenue numeric(12, 2) generated always as (
  gross_revenue - etsy_fees - etsy_ads
) stored,
add column net_profit numeric(12, 2) generated always as (
  gross_revenue - refunds - etsy_fees - etsy_ads - product_cost - shipping_paid - other_fees
) stored,
add column margin numeric(8, 4) generated always as (
  case
    when (gross_revenue - etsy_fees - etsy_ads) > 0
    then (
      gross_revenue - refunds - etsy_fees - etsy_ads - product_cost - shipping_paid - other_fees
    ) / (gross_revenue - etsy_fees - etsy_ads)
    else 0
  end
) stored;
