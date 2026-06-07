"use client";

import type { SupplierOrder, SupplierOrderInput } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

type SupplierOrderRow = {
  id: string;
  platform: string | null;
  account_used: string | null;
  order_date: string;
  order_number: string | null;
  total_amount: number | null;
  order_link: string | null;
  country: string | null;
  notes: string | null;
  status: "active" | "completed" | "cancelled" | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const supabase = createClient();

function mapSupplierOrder(row: SupplierOrderRow): SupplierOrder {
  return {
    id: row.id,
    platform: row.platform ?? "",
    accountUsed: row.account_used ?? "",
    orderDate: row.order_date,
    orderNumber: row.order_number ?? "",
    totalAmount: Number(row.total_amount ?? 0),
    orderLink: row.order_link ?? "",
    country: row.country ?? "",
    notes: row.notes ?? "",
    status: row.status ?? "active",
    completedAt: row.completed_at,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? ""
  };
}

export async function getActiveSupplierOrders() {
  const { data, error } = await supabase
    .from("supplier_orders")
    .select("*")
    .eq("status", "active")
    .order("order_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapSupplierOrder(row as SupplierOrderRow));
}

export async function createSupplierOrder(input: SupplierOrderInput) {
  const { data, error } = await supabase
    .from("supplier_orders")
    .insert({
      platform: input.platform,
      account_used: input.accountUsed,
      order_date: input.orderDate,
      order_number: input.orderNumber,
      total_amount: input.totalAmount,
      order_link: input.orderLink,
      country: input.country,
      notes: input.notes,
      status: "active"
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapSupplierOrder(data as SupplierOrderRow);
}

export async function getHistoricalSupplierOrders(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("supplier_orders")
    .select("*")
    .in("status", ["completed", "cancelled"])
    .gte("order_date", startDate)
    .lte("order_date", endDate)
    .order("order_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapSupplierOrder(row as SupplierOrderRow));
}

export async function completeSupplierOrder(orderId: string) {
  const { error } = await supabase
    .from("supplier_orders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}
