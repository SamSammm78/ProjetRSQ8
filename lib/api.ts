import { seedShops, seedTransactions } from "@/data/seed";
import { aggregateDailyStats, previousIsoDay } from "@/lib/calculations";
import type { Shop, Transaction, TransactionInput } from "@/lib/types";

export function getShops(shops: Shop[] = seedShops) {
  return shops;
}

export function getTransactions(transactions: Transaction[] = seedTransactions) {
  return transactions;
}

export function getTransactionsByDate(
  date: string,
  shopId?: string,
  transactions: Transaction[] = seedTransactions
) {
  return transactions.filter((transaction) => {
    return (
      transaction.date === date &&
      (!shopId || transaction.shopId === shopId)
    );
  });
}

export function getDailyStats(
  date: string,
  shopId?: string,
  transactions: Transaction[] = seedTransactions
) {
  return aggregateDailyStats(getTransactionsByDate(date, shopId, transactions));
}

export function getPreviousDayStats(
  date: string,
  shopId?: string,
  transactions: Transaction[] = seedTransactions
) {
  return getDailyStats(previousIsoDay(date), shopId, transactions);
}

export function exportTransactions(transactions: Transaction[] = seedTransactions) {
  return getTransactions(transactions);
}

export function normalizeTransactionInput(input: TransactionInput): TransactionInput {
  return {
    ...input,
    month: input.month || `${input.date.slice(0, 7)}-01`,
    grossRevenue: Number(input.grossRevenue) || 0,
    refunds: Number(input.refunds) || 0,
    etsyFees: Number(input.etsyFees) || 0,
    etsyAds: Number(input.etsyAds) || 0,
    productCost: Number(input.productCost) || 0,
    shippingPaid: Number(input.shippingPaid) || 0,
    otherFees: Number(input.otherFees) || 0,
    refundType: input.refundType ?? null,
    refundAmount: Number(input.refundAmount) || 0,
    refundedAt: input.refundedAt ?? null,
    productCostRecovered: Boolean(input.productCostRecovered),
    etsyFeesRefunded: Number(input.etsyFeesRefunded) || 0
  };
}
