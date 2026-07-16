"use client";

import { seedShops, seedTransactions } from "@/data/seed";
import { calculateTransactionMetrics } from "@/lib/calculations";
import type {
  RefundType,
  Shop,
  Transaction,
  TransactionInput,
  TransactionStatus,
  TransactionUpdateInput
} from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

type ShopRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type TransactionRow = {
  id: string;
  shop_id: string;
  date: string;
  month: string;
  order_number: string;
  status: string;
  gross_revenue: number;
  refunds: number;
  etsy_fees?: number | string | null;
  etsy_ads: number;
  product_cost: number;
  shipping_paid: number;
  other_fees: number;
  net_revenue: number;
  net_profit: number;
  margin: number;
  notes: string;
  estimated_etsy_fees?: number | string | null;
  actual_etsy_fees?: number | string | null;
  fees_status?: string | null;
  refund_type?: string | null;
  refund_amount?: number | string | null;
  refunded_at?: string | null;
  product_cost_recovered?: boolean | null;
  etsy_fees_refunded?: number | string | null;
  created_at: string;
  updated_at: string;
};

function asNumber(value: number | string | null | undefined, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return Number(value) || fallback;
}

function normalizeStatus(status: string | null | undefined): TransactionStatus {
  return status === "refunded" ? "refunded" : "paid";
}

function normalizeRefundType(type: string | null | undefined): RefundType | null {
  return type === "full_product_recovered" || type === "full_product_not_recovered" ? type : null;
}

function mapShop(row: ShopRow): Shop {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  const etsyFees = asNumber(
    row.etsy_fees ?? row.actual_etsy_fees ?? row.estimated_etsy_fees ?? 0
  );

  return {
    id: row.id,
    shopId: row.shop_id,
    date: row.date,
    month: row.month,
    orderNumber: row.order_number,
    status: normalizeStatus(row.status),
    grossRevenue: asNumber(row.gross_revenue),
    refunds: asNumber(row.refunds),
    etsyFees,
    etsyAds: asNumber(row.etsy_ads),
    productCost: asNumber(row.product_cost),
    shippingPaid: asNumber(row.shipping_paid),
    otherFees: asNumber(row.other_fees),
    netRevenue: asNumber(row.net_revenue),
    netProfit: asNumber(row.net_profit),
    margin: asNumber(row.margin),
    notes: row.notes,
    refundType: normalizeRefundType(row.refund_type),
    refundAmount: asNumber(row.refund_amount, asNumber(row.refunds)),
    refundedAt: row.refunded_at ?? null,
    productCostRecovered: Boolean(row.product_cost_recovered),
    etsyFeesRefunded: asNumber(row.etsy_fees_refunded),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toTransactionPayload(transaction: TransactionInput | TransactionUpdateInput) {
  return {
    shop_id: transaction.shopId,
    date: transaction.date,
    month: transaction.month,
    order_number: transaction.orderNumber,
    status: transaction.status,
    gross_revenue: transaction.grossRevenue,
    refunds: transaction.refunds,
    etsy_fees: transaction.etsyFees,
    etsy_ads: transaction.etsyAds,
    product_cost: transaction.productCost,
    shipping_paid: transaction.shippingPaid,
    other_fees: transaction.otherFees,
    notes: transaction.notes,
    refund_type: transaction.refundType,
    refund_amount: transaction.refundAmount,
    refunded_at: transaction.refundedAt,
    product_cost_recovered: transaction.productCostRecovered,
    etsy_fees_refunded: transaction.etsyFeesRefunded
  };
}

const supabase = createClient();

export async function loadDashboardData() {
  const [{ data: shops, error: shopsError }, { data: transactions, error: transactionsError }] =
    await Promise.all([
      supabase.from("shops").select("*").order("created_at", { ascending: true }),
      supabase.from("transactions").select("*").order("date", { ascending: false })
    ]);

  if (shopsError) {
    throw shopsError;
  }

  if (transactionsError) {
    throw transactionsError;
  }

  return {
    shops: (shops ?? []).map((shop) => mapShop(shop as ShopRow)),
    transactions: (transactions ?? []).map((transaction) =>
      mapTransaction(transaction as TransactionRow)
    )
  };
}

export async function createShopInSupabase(name: string) {
  const { data, error } = await supabase
    .from("shops")
    .insert({ name, active: true })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapShop(data as ShopRow);
}

export async function updateShopInSupabase(shop: Shop) {
  const { data, error } = await supabase
    .from("shops")
    .update({
      name: shop.name,
      active: shop.active
    })
    .eq("id", shop.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapShop(data as ShopRow);
}

export async function deleteShopInSupabase(shopId: string) {
  const { error } = await supabase.from("shops").delete().eq("id", shopId);

  if (error) {
    throw error;
  }
}

export async function createTransactionInSupabase(transaction: TransactionInput) {
  const { data, error } = await supabase
    .from("transactions")
    .insert(toTransactionPayload(transaction))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTransaction(data as TransactionRow);
}

export async function createTransactionsInSupabase(transactions: TransactionInput[]) {
  if (transactions.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(transactions.map(toTransactionPayload))
    .select("*");

  if (error) {
    throw error;
  }

  return (data ?? []).map((transaction) => mapTransaction(transaction as TransactionRow));
}

export async function updateTransactionInSupabase(
  transactionId: string,
  transaction: TransactionUpdateInput
) {
  const { data, error } = await supabase
    .from("transactions")
    .update(toTransactionPayload(transaction))
    .eq("id", transactionId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTransaction(data as TransactionRow);
}

export async function refundTransactionInSupabase(
  transaction: Transaction,
  refund: {
    refundType: RefundType;
    etsyFeesRefunded: number;
    productCostRecovered: boolean;
  }
) {
  const { data, error } = await supabase
    .from("transactions")
    .update({
      status: "refunded",
      refunds: transaction.grossRevenue,
      refund_type: refund.refundType,
      refund_amount: transaction.grossRevenue,
      refunded_at: new Date().toISOString(),
      product_cost_recovered: refund.productCostRecovered,
      etsy_fees_refunded: refund.etsyFeesRefunded
    })
    .eq("id", transaction.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTransaction(data as TransactionRow);
}

export async function cancelTransactionRefundInSupabase(transaction: Transaction) {
  const { data, error } = await supabase
    .from("transactions")
    .update({
      status: "paid",
      refunds: 0,
      refund_type: null,
      refund_amount: 0,
      refunded_at: null,
      product_cost_recovered: false,
      etsy_fees_refunded: 0
    })
    .eq("id", transaction.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTransaction(data as TransactionRow);
}

export async function deleteTransactionInSupabase(transactionId: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);

  if (error) {
    throw error;
  }
}

export async function resetSupabaseData() {
  await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("shops").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { data: insertedShops, error: shopsError } = await supabase
    .from("shops")
    .insert(seedShops.map((shop) => ({ name: shop.name, active: shop.active })))
    .select("*");

  if (shopsError) {
    throw shopsError;
  }

  const shopIdByName = new Map(
    (insertedShops ?? []).map((shop) => [(shop as ShopRow).name, (shop as ShopRow).id])
  );
  const seedShopNameById = new Map(seedShops.map((shop) => [shop.id, shop.name]));
  const transactionInputs = seedTransactions
    .map((transaction) => {
      const shopName = seedShopNameById.get(transaction.shopId);
      const shopId = shopName ? shopIdByName.get(shopName) : undefined;

      if (!shopId) {
        return null;
      }

      const input: TransactionInput = {
        shopId,
        date: transaction.date,
        month: transaction.month,
        orderNumber: transaction.orderNumber,
        status: transaction.status,
        grossRevenue: transaction.grossRevenue,
        refunds: transaction.refunds,
        etsyFees: transaction.etsyFees,
        etsyAds: transaction.etsyAds,
        productCost: transaction.productCost,
        shippingPaid: transaction.shippingPaid,
        otherFees: transaction.otherFees,
        notes: transaction.notes,
        refundType: null,
        refundAmount: transaction.refunds,
        refundedAt: null,
        productCostRecovered: false,
        etsyFeesRefunded: 0
      };

      return input;
    })
    .filter((transaction): transaction is TransactionInput => transaction !== null);

  await createTransactionsInSupabase(transactionInputs);

  return loadDashboardData();
}

export function createTransactionDraft(data: TransactionInput): Transaction {
  const now = new Date().toISOString();
  const metrics = calculateTransactionMetrics(data);

  return {
    ...data,
    ...metrics,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
}
