"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, History, Plus, X } from "lucide-react";
import { OrderDetailModal } from "@/components/supplier-orders/order-detail-modal";
import { OrderImagePicker } from "@/components/supplier-orders/order-image-picker";
import { PageShell } from "@/components/page-shell";
import {
  completeSupplierOrder,
  createSupplierOrder,
  getActiveSupplierOrders
} from "@/lib/supplier-orders";
import { alertSupabaseError } from "@/lib/supabase-error";
import { getTodayIsoDate } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SupplierOrder, SupplierOrderInput } from "@/lib/types";

function createEmptyOrderForm(): SupplierOrderInput {
  return {
    platform: "",
    accountUsed: "",
    orderDate: getTodayIsoDate(),
    orderNumber: "",
    totalAmount: 0,
    orderLink: "",
    country: "",
    notes: ""
  };
}

export default function CommandesPage() {
  const [error, setError] = useState("");
  const [form, setForm] = useState<SupplierOrderInput>(() => createEmptyOrderForm());
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);

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

  function updateFormField(key: keyof SupplierOrderInput, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: key === "totalAmount" ? Number(value) : value
    }));
  }

  async function addOrder() {
    setError("");
    setIsSubmitting(true);

    try {
      await createSupplierOrder(form, imageFiles);
      setForm(createEmptyOrderForm());
      setImageFiles([]);
      setIsFormOpen(false);
      await loadOrders();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur Supabase";
      setError(message);
      alertSupabaseError(caughtError);
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <>
          <button
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus size={18} />
            Ajouter une commande
          </button>
          <Link
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-sage bg-white px-4 text-sm font-semibold"
            href="/commandes/historique"
          >
            <History size={18} />
            Voir l&apos;historique
          </Link>
        </>
      }
    >
      {isFormOpen ? (
        <section className="rounded-lg border border-sage bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Nouvelle commande</h2>
            <button
              className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-sage"
              onClick={() => {
                setIsFormOpen(false);
                setImageFiles([]);
              }}
              title="Fermer"
            >
              <X size={17} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InputField label="Plateforme" value={form.platform} onChange={(value) => updateFormField("platform", value)} />
            <InputField label="Compte utilise" value={form.accountUsed} onChange={(value) => updateFormField("accountUsed", value)} />
            <InputField label="Date de commande" type="date" value={form.orderDate} onChange={(value) => updateFormField("orderDate", value)} />
            <InputField label="Numero de commande" value={form.orderNumber} onChange={(value) => updateFormField("orderNumber", value)} />
            <InputField label="Montant total" type="number" value={form.totalAmount} onChange={(value) => updateFormField("totalAmount", value)} />
            <InputField label="Lien commande" value={form.orderLink} onChange={(value) => updateFormField("orderLink", value)} />
            <InputField label="Pays" value={form.country} onChange={(value) => updateFormField("country", value)} />
            <label className="grid gap-2 text-sm font-medium text-ink/70 xl:col-span-4">
              Notes
              <textarea
                className="focus-ring min-h-24 rounded-lg border border-sage bg-mist px-3 py-3 text-ink"
                value={form.notes}
                onChange={(event) => updateFormField("notes", event.target.value)}
              />
            </label>
            <OrderImagePicker files={imageFiles} onChange={setImageFiles} />
          </div>
          <button
            className="focus-ring mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-moss px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={isSubmitting}
            onClick={addOrder}
          >
            <Plus size={18} />
            Valider la commande
          </button>
        </section>
      ) : null}

      {isLoading ? <p className="text-sm text-ink/60">Chargement des commandes...</p> : null}
      {error ? <p className="text-sm font-medium text-clay">{error}</p> : null}

      <SupplierOrdersTable
        orders={orders}
        onComplete={markCompleted}
        onOpen={(order) => setSelectedOrder(order)}
      />

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

function InputField({
  label,
  onChange,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string | number;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink/70">
      {label}
      <input
        className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3 text-ink"
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SupplierOrdersTable({
  orders,
  onComplete,
  onOpen
}: {
  orders: SupplierOrder[];
  onComplete: (orderId: string) => void | Promise<void>;
  onOpen: (order: SupplierOrder) => void;
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
              <th className="px-4 py-3">Images</th>
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
