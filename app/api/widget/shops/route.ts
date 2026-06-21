import { NextResponse } from "next/server";
import { getCurrentMonthShopStats } from "@/lib/widget-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json(await getCurrentMonthShopStats());
  } catch (error) {
    console.error("Erreur widget boutiques:", error);
    return NextResponse.json({ error: "Unable to load widget data" }, { status: 500 });
  }
}
