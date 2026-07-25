import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFinalProfit,
  calculateFinalizedSalesSummary,
  calculateTransactionMargin,
  getEffectiveProductCost
} from "../lib/calculations";
import type { SupplierOrder, Transaction, TransactionInput } from "../lib/types";

function transaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    shopId: "shop",
    date: "2026-07-22",
    month: "2026-07-01",
    orderNumber: "etsy-1",
    status: "paid",
    grossRevenue: 150,
    refunds: 0,
    etsyFees: 5,
    etsyAds: 0,
    productCost: 60,
    shippingPaid: 0,
    otherFees: 0,
    notes: "",
    refundType: null,
    refundAmount: 0,
    refundedAt: null,
    productCostRecovered: false,
    etsyFeesRefunded: 0,
    supplierRefundAmount: 0,
    ...overrides
  };
}

test("le cout AliExpress reel remplace le cout provisoire", () => {
  const value = transaction({ productCost: 82, actualSupplierCost: 79.45 });
  assert.equal(getEffectiveProductCost(value), 79.45);
  assert.equal(calculateFinalProfit(value), 65.55);
});

test("remboursement client integral et AliExpress integral conserve les frais Etsy", () => {
  assert.equal(
    calculateFinalProfit(transaction({ status: "refunded", refundAmount: 150, refunds: 150, supplierRefundAmount: 60 })),
    -5
  );
});

test("remboursement client integral sans remboursement AliExpress compte le cout produit", () => {
  assert.equal(
    calculateFinalProfit(transaction({ status: "refunded", refundAmount: 150, refunds: 150, supplierRefundAmount: 0 })),
    -65
  );
});

test("les frais Etsy rembourses reduisent uniquement les frais restants", () => {
  assert.equal(
    calculateFinalProfit(transaction({ status: "refunded", refundAmount: 150, refunds: 150, supplierRefundAmount: 60, etsyFeesRefunded: 5 })),
    0
  );
});

test("la marge finale utilise le CA brut", () => {
  assert.equal(calculateTransactionMargin({ grossRevenue: 150, netProfit: 75 }), 0.5);
});

function finalizedRecord(
  transactionOverrides: Partial<Transaction> = {},
  orderOverrides: Partial<SupplierOrder> = {}
) {
  const input = transaction(transactionOverrides);
  const fullTransaction = {
    ...input,
    id: String(transactionOverrides.id ?? "transaction-1"),
    netRevenue: 0,
    netProfit: calculateFinalProfit(input),
    margin: 0,
    createdAt: "2026-07-22T10:00:00Z",
    updatedAt: "2026-07-22T10:00:00Z",
    ...transactionOverrides
  } as Transaction;
  const order = {
    id: "order-1",
    transactionId: fullTransaction.id,
    isFinalized: true,
    finalizedAt: "2026-07-25T10:00:00Z",
    actualSupplierCost: fullTransaction.actualSupplierCost ?? null,
    estimatedProductCost: fullTransaction.productCost,
    supplierShipping: fullTransaction.shippingPaid,
    transaction: fullTransaction,
    ...orderOverrides
  } as SupplierOrder;
  return { order, transaction: fullTransaction };
}

test("le bilan ignore une commande non finalisee", () => {
  const summary = calculateFinalizedSalesSummary([
    finalizedRecord({}, { isFinalized: false, finalizedAt: null })
  ], 0);
  assert.equal(summary.finalizedSalesCount, 0);
  assert.equal(summary.grossRevenue, 0);
});

test("deux ventes normales donnent le benefice et le versement attendus", () => {
  const first = finalizedRecord(
    { id: "one", grossRevenue: 100, etsyFees: 12, productCost: 30 },
    { id: "order-one", estimatedProductCost: 30 }
  );
  const second = finalizedRecord(
    { id: "two", grossRevenue: 200, etsyFees: 24, productCost: 60 },
    { id: "order-two", estimatedProductCost: 60 }
  );
  const summary = calculateFinalizedSalesSummary([first, second], 0);
  assert.equal(summary.finalizedSalesCount, 2);
  assert.equal(summary.grossRevenue, 300);
  assert.equal(summary.finalProfit, 174);
  assert.equal(summary.theoreticalPayout, 264);
});

test("une vente remboursee sans remboursement fournisseur produit une perte de 65 euros", () => {
  const summary = calculateFinalizedSalesSummary([
    finalizedRecord({ status: "refunded", refundAmount: 150, refunds: 150 })
  ], 0);
  assert.equal(summary.fullyRefundedSalesCount, 1);
  assert.equal(summary.netRevenue, 0);
  assert.equal(summary.finalProfit, -65);
  assert.equal(summary.theoreticalPayout, -5);
  assert.equal(summary.etsyAdjustmentDebt, 5);
});

test("le remboursement AliExpress ameliore le benefice sans augmenter le CA", () => {
  const summary = calculateFinalizedSalesSummary([
    finalizedRecord({ status: "refunded", refundAmount: 150, refunds: 150, supplierRefundAmount: 60 })
  ], 0);
  assert.equal(summary.grossRevenue, 150);
  assert.equal(summary.supplierRefunds, 60);
  assert.equal(summary.finalProfit, -5);
});

test("les versements recus reduisent uniquement le reste a recevoir", () => {
  const summary = calculateFinalizedSalesSummary([
    finalizedRecord({ grossRevenue: 100, etsyFees: 12, productCost: 30 })
  ], 50);
  assert.equal(summary.theoreticalPayoutDue, 88);
  assert.equal(summary.receivedPayouts, 50);
  assert.equal(summary.remainingPayout, 38);
});

test("une transaction dupliquee n'est comptee qu'une fois", () => {
  const record = finalizedRecord();
  const summary = calculateFinalizedSalesSummary([record, { ...record, order: { ...record.order, id: "duplicate" } }], 0);
  assert.equal(summary.finalizedSalesCount, 1);
  assert.equal(summary.grossRevenue, 150);
});
