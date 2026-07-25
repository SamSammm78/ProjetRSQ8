"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";
import { calculateFinalProfit } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  cancelSupplierOrderFinalization,
  finalizeSupplierOrder
} from "@/lib/order-workflow";
import { alertSupabaseError } from "@/lib/supabase-error";
import type { SupplierOrder, Transaction } from "@/lib/types";

export function FinalizeOrderControl({
  compact = false,
  onChange,
  order,
  transaction
}: {
  compact?: boolean;
  onChange: () => void | Promise<void>;
  order: SupplierOrder;
  transaction: Transaction | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const effectiveTransaction = transaction
    ? {
        ...transaction,
        actualSupplierCost: order.actualSupplierCost,
        shippingPaid: order.supplierShipping
      }
    : null;
  const profit = effectiveTransaction ? calculateFinalProfit(effectiveTransaction) : 0;

  async function finalize() {
    setIsSaving(true);
    try {
      await finalizeSupplierOrder(order.id);
      setIsOpen(false);
      await onChange();
    } catch (error) {
      alertSupabaseError(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelFinalization() {
    if (!window.confirm("Annuler la finalisation de cette commande ? Elle sera retiree du bilan.")) {
      return;
    }
    setIsSaving(true);
    try {
      await cancelSupplierOrderFinalization(order.id);
      await onChange();
    } catch (error) {
      alertSupabaseError(error);
    } finally {
      setIsSaving(false);
    }
  }

  if (order.isFinalized) {
    return (
      <div className={compact ? "grid gap-1" : "grid gap-3"}>
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-mist px-2 py-1 text-xs font-semibold text-moss">
          <CheckCircle2 size={14} /> Finalisee
        </span>
        {order.finalizedAt ? (
          <span className="text-xs text-ink/55">
            {formatDate(order.finalizedAt.slice(0, 10))}
          </span>
        ) : null}
        {!compact ? (
          <button
            type="button"
            className="focus-ring inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-sage px-3 text-sm font-semibold text-ink/70 disabled:opacity-60"
            disabled={isSaving}
            onClick={cancelFinalization}
          >
            <RotateCcw size={16} /> Annuler la finalisation
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={
          compact
            ? "focus-ring inline-flex h-9 items-center gap-1 rounded-lg border border-moss px-3 text-xs font-semibold text-moss"
            : "focus-ring inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white"
        }
        onClick={() => setIsOpen(true)}
      >
        <CheckCircle2 size={compact ? 15 : 17} /> Finaliser la commande
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/60 sm:items-center sm:justify-center sm:p-4">
          <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-soft sm:max-w-lg sm:rounded-lg">
            <div className="flex items-start justify-between gap-4 border-b border-sage p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-moss">Validation manuelle</p>
                <h2 className="mt-1 text-xl font-semibold">
                  Finaliser la commande #{order.etsyOrderNumber || order.supplierOrderNumber || "-"}
                </h2>
              </div>
              <button
                type="button"
                className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-sage"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-4">
              <p className="text-sm leading-6 text-ink/65">
                Cette commande sera consideree comme terminee et integree dans le bilan des ventes finalisees.
              </p>
              {order.logisticsStatus !== "delivered" ? (
                <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                  Cette commande n&apos;est pas encore marquee comme livree. Confirme uniquement si son traitement est reellement termine.
                </p>
              ) : null}
              <div className="grid gap-2 rounded-lg bg-mist p-4 text-sm">
                <Line label="Montant recu" value={formatCurrency(transaction?.grossRevenue ?? 0)} />
                <Line label="Frais Etsy" value={formatCurrency(transaction?.etsyFees ?? 0)} />
                <Line label="Cout du produit" value={formatCurrency(order.actualSupplierCost ?? order.estimatedProductCost)} />
                <Line label="Benefice actuel" value={formatCurrency(profit)} />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="focus-ring h-11 rounded-lg border border-sage px-4 text-sm font-semibold"
                  disabled={isSaving}
                  onClick={() => setIsOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="focus-ring h-11 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={isSaving || !transaction}
                  onClick={finalize}
                >
                  {isSaving ? "Finalisation..." : "Confirmer la finalisation"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink/60">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}
