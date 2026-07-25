export type Shop = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinancialStatus = "paid" | "partially_refunded" | "refunded" | "dispute";
export type TransactionStatus = FinancialStatus;
export type RefundType = "full_product_recovered" | "full_product_not_recovered";

export type TransactionInput = {
  shopId: string;
  date: string;
  month: string;
  orderNumber: string;
  status: TransactionStatus;
  grossRevenue: number;
  refunds: number;
  etsyFees: number;
  etsyAds: number;
  productCost: number;
  shippingPaid: number;
  otherFees: number;
  notes: string;
  refundType: RefundType | null;
  refundAmount: number;
  refundedAt: string | null;
  productCostRecovered: boolean;
  etsyFeesRefunded: number;
  actualSupplierCost?: number | null;
  supplierRefundAmount?: number;
  refundReason?: string;
};

export type Transaction = TransactionInput & {
  id: string;
  netRevenue: number;
  netProfit: number;
  margin: number;
  createdAt: string;
  updatedAt: string;
};

export type TransactionUpdateInput = Partial<
  Omit<TransactionInput, "shopId" | "date" | "month" | "orderNumber">
> &
  Pick<TransactionInput, "shopId" | "date" | "month" | "orderNumber">;

export type DailyStats = {
  orders: number;
  grossRevenue: number;
  netRevenue: number;
  netProfit: number;
  margin: number;
  profitabilityRatioAverage: number;
  etsyFees: number;
  productCost: number;
  etsyAds: number;
  refunds: number;
};

export type PeriodOrderStatistics = {
  ordersCount: number;
  grossRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  averageProfitPerOrder: number;
  margin: number;
  refundedOrdersCount: number;
  partiallyRefundedOrdersCount: number;
  fullyRefundedOrdersCount: number;
  refundAmount: number;
  refundRate: number;
};

export type ShopPeriodStatistics = PeriodOrderStatistics & {
  shopId: string;
  shopName: string;
};

export type CsvImportRow = {
  date: string;
  orderNumber: string;
  status: string;
  grossRevenue: number;
  refunds: number;
  etsyFees: number;
  etsyAds: number;
  productCost: number;
  shippingPaid: number;
  otherFees: number;
  notes: string;
};

export type SupplierOrderStatus = "active" | "completed" | "cancelled";

export type LogisticsStatus =
  | "to_order"
  | "ordered"
  | "shipped"
  | "delivered"
  | "problem"
  | "cancelled"
  | "lost";

export type SupplierOrder = {
  id: string;
  platform: string;
  accountUsed: string;
  orderDate: string;
  orderNumber: string;
  totalAmount: number;
  orderLink: string;
  country: string;
  notes: string;
  status: SupplierOrderStatus;
  completedAt: string | null;
  images: SupplierOrderImage[];
  createdAt: string;
  updatedAt: string;
  transactionId: string | null;
  shopId: string | null;
  etsyOrderNumber: string;
  saleDate: string;
  logisticsStatus: LogisticsStatus;
  financialStatus: FinancialStatus;
  supplierAccountId: string | null;
  supplierProductId: string | null;
  supplierUrl: string;
  supplierOrderNumber: string;
  estimatedProductCost: number;
  actualSupplierCost: number | null;
  supplierShipping: number;
  supplierCurrency: string;
  orderedAt: string | null;
  shippedAt: string | null;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
  trackingNumber: string;
  carrier: string;
  isStandalone: boolean;
  transaction: Transaction | null;
  isFinalized: boolean;
  finalizedAt: string | null;
};

export type SupplierOrderInput = {
  platform: string;
  accountUsed: string;
  orderDate: string;
  orderNumber: string;
  totalAmount: number;
  orderLink: string;
  country: string;
  notes: string;
};

export type SupplierOrderImage = {
  id: string;
  orderId: string;
  imageUrl: string;
  fileName: string;
  storagePath: string;
  createdAt: string;
};

export type SupplierAccount = {
  id: string;
  name: string;
  platform: "aliexpress";
  email: string;
  cardLabel: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
};

export type SupplierProduct = {
  id: string;
  internalName: string;
  shopId: string | null;
  supplierUrl: string;
  usualCost: number | null;
  supplierName: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
};

export type ProblemUrgency = "low" | "normal" | "urgent";

export type SupplierOrderProblem = {
  id: string;
  orderId: string;
  type: string;
  description: string;
  urgency: ProblemUrgency;
  nextAction: string;
  reminderAt: string | null;
  previousStatus: LogisticsStatus;
  resolvedAt: string | null;
  createdAt: string;
};

export type OrderEvent = {
  id: string;
  orderId: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
};

export type SupplierSettings = {
  supplierOrderAlertHours: number;
  supplierShippingAlertDays: number;
  deliveryLateAlertDays: number;
};

export type OrderAlert = {
  type: "to_order" | "shipping_late" | "delivery_late" | "problem" | "reminder";
  label: string;
  tone: "warning" | "danger";
};

export type EtsyPayout = {
  id: string;
  shopId: string;
  amount: number;
  payoutDate: string;
  reference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type FinalizedSaleRecord = {
  order: SupplierOrder;
  transaction: Transaction;
};

export type FinalizedSalesSummary = {
  finalizedSalesCount: number;
  normalSalesCount: number;
  fullyRefundedSalesCount: number;
  partiallyRefundedSalesCount: number;
  grossRevenue: number;
  customerRefunds: number;
  netRevenue: number;
  etsyFees: number;
  etsyFeesRefunded: number;
  productCosts: number;
  supplierShipping: number;
  offsiteAds: number;
  otherFees: number;
  supplierRefunds: number;
  finalProfit: number;
  averageMargin: number;
  theoreticalPayout: number;
  theoreticalPayoutDue: number;
  etsyAdjustmentDebt: number;
  receivedPayouts: number;
  remainingPayout: number;
  excessReceived: number;
};
