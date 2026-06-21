import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentMonthShopStats,
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
    return NextResponse.json(await getCurrentMonthShopStats());
  } catch (error) {
    console.error("Erreur widget boutiques:", error);
    return NextResponse.json({ error: "Unable to load widget data" }, { status: 500 });
  }
}
