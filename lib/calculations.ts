import type { DailyStats, Transaction, TransactionInput } from "@/lib/types";

export function calculateEstimatedEtsyFees(
  grossRevenue: number,
  estimatedFeePercentage: number,
  estimatedFixedFee: number
) {
  return grossRevenue > 0 ? grossRevenue * (estimatedFeePercentage / 100) + estimatedFixedFee : 0;
}

export function getEffectiveEtsyFees(transaction: {
  estimatedEtsyFees: number;
  actualEtsyFees: number | null;
  feesStatus: string;
  etsyFees: number;
}) {
  if (transaction.feesStatus === "confirmed") {
    return transaction.actualEtsyFees ?? transaction.etsyFees ?? 0;
  }

  return transaction.estimatedEtsyFees || transaction.etsyFees || 0;
}

export function calculateTransactionProfit(transaction: TransactionInput) {
  const etsyFees = getEffectiveEtsyFees(transaction);

  return (
    transaction.grossRevenue -
    transaction.refunds -
    etsyFees -
    transaction.etsyAds -
    transaction.productCost -
    transaction.shippingPaid -
    transaction.otherFees
  );
}

export function calculateTransactionMargin(transaction: { grossRevenue: number; netProfit: number }) {
  return transaction.grossRevenue > 0 ? transaction.netProfit / transaction.grossRevenue : 0;
}

export function calculateRefundedTransactionProfit(transaction: TransactionInput) {
  const etsyFees = getEffectiveEtsyFees(transaction);
  const remainingEtsyFees = Math.max(0, etsyFees - transaction.etsyFeesRefunded);
  const effectiveProductCost = transaction.productCostRecovered ? 0 : transaction.productCost;

  return {
    remainingEtsyFees,
    effectiveProductCost,
    finalProfit:
      transaction.grossRevenue -
      transaction.refundAmount -
      remainingEtsyFees -
      transaction.etsyAds -
      effectiveProductCost -
      transaction.shippingPaid -
      transaction.otherFees
  };
}

export function calculateTransactionMetrics(transaction: TransactionInput) {
  const etsyFees = getEffectiveEtsyFees(transaction);
  const netRevenue = transaction.grossRevenue - transaction.refundAmount - etsyFees - transaction.etsyAds;
  const netProfit =
    transaction.status === "refunded"
      ? calculateRefundedTransactionProfit(transaction).finalProfit
      : calculateTransactionProfit(transaction);

  return {
    netRevenue,
    netProfit,
    margin: calculateTransactionMargin({ grossRevenue: transaction.grossRevenue, netProfit })
  };
}

export function calculateProfitabilityRatio(transaction: {
  netRevenue: number;
  productCost: number;
}) {
  return transaction.productCost > 0 ? transaction.netRevenue / transaction.productCost : 0;
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
      etsyAds: stats.etsyAds + transaction.etsyAds,
      refunds: stats.refunds + transaction.refundAmount,
      profitabilityRatioTotal:
        stats.profitabilityRatioTotal + calculateProfitabilityRatio(transaction),
      profitabilityRatioCount:
        stats.profitabilityRatioCount + (transaction.productCost > 0 ? 1 : 0)
    }),
    {
      orders: 0,
      grossRevenue: 0,
      netRevenue: 0,
      netProfit: 0,
      etsyFees: 0,
      productCost: 0,
      etsyAds: 0,
      refunds: 0,
      profitabilityRatioTotal: 0,
      profitabilityRatioCount: 0
    }
  );

  return {
    orders: totals.orders,
    grossRevenue: totals.grossRevenue,
    netRevenue: totals.netRevenue,
    netProfit: totals.netProfit,
    margin: totals.netRevenue > 0 ? totals.netProfit / totals.netRevenue : 0,
    profitabilityRatioAverage:
      totals.profitabilityRatioCount > 0
        ? totals.profitabilityRatioTotal / totals.profitabilityRatioCount
        : 0,
    etsyFees: totals.etsyFees,
    productCost: totals.productCost,
    etsyAds: totals.etsyAds,
    refunds: totals.refunds
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
