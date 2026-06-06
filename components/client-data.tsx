"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_USER_ID } from "@/data/seed";
import {
  getDemoShops,
  getDemoTransactions,
  saveDemoShops,
  saveDemoTransactions
} from "@/lib/demo-store";
import type { Shop, Transaction } from "@/lib/types";

type DataContextValue = {
  userId: string;
  shops: Shop[];
  transactions: Transaction[];
  setShops: (shops: Shop[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  resetDemo: () => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function ClientDataProvider({ children }: { children: React.ReactNode }) {
  const [shops, setShopsState] = useState<Shop[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);

  useEffect(() => {
    setShopsState(getDemoShops());
    setTransactionsState(getDemoTransactions());
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      userId: DEMO_USER_ID,
      shops,
      transactions,
      setShops: (nextShops) => {
        setShopsState(nextShops);
        saveDemoShops(nextShops);
      },
      setTransactions: (nextTransactions) => {
        setTransactionsState(nextTransactions);
        saveDemoTransactions(nextTransactions);
      },
      resetDemo: () => {
        window.localStorage.removeItem("etsy-dashboard-shops");
        window.localStorage.removeItem("etsy-dashboard-transactions");
        setShopsState(getDemoShops());
        setTransactionsState(getDemoTransactions());
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
