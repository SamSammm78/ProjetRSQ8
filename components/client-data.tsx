"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getStoredShops,
  getStoredTransactions,
  saveStoredShops,
  saveStoredTransactions
} from "@/lib/local-store";
import type { Shop, Transaction } from "@/lib/types";

type DataContextValue = {
  shops: Shop[];
  transactions: Transaction[];
  setShops: (shops: Shop[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  resetData: () => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function ClientDataProvider({ children }: { children: React.ReactNode }) {
  const [shops, setShopsState] = useState<Shop[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);

  useEffect(() => {
    setShopsState(getStoredShops());
    setTransactionsState(getStoredTransactions());
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      shops,
      transactions,
      setShops: (nextShops) => {
        setShopsState(nextShops);
        saveStoredShops(nextShops);
      },
      setTransactions: (nextTransactions) => {
        setTransactionsState(nextTransactions);
        saveStoredTransactions(nextTransactions);
      },
      resetData: () => {
        window.localStorage.removeItem("etsy-dashboard-shops");
        window.localStorage.removeItem("etsy-dashboard-transactions");
        setShopsState(getStoredShops());
        setTransactionsState(getStoredTransactions());
      }
    }),
    [shops, transactions]
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
