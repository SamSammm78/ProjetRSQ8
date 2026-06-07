"use client";

import type { SupplierOrder, SupplierOrderImage, SupplierOrderInput } from "@/lib/types";
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
    updatedAt: row.updated_at ?? ""
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
      status: "active"
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
