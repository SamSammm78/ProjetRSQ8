"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { MetricGrid } from "@/components/metric-grid";
import { OrderDetailModal } from "@/components/supplier-orders/order-detail-modal";
import { PageShell } from "@/components/page-shell";
import { getHistoricalSupplierOrders } from "@/lib/supplier-orders";
import { getMonthStartIsoDate, getTodayIsoDate } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SupplierOrder } from "@/lib/types";

export default function HistoriqueCommandesPage() {
  const [appliedEndDate, setAppliedEndDate] = useState(() => getTodayIsoDate());
  const [appliedStartDate, setAppliedStartDate] = useState(() => getMonthStartIsoDate());
  const [endDate, setEndDate] = useState(() => getTodayIsoDate());
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [startDate, setStartDate] = useState(() => getMonthStartIsoDate());

  async function loadOrders(nextStartDate = appliedStartDate, nextEndDate = appliedEndDate) {
    setError("");
    setIsLoading(true);

    try {
      setOrders(await getHistoricalSupplierOrders(nextStartDate, nextEndDate));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erreur Supabase");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    loadOrders(startDate, endDate);
  }

  function resetFilters() {
    const nextStartDate = getMonthStartIsoDate();
    const nextEndDate = getTodayIsoDate();
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setAppliedStartDate(nextStartDate);
    setAppliedEndDate(nextEndDate);
    loadOrders(nextStartDate, nextEndDate);
  }

  const stats = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const byPlatform = groupTotals(orders, "platform");
    const byCountry = groupTotals(orders, "country");

    return {
      average: orders.length > 0 ? total / orders.length : 0,
      byCountry,
      byPlatform,
      count: orders.length,
      total
    };
  }, [orders]);

  return (
    <PageShell
      eyebrow="Historique"
      title="Historique des commandes"
      actions={
        <Link
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-sage bg-white px-4 text-sm font-semibold"
          href="/commandes"
        >
          <ArrowLeft size={18} />
          Retour aux commandes
        </Link>
      }
    >
      <section className="grid gap-4 rounded-lg border border-sage bg-white p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <DateInput label="Date de debut" value={startDate} onChange={setStartDate} />
          <DateInput label="Date de fin" value={endDate} onChange={setEndDate} />
          <button
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-moss px-4 font-semibold text-white sm:self-end"
            onClick={applyFilters}
          >
            <Search size={18} />
            Appliquer
          </button>
          <button
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-sage px-4 font-semibold sm:self-end"
            onClick={resetFilters}
          >
            <RotateCcw size={18} />
            Reinitialiser
          </button>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-ink/60">Chargement de l&apos;historique...</p> : null}
      {error ? <p className="text-sm font-medium text-clay">{error}</p> : null}

      <MetricGrid>
        <KpiCard label="Commandes" value={String(stats.count)} icon={Search} />
        <KpiCard label="Montant total" value={formatCurrency(stats.total)} icon={Search} />
        <KpiCard label="Montant moyen" value={formatCurrency(stats.average)} icon={Search} />
      </MetricGrid>

      <section className="grid gap-4 xl:grid-cols-2">
        <TotalsPanel title="Montant total par plateforme" totals={stats.byPlatform} />
        <TotalsPanel title="Montant total par pays" totals={stats.byCountry} />
      </section>

      <HistoricalOrdersTable orders={orders} onOpen={(order) => setSelectedOrder(order)} />

      {selectedOrder ? (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderChange={(updatedOrder) => {
            setSelectedOrder(updatedOrder);
            setOrders((currentOrders) =>
              currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
            );
          }}
        />
      ) : null}
    </PageShell>
  );
}

function DateInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink/70">
      {label}
      <input
        className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function groupTotals(orders: SupplierOrder[], key: "platform" | "country") {
  return orders.reduce<Record<string, number>>((totals, order) => {
    const label = order[key] || "Non renseigne";
    totals[label] = (totals[label] ?? 0) + order.totalAmount;
    return totals;
  }, {});
}

function TotalsPanel({ title, totals }: { title: string; totals: Record<string, number> }) {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <section className="rounded-lg border border-sage bg-white shadow-soft">
      <div className="border-b border-sage p-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-sage">
        {entries.length === 0 ? (
          <p className="p-4 text-sm text-ink/60">Aucune donnee sur cette periode.</p>
        ) : (
          entries.map(([label, total]) => (
            <div key={label} className="flex items-center justify-between gap-3 p-4">
              <p className="font-medium">{label}</p>
              <p className="font-semibold text-moss">{formatCurrency(total)}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function HistoricalOrdersTable({
  orders,
  onOpen
}: {
  orders: SupplierOrder[];
  onOpen: (order: SupplierOrder) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-sage bg-white p-8 text-center text-sm text-ink/60">
        Aucune ancienne commande sur cette periode.
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
              <th className="px-4 py-3">Images</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Terminee le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-mist/70">
                <td className="px-4 py-4 font-medium">{order.platform || "-"}</td>
                <td className="px-4 py-4">{order.accountUsed || "-"}</td>
                <td className="px-4 py-4">{formatDate(order.orderDate)}</td>
                <td className="px-4 py-4">
                  <button
                    className="font-semibold text-moss underline"
                    onClick={() => onOpen(order)}
                  >
                    {order.orderNumber || "Ouvrir"}
                  </button>
                </td>
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
                <td className="px-4 py-4">
                  <button className="font-medium text-ink/70" onClick={() => onOpen(order)}>
                    📷 {order.images.length}
                  </button>
                </td>
                <td className="max-w-64 px-4 py-4 text-ink/65">{order.notes || "-"}</td>
                <td className="px-4 py-4">
                  {order.completedAt ? formatDate(order.completedAt.slice(0, 10)) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
