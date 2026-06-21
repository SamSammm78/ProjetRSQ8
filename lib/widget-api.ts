import { NextRequest, NextResponse } from "next/server";
import { getMonthStartIsoDate, getTodayIsoDate } from "@/lib/dates";
import { createClient } from "@/utils/supabase/server";

type TransactionMetricRow = {
  date: string;
  gross_revenue: number | string;
  net_revenue: number | string;
  net_profit: number | string;
  updated_at: string;
};

type ShopTransactionRow = TransactionMetricRow & {
  shop_id: string;
  shops: { name: string } | { name: string }[] | null;
};

export type WidgetStats = {
  gross_revenue: number;
  net_revenue: number;
  net_profit: number;
  orders_count: number;
  margin_percent: number;
};

const APP_TIME_ZONE = "Europe/Paris";

function round(value: number, fractionDigits = 2) {
  const factor = 10 ** fractionDigits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function asNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function getMonthEndIsoDate(monthStart: string) {
  const [year, month] = monthStart.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function getCurrentMonthLabel() {
  const label = new Intl.DateTimeFormat("fr-FR", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    year: "numeric"
  }).format(new Date(`${getMonthStartIsoDate()}T12:00:00`));

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export function unauthorizedWidgetResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function isWidgetRequestAuthorized(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const expectedKey = process.env.WIDGET_API_KEY;

  return Boolean(expectedKey && key && key === expectedKey);
}

export async function getWidgetStats(startDate: string, endDate: string): Promise<WidgetStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("date,gross_revenue,net_revenue,net_profit,updated_at")
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    throw error;
  }

  const totals = ((data ?? []) as TransactionMetricRow[]).reduce(
    (stats, transaction) => ({
      grossRevenue: stats.grossRevenue + asNumber(transaction.gross_revenue),
      netRevenue: stats.netRevenue + asNumber(transaction.net_revenue),
      netProfit: stats.netProfit + asNumber(transaction.net_profit),
      ordersCount: stats.ordersCount + 1
    }),
    { grossRevenue: 0, netRevenue: 0, netProfit: 0, ordersCount: 0 }
  );

  return {
    gross_revenue: round(totals.grossRevenue),
    net_revenue: round(totals.netRevenue),
    net_profit: round(totals.netProfit),
    orders_count: totals.ordersCount,
    margin_percent:
      totals.grossRevenue > 0 ? round((totals.netProfit / totals.grossRevenue) * 100, 1) : 0
  };
}

export async function getCurrentMonthWidgetStats() {
  const monthStart = getMonthStartIsoDate();
  return getWidgetStats(monthStart, getMonthEndIsoDate(monthStart));
}

export async function getTodayWidgetStats() {
  const today = getTodayIsoDate();
  return getWidgetStats(today, today);
}

export async function getCurrentMonthShopStats() {
  const monthStart = getMonthStartIsoDate();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("date,shop_id,gross_revenue,net_revenue,net_profit,updated_at,shops(name)")
    .gte("date", monthStart)
    .lte("date", getMonthEndIsoDate(monthStart));

  if (error) {
    throw error;
  }

  const shops = new Map<string, { name: string; gross_revenue: number; net_profit: number }>();

  for (const transaction of (data ?? []) as ShopTransactionRow[]) {
    const relation = Array.isArray(transaction.shops) ? transaction.shops[0] : transaction.shops;
    const current = shops.get(transaction.shop_id) ?? {
      name: relation?.name ?? "Boutique inconnue",
      gross_revenue: 0,
      net_profit: 0
    };

    current.gross_revenue += asNumber(transaction.gross_revenue);
    current.net_profit += asNumber(transaction.net_profit);
    shops.set(transaction.shop_id, current);
  }

  return [...shops.values()]
    .map((shop) => ({
      name: shop.name,
      gross_revenue: round(shop.gross_revenue),
      net_profit: round(shop.net_profit)
    }))
    .sort((first, second) => second.gross_revenue - first.gross_revenue);
}
