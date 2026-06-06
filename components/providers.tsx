"use client";

import { ClientDataProvider } from "@/components/client-data";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ClientDataProvider>{children}</ClientDataProvider>;
}
