export type Shop = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TransactionStatus = "paid" | "refunded";
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
