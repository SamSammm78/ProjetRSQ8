"use client";

import Papa from "papaparse";
import type { CsvImportRow } from "@/lib/types";

function readNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(String(value).replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
}

function readText(row: Record<string, unknown>, keys: string[]) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.toLowerCase().trim(), value])
  );

  for (const key of keys) {
    const value = normalized[key.toLowerCase()];
    if (value !== undefined && value !== null) {
      return String(value).trim();
    }
  }

  return "";
}

export function parseEtsyCsv(file: File): Promise<CsvImportRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.map((row) => ({
          date: readText(row, ["date", "sale date", "order date"]),
          orderNumber: readText(row, ["order number", "order id", "commande"]),
          status: readText(row, ["status", "payment status"]) || "Payee",
          grossRevenue: readNumber(readText(row, ["gross revenue", "order value", "total"])),
          refunds: readNumber(readText(row, ["refunds", "refund"])),
          etsyFees: readNumber(readText(row, ["etsy fees", "fees"])),
          etsyAds: readNumber(readText(row, ["etsy ads", "ads"])),
          productCost: readNumber(readText(row, ["product cost", "cost"])),
          shippingPaid: readNumber(readText(row, ["shipping paid", "shipping"])),
          otherFees: readNumber(readText(row, ["other fees", "other"])),
          notes: readText(row, ["notes", "note"])
        }));

        resolve(rows);
      },
      error: reject
    });
  });
}

export async function importEtsyCsv(file: File) {
  return parseEtsyCsv(file);
}
