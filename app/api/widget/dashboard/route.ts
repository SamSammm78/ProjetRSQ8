import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentMonthWidgetStats,
  getTodayWidgetStats,
  isWidgetRequestAuthorized,
  unauthorizedWidgetResponse
} from "@/lib/widget-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  if (!isWidgetRequestAuthorized(request)) {
    return unauthorizedWidgetResponse();
  }

  try {
    const [today, month] = await Promise.all([getTodayWidgetStats(), getCurrentMonthWidgetStats()]);

    return NextResponse.json({
      today: {
        gross_revenue: today.gross_revenue,
        net_profit: today.net_profit,
        orders_count: today.orders_count
      },
      month: {
        gross_revenue: month.gross_revenue,
        net_profit: month.net_profit,
        orders_count: month.orders_count
      }
    });
  } catch (error) {
    console.error("Erreur widget dashboard:", error);
    return NextResponse.json({ error: "Unable to load widget data" }, { status: 500 });
  }
}
