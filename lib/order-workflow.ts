"use client";

import { createClient } from "@/utils/supabase/client";
import type {
  LogisticsStatus,
  OrderAlert,
  OrderEvent,
  ProblemUrgency,
  SupplierAccount,
  SupplierOrder,
  SupplierOrderProblem,
  SupplierProduct,
  SupplierSettings
} from "@/lib/types";

const supabase = createClient();

function numberValue(value: unknown) {
  return Number(value ?? 0) || 0;
}

function mapAccount(row: Record<string, unknown>): SupplierAccount {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    platform: "aliexpress",
    email: String(row.email ?? ""),
    cardLabel: String(row.card_label ?? ""),
    notes: String(row.notes ?? ""),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at ?? "")
  };
}

function mapProduct(row: Record<string, unknown>): SupplierProduct {
  return {
    id: String(row.id),
    internalName: String(row.internal_name ?? ""),
    shopId: row.shop_id ? String(row.shop_id) : null,
    supplierUrl: String(row.supplier_url ?? ""),
    usualCost: row.usual_cost === null ? null : numberValue(row.usual_cost),
    supplierName: String(row.supplier_name ?? "AliExpress"),
    notes: String(row.notes ?? ""),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at ?? "")
  };
}

export async function getSupplierAccounts() {
  const { data, error } = await supabase
    .from("supplier_accounts")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => mapAccount(row));
}

export async function saveSupplierAccount(input: Omit<SupplierAccount, "id" | "createdAt">) {
  const { data, error } = await supabase
    .from("supplier_accounts")
    .insert({
      name: input.name.trim(),
      platform: "aliexpress",
      email: input.email.trim(),
      card_label: input.cardLabel.trim(),
      notes: input.notes.trim(),
      is_active: input.isActive
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapAccount(data);
}

export async function getSupplierProducts() {
  const { data, error } = await supabase
    .from("supplier_products")
    .select("*")
    .order("internal_name");
  if (error) throw error;
  return (data ?? []).map((row) => mapProduct(row));
}

export async function saveSupplierProduct(input: Omit<SupplierProduct, "id" | "createdAt">) {
  if (input.usualCost !== null && input.usualCost < 0) {
    throw new Error("Le cout habituel ne peut pas etre negatif.");
  }
  const { data, error } = await supabase
    .from("supplier_products")
    .insert({
      internal_name: input.internalName.trim(),
      shop_id: input.shopId || null,
      supplier_url: input.supplierUrl.trim(),
      usual_cost: input.usualCost,
      supplier_name: input.supplierName.trim() || "AliExpress",
      notes: input.notes.trim(),
      is_active: input.isActive
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapProduct(data);
}

async function addEvent(
  orderId: string,
  type: string,
  title: string,
  description = "",
  eventKey?: string
) {
  const { error } = await supabase.from("supplier_order_events").insert({
    order_id: orderId,
    event_key: eventKey ?? null,
    type,
    title,
    description
  });
  if (error && !(eventKey && error.code === "23505")) throw error;
}

export async function confirmSupplierOrder(
  orderId: string,
  input: {
    supplierUrl: string;
    supplierOrderNumber: string;
    supplierAccountId: string;
    supplierProductId?: string;
    actualSupplierCost: number;
    supplierCurrency: string;
    orderedAt: string;
    estimatedDeliveryAt: string;
    notes: string;
  }
) {
  if (input.actualSupplierCost < 0) throw new Error("Le cout reel ne peut pas etre negatif.");
  if (input.estimatedDeliveryAt && input.orderedAt.slice(0, 10) > input.estimatedDeliveryAt) {
    throw new Error("La livraison estimee ne peut pas preceder la commande.");
  }
  const { error } = await supabase
    .from("supplier_orders")
    .update({
      supplier_url: input.supplierUrl.trim(),
      order_link: input.supplierUrl.trim(),
      supplier_order_number: input.supplierOrderNumber.trim(),
      order_number: input.supplierOrderNumber.trim(),
      supplier_account_id: input.supplierAccountId || null,
      supplier_product_id: input.supplierProductId || null,
      actual_supplier_cost: input.actualSupplierCost,
      total_amount: input.actualSupplierCost,
      supplier_currency: input.supplierCurrency || "EUR",
      ordered_at: input.orderedAt,
      order_date: input.orderedAt.slice(0, 10),
      estimated_delivery_at: input.estimatedDeliveryAt || null,
      notes: input.notes,
      logistics_status: "ordered",
      status: "active"
    })
    .eq("id", orderId);
  if (error) throw error;
  await addEvent(orderId, "supplier_ordered", "Commande AliExpress passee", input.supplierOrderNumber, `ordered-${input.supplierOrderNumber}`);
  await addEvent(orderId, "supplier_cost_updated", "Cout reel renseigne", `${input.actualSupplierCost.toFixed(2)} EUR`, `cost-${input.actualSupplierCost}`);
}

export async function addShipment(
  orderId: string,
  input: { trackingNumber: string; carrier: string; shippedAt: string; estimatedDeliveryAt: string }
) {
  if (!input.trackingNumber.trim()) throw new Error("Ajoute le numero de suivi.");
  const { error } = await supabase
    .from("supplier_orders")
    .update({
      tracking_number: input.trackingNumber.trim(),
      carrier: input.carrier.trim(),
      shipped_at: input.shippedAt,
      estimated_delivery_at: input.estimatedDeliveryAt || null,
      logistics_status: "shipped"
    })
    .eq("id", orderId);
  if (error) throw error;
  await addEvent(orderId, "shipment_added", "Suivi ajoute", input.trackingNumber, `shipment-${input.trackingNumber}`);
}

export async function markSupplierOrderDelivered(orderId: string, deliveredAt: string) {
  const { error } = await supabase
    .from("supplier_orders")
    .update({
      logistics_status: "delivered",
      delivered_at: deliveredAt,
      status: "completed",
      completed_at: deliveredAt
    })
    .eq("id", orderId);
  if (error) throw error;
  await addEvent(orderId, "delivered", "Commande livree", "", "delivered");
}

export async function reportSupplierProblem(
  order: SupplierOrder,
  input: {
    type: string;
    description: string;
    urgency: ProblemUrgency;
    nextAction: string;
    reminderAt: string;
  }
) {
  const { error } = await supabase.from("supplier_order_problems").insert({
    order_id: order.id,
    type: input.type,
    description: input.description,
    urgency: input.urgency,
    next_action: input.nextAction,
    reminder_at: input.reminderAt || null,
    previous_status: order.logisticsStatus === "problem" ? "ordered" : order.logisticsStatus
  });
  if (error) throw error;
  const { error: statusError } = await supabase
    .from("supplier_orders")
    .update({ logistics_status: "problem" })
    .eq("id", order.id);
  if (statusError) throw statusError;
  await addEvent(order.id, "problem_created", "Probleme signale", input.type);
}

export async function resolveSupplierProblem(problemId: string, orderId: string, status: LogisticsStatus) {
  const { error } = await supabase
    .from("supplier_order_problems")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", problemId);
  if (error) throw error;
  const { error: statusError } = await supabase
    .from("supplier_orders")
    .update({ logistics_status: status })
    .eq("id", orderId);
  if (statusError) throw statusError;
  await addEvent(orderId, "problem_resolved", "Probleme resolu", status);
}

export async function getOrderEvents(orderId: string) {
  const { data, error } = await supabase
    .from("supplier_order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map<OrderEvent>((row) => ({
    id: row.id,
    orderId: row.order_id,
    type: row.type,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at
  }));
}

export async function getOrderProblems(orderId?: string) {
  let query = supabase
    .from("supplier_order_problems")
    .select("*")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });
  if (orderId) query = query.eq("order_id", orderId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map<SupplierOrderProblem>((row) => ({
    id: row.id,
    orderId: row.order_id,
    type: row.type,
    description: row.description ?? "",
    urgency: row.urgency,
    nextAction: row.next_action ?? "",
    reminderAt: row.reminder_at,
    previousStatus: row.previous_status,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at
  }));
}

export async function getSupplierSettings(): Promise<SupplierSettings> {
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", "default").single();
  if (error) throw error;
  return {
    supplierOrderAlertHours: data.supplier_order_alert_hours,
    supplierShippingAlertDays: data.supplier_shipping_alert_days,
    deliveryLateAlertDays: data.delivery_late_alert_days
  };
}

export async function saveSupplierSettings(settings: SupplierSettings) {
  const { error } = await supabase.from("app_settings").upsert({
    id: "default",
    supplier_order_alert_hours: settings.supplierOrderAlertHours,
    supplier_shipping_alert_days: settings.supplierShippingAlertDays,
    delivery_late_alert_days: settings.deliveryLateAlertDays,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

export function getOrderAlerts(
  order: SupplierOrder,
  settings: SupplierSettings,
  problems: SupplierOrderProblem[] = [],
  now = new Date()
): OrderAlert[] {
  const alerts: OrderAlert[] = [];
  const saleTime = new Date(`${order.saleDate}T00:00:00`).getTime();
  const orderedTime = order.orderedAt ? new Date(order.orderedAt).getTime() : 0;
  const elapsedHours = (now.getTime() - saleTime) / 3_600_000;
  const elapsedDays = orderedTime ? (now.getTime() - orderedTime) / 86_400_000 : 0;

  if (order.logisticsStatus === "to_order" && elapsedHours > settings.supplierOrderAlertHours) {
    alerts.push({ type: "to_order", label: `Non commandee depuis ${Math.floor(elapsedHours)} h`, tone: "danger" });
  }
  if (order.logisticsStatus === "ordered" && elapsedDays > settings.supplierShippingAlertDays) {
    alerts.push({ type: "shipping_late", label: `Non expediee depuis ${Math.floor(elapsedDays)} jours`, tone: "warning" });
  }
  if (order.estimatedDeliveryAt) {
    const lateAt = new Date(`${order.estimatedDeliveryAt}T23:59:59`);
    lateAt.setDate(lateAt.getDate() + settings.deliveryLateAlertDays);
    if (!["delivered", "cancelled"].includes(order.logisticsStatus) && now > lateAt) {
      alerts.push({ type: "delivery_late", label: "Livraison estimee depassee", tone: "warning" });
    }
  }
  if (order.logisticsStatus === "problem") {
    alerts.push({ type: "problem", label: "Probleme a traiter", tone: "danger" });
  }
  if (problems.some((problem) => problem.reminderAt && new Date(problem.reminderAt) <= now)) {
    alerts.push({ type: "reminder", label: "Rappel a traiter aujourd'hui", tone: "danger" });
  }
  return alerts;
}
