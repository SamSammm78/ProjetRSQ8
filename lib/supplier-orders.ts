"use client";

import type {
  FinancialStatus,
  LogisticsStatus,
  SupplierOrder,
  SupplierOrderImage,
  SupplierOrderInput
} from "@/lib/types";
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
  transaction_id?: string | null;
  shop_id?: string | null;
  etsy_order_number?: string | null;
  sale_date?: string | null;
  logistics_status?: LogisticsStatus | null;
  financial_status?: FinancialStatus | null;
  supplier_account_id?: string | null;
  supplier_product_id?: string | null;
  supplier_url?: string | null;
  supplier_order_number?: string | null;
  estimated_product_cost?: number | string | null;
  actual_supplier_cost?: number | string | null;
  supplier_shipping?: number | string | null;
  supplier_currency?: string | null;
  ordered_at?: string | null;
  shipped_at?: string | null;
  estimated_delivery_at?: string | null;
  delivered_at?: string | null;
  tracking_number?: string | null;
  carrier?: string | null;
  is_standalone?: boolean | null;
};

type SupplierOrderImageRow = {
  id: string;
  order_id: string;
  image_url: string;
  file_name: string | null;
  storage_path: string | null;
  created_at: string | null;
};

const supabase = createClient();

const MAX_ORDER_IMAGES = 10;
const ORDER_IMAGES_BUCKET = "supplier-orders";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function mapSupplierOrder(row: SupplierOrderRow, images: SupplierOrderImage[] = []): SupplierOrder {
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
    images,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
    transactionId: row.transaction_id ?? null,
    shopId: row.shop_id ?? null,
    etsyOrderNumber: row.etsy_order_number ?? "",
    saleDate: row.sale_date ?? row.order_date,
    logisticsStatus: row.logistics_status ?? (row.status === "completed" ? "delivered" : "to_order"),
    financialStatus: row.financial_status ?? "paid",
    supplierAccountId: row.supplier_account_id ?? null,
    supplierProductId: row.supplier_product_id ?? null,
    supplierUrl: row.supplier_url ?? row.order_link ?? "",
    supplierOrderNumber: row.supplier_order_number ?? row.order_number ?? "",
    estimatedProductCost: Number(row.estimated_product_cost ?? row.total_amount ?? 0),
    actualSupplierCost:
      row.actual_supplier_cost === null || row.actual_supplier_cost === undefined
        ? null
        : Number(row.actual_supplier_cost),
    supplierShipping: Number(row.supplier_shipping ?? 0),
    supplierCurrency: row.supplier_currency ?? "EUR",
    orderedAt: row.ordered_at ?? null,
    shippedAt: row.shipped_at ?? null,
    estimatedDeliveryAt: row.estimated_delivery_at ?? null,
    deliveredAt: row.delivered_at ?? row.completed_at ?? null,
    trackingNumber: row.tracking_number ?? "",
    carrier: row.carrier ?? "",
    isStandalone: row.is_standalone ?? !row.transaction_id,
    transaction: null
  };
}

function mapSupplierOrderImage(row: SupplierOrderImageRow): SupplierOrderImage {
  return {
    id: row.id,
    orderId: row.order_id,
    imageUrl: row.image_url,
    fileName: row.file_name ?? "",
    storagePath: row.storage_path ?? "",
    createdAt: row.created_at ?? ""
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

function validateImageFiles(files: File[], existingCount = 0) {
  if (existingCount + files.length > MAX_ORDER_IMAGES) {
    throw new Error("Une commande peut contenir au maximum 10 images.");
  }

  const invalidFile = files.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));

  if (invalidFile) {
    throw new Error("Formats acceptes : JPG, JPEG, PNG et WEBP.");
  }
}

async function attachImagesToOrders(orders: SupplierOrder[]) {
  if (orders.length === 0) {
    return orders;
  }

  const orderIds = orders.map((order) => order.id);
  const { data, error } = await supabase
    .from("supplier_order_images")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const imagesByOrderId = new Map<string, SupplierOrderImage[]>();
  (data ?? []).forEach((row) => {
    const image = mapSupplierOrderImage(row as SupplierOrderImageRow);
    imagesByOrderId.set(image.orderId, [...(imagesByOrderId.get(image.orderId) ?? []), image]);
  });

  return orders.map((order) => ({
    ...order,
    images: imagesByOrderId.get(order.id) ?? []
  }));
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

  return attachImagesToOrders((data ?? []).map((row) => mapSupplierOrder(row as SupplierOrderRow)));
}

export async function getAllSupplierOrders() {
  const { data, error } = await supabase
    .from("supplier_orders")
    .select("*")
    .order("sale_date", { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return attachImagesToOrders((data ?? []).map((row) => mapSupplierOrder(row as SupplierOrderRow)));
}

export async function getSupplierOrder(orderId: string) {
  const { data, error } = await supabase
    .from("supplier_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    throw error;
  }

  const [order] = await attachImagesToOrders([mapSupplierOrder(data as SupplierOrderRow)]);
  return order;
}

export async function createSupplierOrder(input: SupplierOrderInput, images: File[] = []) {
  validateImageFiles(images);

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
      status: "active",
      logistics_status: "ordered",
      financial_status: "paid",
      supplier_order_number: input.orderNumber,
      supplier_url: input.orderLink,
      actual_supplier_cost: input.totalAmount,
      is_standalone: true
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const order = mapSupplierOrder(data as SupplierOrderRow);
  const uploadedImages = await uploadSupplierOrderImages(order.id, images);
  return {
    ...order,
    images: uploadedImages
  };
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

  return attachImagesToOrders((data ?? []).map((row) => mapSupplierOrder(row as SupplierOrderRow)));
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

export async function uploadSupplierOrderImages(
  orderId: string,
  files: File[],
  existingCount = 0
) {
  validateImageFiles(files, existingCount);

  const uploadedImages: SupplierOrderImage[] = [];

  for (const [index, file] of files.entries()) {
    const storagePath = `${orderId}/${Date.now()}-${index}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(ORDER_IMAGES_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(ORDER_IMAGES_BUCKET)
      .getPublicUrl(storagePath);

    const { data, error } = await supabase
      .from("supplier_order_images")
      .insert({
        order_id: orderId,
        image_url: publicUrlData.publicUrl,
        file_name: file.name,
        storage_path: storagePath
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    uploadedImages.push(mapSupplierOrderImage(data as SupplierOrderImageRow));
  }

  return uploadedImages;
}

export async function deleteSupplierOrderImage(image: SupplierOrderImage) {
  if (image.storagePath) {
    const { error: storageError } = await supabase.storage
      .from(ORDER_IMAGES_BUCKET)
      .remove([image.storagePath]);

    if (storageError) {
      throw storageError;
    }
  }

  const { error } = await supabase.from("supplier_order_images").delete().eq("id", image.id);

  if (error) {
    throw error;
  }
}

export async function replaceSupplierOrderImage(image: SupplierOrderImage, file: File) {
  await deleteSupplierOrderImage(image);
  const [newImage] = await uploadSupplierOrderImages(image.orderId, [file]);
  return newImage;
}
