-- Replace this value with the auth.users id of your demo account before running.
do $$
declare
  demo_user uuid := '00000000-0000-0000-0000-000000000000';
  lana uuid := gen_random_uuid();
  luxurium uuid := gen_random_uuid();
  oak uuid := gen_random_uuid();
  sequoia uuid := gen_random_uuid();
begin
  insert into public.shops (id, user_id, name, active)
  values
    (lana, demo_user, 'LanaArtsCo', true),
    (luxurium, demo_user, 'LuxuriumArts', true),
    (oak, demo_user, 'OakLivings', true),
    (sequoia, demo_user, 'SequoiaInteriors', true)
  on conflict do nothing;

  insert into public.transactions (
    user_id, shop_id, date, month, order_number, status, gross_revenue, refunds,
    etsy_fees, etsy_ads, product_cost, shipping_paid, other_fees, notes
  )
  values
    (demo_user, sequoia, '2026-06-06', '2026-06-01', '4079480146', 'Payee', 255.32, 0, 33.97, 0, 83, 0, 0, ''),
    (demo_user, sequoia, '2026-06-04', '2026-06-01', '4082071229', 'Payee', 229.59, 0, 30.58, 0, 80.39, 0, 0, ''),
    (demo_user, sequoia, '2026-06-06', '2026-06-01', '4083802925', 'Payee', 234.60, 0, 31.24, 0, 60, 0, 0, ''),
    (demo_user, oak, '2026-06-06', '2026-06-01', '4083437509', 'Payee', 216.76, 0, 28.89, 0, 53, 0, 0, ''),
    (demo_user, luxurium, '2026-06-01', '2026-06-01', '', 'Payee', 183.24, 0, 30.79, 0, 83, 0, 0, ''),
    (demo_user, lana, '2026-06-01', '2026-06-01', '', 'Payee', 570.61, 0, 82.47, 0, 259, 0, 0, '')
  on conflict do nothing;
end $$;
