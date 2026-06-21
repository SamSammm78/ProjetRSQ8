import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentMonthLabel,
  getCurrentMonthWidgetStats,
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
    return NextResponse.json({
      month: getCurrentMonthLabel(),
      ...(await getCurrentMonthWidgetStats()),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erreur widget mensuel:", error);
    return NextResponse.json({ error: "Unable to load widget data" }, { status: 500 });
  }
}
