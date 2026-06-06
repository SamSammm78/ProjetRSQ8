do $$
declare
  lana uuid := gen_random_uuid();
  luxurium uuid := gen_random_uuid();
  oak uuid := gen_random_uuid();
  sequoia uuid := gen_random_uuid();
begin
  insert into public.shops (id, name, active)
  values
    (lana, 'LanaArtsCo', true),
    (luxurium, 'LuxuriumArts', true),
    (oak, 'OakLivings', true),
    (sequoia, 'SequoiaInteriors', true)
  on conflict do nothing;

  insert into public.transactions (
    shop_id, date, month, order_number, status, gross_revenue, refunds,
    etsy_fees, etsy_ads, product_cost, shipping_paid, other_fees, notes
  )
  values
    (sequoia, '2026-06-06', '2026-06-01', '4079480146', 'Payee', 255.32, 0, 33.97, 0, 83, 0, 0, ''),
    (sequoia, '2026-06-04', '2026-06-01', '4082071229', 'Payee', 229.59, 0, 30.58, 0, 80.39, 0, 0, ''),
    (sequoia, '2026-06-06', '2026-06-01', '4083802925', 'Payee', 234.60, 0, 31.24, 0, 60, 0, 0, ''),
    (oak, '2026-06-06', '2026-06-01', '4083437509', 'Payee', 216.76, 0, 28.89, 0, 53, 0, 0, ''),
    (luxurium, '2026-06-01', '2026-06-01', '', 'Payee', 183.24, 0, 30.79, 0, 83, 0, 0, ''),
    (lana, '2026-06-01', '2026-06-01', '', 'Payee', 570.61, 0, 82.47, 0, 259, 0, 0, '')
  on conflict do nothing;
end $$;
