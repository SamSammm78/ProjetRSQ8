import type { DailyStats, Transaction, TransactionInput } from "@/lib/types";

export function calculateTransactionMetrics(transaction: TransactionInput) {
  const netRevenue = transaction.grossRevenue - transaction.refunds;
  const netProfit =
    netRevenue -
    transaction.etsyFees -
    transaction.etsyAds -
    transaction.productCost -
    transaction.shippingPaid -
    transaction.otherFees;

  return {
    netRevenue,
    netProfit,
    margin: netRevenue > 0 ? netProfit / netRevenue : 0
  };
}

export function aggregateDailyStats(transactions: Transaction[]): DailyStats {
  const totals = transactions.reduce(
    (stats, transaction) => ({
      orders: stats.orders + 1,
      grossRevenue: stats.grossRevenue + transaction.grossRevenue,
      netRevenue: stats.netRevenue + transaction.netRevenue,
      netProfit: stats.netProfit + transaction.netProfit,
      etsyFees: stats.etsyFees + transaction.etsyFees,
      productCost: stats.productCost + transaction.productCost,
      etsyAds: stats.etsyAds + transaction.etsyAds
    }),
    {
      orders: 0,
      grossRevenue: 0,
      netRevenue: 0,
      netProfit: 0,
      etsyFees: 0,
      productCost: 0,
      etsyAds: 0
    }
  );

  return {
    ...totals,
    margin: totals.netRevenue > 0 ? totals.netProfit / totals.netRevenue : 0
  };
}

export function previousIsoDay(date: string) {
  const current = new Date(`${date}T12:00:00`);
  current.setDate(current.getDate() - 1);
  return current.toISOString().slice(0, 10);
}

export function addDays(date: string, amount: number) {
  const current = new Date(`${date}T12:00:00`);
  current.setDate(current.getDate() + amount);
  return current.toISOString().slice(0, 10);
}
