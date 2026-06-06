"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { TransactionsTable } from "@/components/transactions-table";
import { useClientData } from "@/components/client-data";
import { createStoredTransaction } from "@/lib/local-store";
import { exportTransactions, normalizeTransactionInput } from "@/lib/api";
import type { TransactionInput } from "@/lib/types";

const emptyForm: TransactionInput = {
  shopId: "",
  date: "2026-06-06",
  month: "2026-06-01",
  orderNumber: "",
  status: "Payee",
  grossRevenue: 0,
  refunds: 0,
  etsyFees: 0,
  etsyAds: 0,
  productCost: 0,
  shippingPaid: 0,
  otherFees: 0,
  notes: ""
};

export default function TransactionsPage() {
  const { shops, transactions, setTransactions } = useClientData();
  const [form, setForm] = useState<TransactionInput>(emptyForm);
  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  function updateField(key: keyof TransactionInput, value: string) {
    setForm((current) => ({
      ...current,
      [key]: key === "shopId" || key === "date" || key === "month" || key === "orderNumber" || key === "status" || key === "notes"
        ? value
        : Number(value)
    }));
  }

  function addTransaction() {
    const shopId = form.shopId || shops[0]?.id;
    if (!shopId) {
      return;
    }

    const transaction = createStoredTransaction(normalizeTransactionInput({ ...form, shopId }));
    setTransactions([transaction, ...transactions]);
    setForm({ ...emptyForm, shopId, date: form.date, month: `${form.date.slice(0, 7)}-01` });
  }

  function deleteTransaction(transactionId: string) {
    setTransactions(transactions.filter((transaction) => transaction.id !== transactionId));
  }

  function downloadJson() {
    const data = JSON.stringify(exportTransactions(transactions), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "etsy-transactions.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell
      eyebrow="Transactions"
      title="Ajouter et consulter les ventes"
      actions={
        <button
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-sage bg-white px-4 text-sm font-semibold"
          onClick={downloadJson}
        >
          <Download size={18} />
          Export JSON
        </button>
      }
    >
      <section className="rounded-lg border border-sage bg-white p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField label="Boutique" value={form.shopId} onChange={(value) => updateField("shopId", value)}>
            <option value="">Choisir</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </SelectField>
          <InputField label="Date" type="date" value={form.date} onChange={(value) => updateField("date", value)} />
          <InputField label="Commande" value={form.orderNumber} onChange={(value) => updateField("orderNumber", value)} />
          <InputField label="CA brut" type="number" value={form.grossRevenue} onChange={(value) => updateField("grossRevenue", value)} />
          <InputField label="Remboursements" type="number" value={form.refunds} onChange={(value) => updateField("refunds", value)} />
          <InputField label="Frais Etsy" type="number" value={form.etsyFees} onChange={(value) => updateField("etsyFees", value)} />
          <InputField label="Pub Etsy" type="number" value={form.etsyAds} onChange={(value) => updateField("etsyAds", value)} />
          <InputField label="Cout produit" type="number" value={form.productCost} onChange={(value) => updateField("productCost", value)} />
        </div>
        <button
          className="focus-ring mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-moss px-5 font-semibold text-white sm:w-auto"
          onClick={addTransaction}
        >
          <Plus size={18} />
          Ajouter la transaction
        </button>
      </section>

      <TransactionsTable transactions={sortedTransactions} shops={shops} />

      <section className="grid gap-2">
        {sortedTransactions.map((transaction) => (
          <button
            key={transaction.id}
            className="focus-ring inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-sage bg-white px-3 text-sm text-clay"
            onClick={() => deleteTransaction(transaction.id)}
          >
            <Trash2 size={16} />
            Supprimer {transaction.orderNumber || transaction.date}
          </button>
        ))}
      </section>
    </PageShell>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink/70">
      {label}
      <input
        className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3 text-ink"
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink/70">
      {label}
      <select
        className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3 text-ink"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
