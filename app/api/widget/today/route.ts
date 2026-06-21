import { NextRequest, NextResponse } from "next/server";
import {
  getTodayWidgetStats,
  isWidgetRequestAuthorized,
  unauthorizedWidgetResponse
} from "@/lib/widget-api";
import { getTodayIsoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  if (!isWidgetRequestAuthorized(request)) {
    return unauthorizedWidgetResponse();
  }

  try {
    return NextResponse.json({
      date: getTodayIsoDate(),
      ...(await getTodayWidgetStats()),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erreur widget du jour:", error);
    return NextResponse.json({ error: "Unable to load widget data" }, { status: 500 });
  }
}
