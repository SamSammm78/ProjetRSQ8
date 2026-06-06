import { seedShops, seedTransactions } from "@/data/seed";
import { aggregateDailyStats, previousIsoDay } from "@/lib/calculations";
import type { Shop, Transaction, TransactionInput } from "@/lib/types";

export function getShops(userId: string, shops: Shop[] = seedShops) {
  return shops.filter((shop) => shop.userId === userId);
}

export function createShop(userId: string, data: Pick<Shop, "name" | "active">): Shop {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    name: data.name,
    active: data.active,
    createdAt: now,
    updatedAt: now
  };
}

export function getTransactions(
  userId: string,
  transactions: Transaction[] = seedTransactions
) {
  return transactions.filter((transaction) => transaction.userId === userId);
}

export function getTransactionsByDate(
  userId: string,
  date: string,
  shopId?: string,
  transactions: Transaction[] = seedTransactions
) {
  return transactions.filter((transaction) => {
    return (
      transaction.userId === userId &&
      transaction.date === date &&
      (!shopId || transaction.shopId === shopId)
    );
  });
}

export function getDailyStats(
  userId: string,
  date: string,
  shopId?: string,
  transactions: Transaction[] = seedTransactions
) {
  return aggregateDailyStats(getTransactionsByDate(userId, date, shopId, transactions));
}

export function getPreviousDayStats(
  userId: string,
  date: string,
  shopId?: string,
  transactions: Transaction[] = seedTransactions
) {
  return getDailyStats(userId, previousIsoDay(date), shopId, transactions);
}

export function exportTransactions(
  userId: string,
  transactions: Transaction[] = seedTransactions
) {
  return getTransactions(userId, transactions);
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
    otherFees: Number(input.otherFees) || 0
  };
}
