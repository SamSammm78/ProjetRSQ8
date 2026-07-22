import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFinalProfit,
  calculateTransactionMargin,
  getEffectiveProductCost
} from "../lib/calculations";
import type { TransactionInput } from "../lib/types";

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
