"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, History } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { completeSupplierOrder, getActiveSupplierOrders } from "@/lib/supplier-orders";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SupplierOrder } from "@/lib/types";

export default function CommandesPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);

  async function loadOrders() {
    setError("");
    setIsLoading(true);

    try {
      setOrders(await getActiveSupplierOrders());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erreur Supabase");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function markCompleted(orderId: string) {
    setError("");

    try {
      await completeSupplierOrder(orderId);
      setOrders((currentOrders) => currentOrders.filter((order) => order.id !== orderId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erreur Supabase");
    }
  }

  return (
    <PageShell
      eyebrow="Commandes"
      title="Commandes en cours"
      actions={
        <Link
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-sage bg-white px-4 text-sm font-semibold"
          href="/commandes/historique"
        >
          <History size={18} />
          Voir l&apos;historique
        </Link>
      }
    >
      {isLoading ? <p className="text-sm text-ink/60">Chargement des commandes...</p> : null}
      {error ? <p className="text-sm font-medium text-clay">{error}</p> : null}

      <SupplierOrdersTable orders={orders} onComplete={markCompleted} />
    </PageShell>
  );
}

function SupplierOrdersTable({
  orders,
  onComplete
}: {
  orders: SupplierOrder[];
  onComplete: (orderId: string) => void | Promise<void>;
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-sage bg-white p-8 text-center text-sm text-ink/60">
        Aucune commande en cours.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-sage bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-sage text-left text-sm">
          <thead className="bg-mist text-xs uppercase tracking-normal text-ink/55">
            <tr>
              <th className="px-4 py-3">Plateforme</th>
              <th className="px-4 py-3">Compte</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Commande</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Lien</th>
              <th className="px-4 py-3">Pays</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-mist/70">
                <td className="px-4 py-4 font-medium">{order.platform || "-"}</td>
                <td className="px-4 py-4">{order.accountUsed || "-"}</td>
                <td className="px-4 py-4">{formatDate(order.orderDate)}</td>
                <td className="px-4 py-4">{order.orderNumber || "-"}</td>
                <td className="px-4 py-4 font-semibold">{formatCurrency(order.totalAmount)}</td>
                <td className="px-4 py-4">
                  {order.orderLink ? (
                    <a className="font-medium text-moss underline" href={order.orderLink} rel="noreferrer" target="_blank">
                      Ouvrir
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-4">{order.country || "-"}</td>
                <td className="max-w-64 px-4 py-4 text-ink/65">{order.notes || "-"}</td>
                <td className="px-4 py-4 text-right">
                  <button
                    className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-moss px-3 text-sm font-semibold text-white"
                    onClick={() => onComplete(order.id)}
                  >
                    <Check size={16} />
                    Termine
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
