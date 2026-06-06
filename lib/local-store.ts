"use client";

import { seedShops, seedTransactions } from "@/data/seed";
import { calculateTransactionMetrics } from "@/lib/calculations";
import type { Shop, Transaction, TransactionInput } from "@/lib/types";

const SHOPS_KEY = "etsy-dashboard-shops";
const TRANSACTIONS_KEY = "etsy-dashboard-transactions";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.localStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

function writeJson<T>(key: string, value: T) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

export function getStoredShops() {
  return readJson<Shop[]>(SHOPS_KEY, seedShops);
}

export function saveStoredShops(shops: Shop[]) {
  writeJson(SHOPS_KEY, shops);
}

export function getStoredTransactions() {
  return readJson<Transaction[]>(TRANSACTIONS_KEY, seedTransactions);
}

export function saveStoredTransactions(transactions: Transaction[]) {
  writeJson(TRANSACTIONS_KEY, transactions);
}

export function createStoredTransaction(data: TransactionInput) {
  const metrics = calculateTransactionMetrics(data);
  const now = new Date().toISOString();

  return {
    ...data,
    ...metrics,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
}
