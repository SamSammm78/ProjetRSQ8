export type Shop = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TransactionInput = {
  shopId: string;
  date: string;
  month: string;
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

export type Transaction = TransactionInput & {
  id: string;
  netRevenue: number;
  netProfit: number;
  margin: number;
  createdAt: string;
  updatedAt: string;
};

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
