import type {
  DailyStats,
  FinalizedSaleRecord,
  FinalizedSalesSummary,
  PeriodOrderStatistics,
  Shop,
  ShopPeriodStatistics,
  Transaction,
  TransactionInput
} from "@/lib/types";

export function calculateTransactionProfit(transaction: TransactionInput) {
  return calculateFinalProfit(transaction);
}

export function getEffectiveProductCost(transaction: TransactionInput) {
  return transaction.actualSupplierCost ?? transaction.productCost ?? 0;
}

export function calculateCustomerRefundImpact(transaction: TransactionInput) {
  return transaction.refundAmount ?? transaction.refunds ?? 0;
}

export function calculateSupplierRefundImpact(transaction: TransactionInput) {
  return transaction.supplierRefundAmount ?? 0;
}

export function calculateFinalProfit(transaction: TransactionInput) {
  const remainingEtsyFees = Math.max(0, transaction.etsyFees - transaction.etsyFeesRefunded);

  return (
    transaction.grossRevenue -
    calculateCustomerRefundImpact(transaction) -
    remainingEtsyFees -
    transaction.etsyAds -
    getEffectiveProductCost(transaction) +
    calculateSupplierRefundImpact(transaction) -
    transaction.shippingPaid -
    transaction.otherFees
  );
}

export function calculateTransactionMargin(transaction: { grossRevenue: number; netProfit: number }) {
  return transaction.grossRevenue > 0 ? transaction.netProfit / transaction.grossRevenue : 0;
}

export function calculateRefundedTransactionProfit(transaction: TransactionInput) {
  const remainingEtsyFees = Math.max(0, transaction.etsyFees - transaction.etsyFeesRefunded);
  const effectiveProductCost = getEffectiveProductCost(transaction);

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
      transaction.otherFees +
      calculateSupplierRefundImpact(transaction)
  };
}

export function calculateTransactionMetrics(transaction: TransactionInput) {
  const netRevenue =
    transaction.grossRevenue -
    transaction.refundAmount -
    transaction.etsyFees -
    transaction.etsyAds;
  const netProfit = calculateFinalProfit(transaction);

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
      productCost: stats.productCost + getEffectiveProductCost(transaction),
      etsyAds: stats.etsyAds + transaction.etsyAds,
      refunds: stats.refunds + transaction.refundAmount,
      profitabilityRatioTotal:
        stats.profitabilityRatioTotal +
        calculateProfitabilityRatio({
          netRevenue: transaction.netRevenue,
          productCost: getEffectiveProductCost(transaction)
        }),
      profitabilityRatioCount:
        stats.profitabilityRatioCount + (getEffectiveProductCost(transaction) > 0 ? 1 : 0)
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

export function calculateAverageOrderValue(grossRevenue: number, ordersCount: number) {
  return ordersCount > 0 ? grossRevenue / ordersCount : 0;
}

export function calculateAverageProfitPerOrder(totalProfit: number, ordersCount: number) {
  return ordersCount > 0 ? totalProfit / ordersCount : 0;
}

export function calculateRefundRate(refundedOrdersCount: number, ordersCount: number) {
  return ordersCount > 0 ? refundedOrdersCount / ordersCount : 0;
}

export function calculatePeriodOrderStatistics(
  transactions: Transaction[]
): PeriodOrderStatistics {
  const totals = aggregateDailyStats(transactions);
  const refundTotals = transactions.reduce(
    (result, transaction) => {
      const refundAmount = calculateCustomerRefundImpact(transaction);
      const isRefunded = refundAmount > 0;
      const isFullyRefunded = isRefunded && refundAmount >= transaction.grossRevenue;

      return {
        refundedOrdersCount: result.refundedOrdersCount + (isRefunded ? 1 : 0),
        partiallyRefundedOrdersCount:
          result.partiallyRefundedOrdersCount + (isRefunded && !isFullyRefunded ? 1 : 0),
        fullyRefundedOrdersCount:
          result.fullyRefundedOrdersCount + (isFullyRefunded ? 1 : 0),
        refundAmount: result.refundAmount + refundAmount
      };
    },
    {
      refundedOrdersCount: 0,
      partiallyRefundedOrdersCount: 0,
      fullyRefundedOrdersCount: 0,
      refundAmount: 0
    }
  );

  return {
    ordersCount: totals.orders,
    grossRevenue: totals.grossRevenue,
    totalProfit: totals.netProfit,
    averageOrderValue: calculateAverageOrderValue(totals.grossRevenue, totals.orders),
    averageProfitPerOrder: calculateAverageProfitPerOrder(totals.netProfit, totals.orders),
    margin: totals.grossRevenue > 0 ? totals.netProfit / totals.grossRevenue : 0,
    ...refundTotals,
    refundRate: calculateRefundRate(refundTotals.refundedOrdersCount, totals.orders)
  };
}

export function calculateShopStatistics(
  transactions: Transaction[],
  shops: Shop[]
): ShopPeriodStatistics[] {
  const shopNames = new Map(shops.map((shop) => [shop.id, shop.name]));
  const transactionsByShop = new Map<string, Transaction[]>();

  transactions.forEach((transaction) => {
    const shopTransactions = transactionsByShop.get(transaction.shopId) ?? [];
    shopTransactions.push(transaction);
    transactionsByShop.set(transaction.shopId, shopTransactions);
  });

  return Array.from(transactionsByShop, ([shopId, shopTransactions]) => ({
    shopId,
    shopName: shopNames.get(shopId) || "Boutique supprimee",
    ...calculatePeriodOrderStatistics(shopTransactions)
  }));
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

export function calculateFinalizedSalesSummary(
  records: FinalizedSaleRecord[],
  receivedPayouts: number
): FinalizedSalesSummary {
  const uniqueRecords = Array.from(
    new Map(
      records
        .filter((record) => record.order.isFinalized)
        .map((record) => [record.transaction.id, record])
    ).values()
  );

  const totals = uniqueRecords.reduce(
    (summary, { order, transaction }) => {
      const customerRefund = calculateCustomerRefundImpact(transaction);
      const productCost = order.actualSupplierCost ?? getEffectiveProductCost(transaction);
      const supplierShipping = order.supplierShipping ?? transaction.shippingPaid;
      const supplierRefund = calculateSupplierRefundImpact(transaction);
      const finalProfit =
        transaction.grossRevenue -
        customerRefund -
        transaction.etsyFees +
        transaction.etsyFeesRefunded -
        transaction.etsyAds -
        productCost -
        supplierShipping -
        transaction.otherFees +
        supplierRefund;

      return {
        finalizedSalesCount: summary.finalizedSalesCount + 1,
        fullyRefundedSalesCount:
          summary.fullyRefundedSalesCount +
          (customerRefund >= transaction.grossRevenue ? 1 : 0),
        partiallyRefundedSalesCount:
          summary.partiallyRefundedSalesCount +
          (customerRefund > 0 && customerRefund < transaction.grossRevenue ? 1 : 0),
        grossRevenue: summary.grossRevenue + transaction.grossRevenue,
        customerRefunds: summary.customerRefunds + customerRefund,
        etsyFees: summary.etsyFees + transaction.etsyFees,
        etsyFeesRefunded: summary.etsyFeesRefunded + transaction.etsyFeesRefunded,
        productCosts: summary.productCosts + productCost,
        supplierShipping: summary.supplierShipping + supplierShipping,
        offsiteAds: summary.offsiteAds + transaction.etsyAds,
        otherFees: summary.otherFees + transaction.otherFees,
        supplierRefunds: summary.supplierRefunds + supplierRefund,
        finalProfit: summary.finalProfit + finalProfit
      };
    },
    {
      finalizedSalesCount: 0,
      fullyRefundedSalesCount: 0,
      partiallyRefundedSalesCount: 0,
      grossRevenue: 0,
      customerRefunds: 0,
      etsyFees: 0,
      etsyFeesRefunded: 0,
      productCosts: 0,
      supplierShipping: 0,
      offsiteAds: 0,
      otherFees: 0,
      supplierRefunds: 0,
      finalProfit: 0
    }
  );

  const netRevenue = totals.grossRevenue - totals.customerRefunds;
  const theoreticalPayout =
    totals.grossRevenue -
    totals.customerRefunds -
    totals.etsyFees +
    totals.etsyFeesRefunded -
    totals.offsiteAds;
  const theoreticalPayoutDue = Math.max(0, theoreticalPayout);
  const payoutDifference = theoreticalPayoutDue - receivedPayouts;

  return {
    ...totals,
    normalSalesCount:
      totals.finalizedSalesCount -
      totals.fullyRefundedSalesCount -
      totals.partiallyRefundedSalesCount,
    netRevenue,
    averageMargin:
      totals.grossRevenue > 0 ? (totals.finalProfit / totals.grossRevenue) * 100 : 0,
    theoreticalPayout,
    theoreticalPayoutDue,
    etsyAdjustmentDebt: Math.max(0, -theoreticalPayout),
    receivedPayouts,
    remainingPayout: Math.max(0, payoutDifference),
    excessReceived: Math.max(0, -payoutDifference)
  };
}
