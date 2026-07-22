"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createShopInSupabase,
  createTransactionInSupabase,
  createTransactionsInSupabase,
  cancelTransactionRefundInSupabase,
  deleteShopInSupabase,
  deleteTransactionInSupabase,
  loadDashboardData,
  refundTransactionInSupabase,
  resetSupabaseData,
  updateShopInSupabase,
  updateTransactionInSupabase
} from "@/lib/supabase-db";
import type { Shop, Transaction, TransactionInput, TransactionUpdateInput } from "@/lib/types";

type DataContextValue = {
  error: string;
  isLoading: boolean;
  shops: Shop[];
  transactions: Transaction[];
  addShop: (name: string) => Promise<void>;
  updateShop: (shop: Shop) => Promise<void>;
  toggleShop: (shopId: string) => Promise<void>;
  deleteShop: (shopId: string) => Promise<void>;
  addTransaction: (transaction: TransactionInput) => Promise<void>;
  addTransactions: (transactions: TransactionInput[]) => Promise<number>;
  updateTransaction: (transactionId: string, transaction: TransactionUpdateInput) => Promise<void>;
  refundTransaction: (
    transaction: Transaction,
    refund: {
      customerRefundAmount: number;
      supplierRefundAmount: number;
      etsyFeesRefunded: number;
      refundReason: string;
    }
  ) => Promise<void>;
  cancelTransactionRefund: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  resetData: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function ClientDataProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  async function refreshData() {
    setError("");
    setIsLoading(true);

    try {
      const data = await loadDashboardData();
      setShops(data.shops);
      setTransactions(data.transactions);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erreur Supabase");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      error,
      isLoading,
      shops,
      transactions,
      addShop: async (name) => {
        const shop = await createShopInSupabase(name);
        setShops((currentShops) => [...currentShops, shop]);
      },
      updateShop: async (shop) => {
        const updatedShop = await updateShopInSupabase(shop);
        setShops((currentShops) =>
          currentShops.map((currentShop) =>
            currentShop.id === updatedShop.id ? updatedShop : currentShop
          )
        );
      },
      toggleShop: async (shopId) => {
        const shop = shops.find((currentShop) => currentShop.id === shopId);

        if (!shop) {
          return;
        }

        const updatedShop = await updateShopInSupabase({
          ...shop,
          active: !shop.active
        });
        setShops((currentShops) =>
          currentShops.map((currentShop) =>
            currentShop.id === updatedShop.id ? updatedShop : currentShop
          )
        );
      },
      deleteShop: async (shopId) => {
        await deleteShopInSupabase(shopId);
        setShops((currentShops) => currentShops.filter((shop) => shop.id !== shopId));
      },
      addTransaction: async (transactionInput) => {
        const transaction = await createTransactionInSupabase(transactionInput);
        setTransactions((currentTransactions) => [transaction, ...currentTransactions]);
      },
      addTransactions: async (transactionInputs) => {
        const createdTransactions = await createTransactionsInSupabase(transactionInputs);
        setTransactions((currentTransactions) => [...createdTransactions, ...currentTransactions]);
        return createdTransactions.length;
      },
      updateTransaction: async (transactionId, transactionInput) => {
        const updatedTransaction = await updateTransactionInSupabase(transactionId, transactionInput);
        setTransactions((currentTransactions) =>
          currentTransactions.map((transaction) =>
            transaction.id === updatedTransaction.id ? updatedTransaction : transaction
          )
        );
      },
      refundTransaction: async (transaction, refund) => {
        const updatedTransaction = await refundTransactionInSupabase(transaction, refund);
        setTransactions((currentTransactions) =>
          currentTransactions.map((currentTransaction) =>
            currentTransaction.id === updatedTransaction.id ? updatedTransaction : currentTransaction
          )
        );
      },
      cancelTransactionRefund: async (transaction) => {
        const updatedTransaction = await cancelTransactionRefundInSupabase(transaction);
        setTransactions((currentTransactions) =>
          currentTransactions.map((currentTransaction) =>
            currentTransaction.id === updatedTransaction.id ? updatedTransaction : currentTransaction
          )
        );
      },
      deleteTransaction: async (transactionId) => {
        await deleteTransactionInSupabase(transactionId);
        setTransactions((currentTransactions) =>
          currentTransactions.filter((transaction) => transaction.id !== transactionId)
        );
      },
      resetData: async () => {
        setError("");
        setIsLoading(true);

        try {
          const data = await resetSupabaseData();
          setShops(data.shops);
          setTransactions(data.transactions);
        } catch (caughtError) {
          setError(caughtError instanceof Error ? caughtError.message : "Erreur Supabase");
        } finally {
          setIsLoading(false);
        }
      }
    }),
    [error, isLoading, shops, transactions]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useClientData() {
  const value = useContext(DataContext);

  if (!value) {
    throw new Error("useClientData must be used inside ClientDataProvider");
  }

  return value;
}
