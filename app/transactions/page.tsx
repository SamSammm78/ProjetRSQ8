"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, RotateCcw, Save, X } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { TransactionsTable } from "@/components/transactions-table";
import { useClientData } from "@/components/client-data";
import { exportTransactions, normalizeTransactionInput } from "@/lib/api";
import { calculateRefundedTransactionProfit, calculateTransactionMetrics } from "@/lib/calculations";
import { getMonthStartIsoDate, getTodayIsoDate } from "@/lib/dates";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { alertSupabaseError } from "@/lib/supabase-error";
import type { RefundType, Shop, Transaction, TransactionInput } from "@/lib/types";

const LAST_SHOP_KEY = "projetrsq8:last-transaction-shop";

function createEmptyForm(shopId = "", date = getTodayIsoDate()): TransactionInput {
  return {
    shopId,
    date,
    month: `${date.slice(0, 7)}-01`,
    orderNumber: "",
    status: "paid",
    grossRevenue: 0,
    refunds: 0,
    etsyFees: 0,
    etsyAds: 0,
    productCost: 0,
    shippingPaid: 0,
    otherFees: 0,
    notes: "",
    refundType: null,
    refundAmount: 0,
    refundedAt: null,
    productCostRecovered: false,
    etsyFeesRefunded: 0
  };
}

function parseAmount(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

export default function TransactionsPage() {
  const {
    addTransaction: saveTransaction,
    cancelTransactionRefund,
    error,
    isLoading,
    refundTransaction,
    shops,
    transactions,
    updateTransaction
  } = useClientData();
  const [form, setForm] = useState<TransactionInput>(() => createEmptyForm());
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startDate, setStartDate] = useState(() => getMonthStartIsoDate());
  const [endDate, setEndDate] = useState(() => getTodayIsoDate());
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);
  const transactionsListRef = useRef<HTMLElement>(null);

  const preview = calculateTransactionMetrics(form);

  useEffect(() => {
    if (form.shopId || shops.length === 0) {
      return;
    }

    const lastShopId =
      typeof window !== "undefined" ? window.localStorage.getItem(LAST_SHOP_KEY) : "";
    const fallbackShop = shops.find((shop) => shop.id === lastShopId) ?? shops[0];

    setForm((current) => ({ ...current, shopId: fallbackShop.id }));
  }, [form.shopId, shops]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) => transaction.date >= startDate && transaction.date <= endDate
      ),
    [endDate, startDate, transactions]
  );
  const sortedTransactions = useMemo(
    () => [...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredTransactions]
  );

  function updateField(key: keyof TransactionInput, value: string) {
    setForm((current) => {
      const nextValue =
        key === "shopId" ||
        key === "date" ||
        key === "month" ||
        key === "orderNumber" ||
        key === "status" ||
        key === "notes" ||
        key === "refundType" ||
        key === "refundedAt"
          ? value
          : parseAmount(value);
      const nextForm = { ...current, [key]: nextValue };

      if (key === "date") {
        nextForm.month = `${value.slice(0, 7)}-01`;
      }

      return nextForm;
    });
  }

  function validateForm(input: TransactionInput, ignoredTransactionId?: string) {
    if (!input.shopId) {
      return "Choisis une boutique avant d'enregistrer.";
    }

    if (input.grossRevenue <= 0) {
      return "Le montant recu doit etre superieur a zero.";
    }

    if (input.etsyFees < 0) {
      return "Les frais Etsy ne peuvent pas etre negatifs.";
    }

    if (input.productCost < 0) {
      return "Le cout du produit ne peut pas etre negatif.";
    }

    const orderNumber = input.orderNumber.trim();
    if (!orderNumber) {
      return "Ajoute le numero de commande Etsy.";
    }

    const duplicate = transactions.some(
      (transaction) =>
        transaction.id !== ignoredTransactionId &&
        transaction.shopId === input.shopId &&
        transaction.orderNumber.trim().toLowerCase() === orderNumber.toLowerCase()
    );

    return duplicate ? "Cette commande existe deja pour cette boutique." : "";
  }

  async function saveSale() {
    const normalized = normalizeTransactionInput({
      ...form,
      orderNumber: form.orderNumber.trim(),
      month: `${form.date.slice(0, 7)}-01`
    });
    const validationError = validateForm(normalized);

    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await saveTransaction(normalized);
      window.localStorage.setItem(LAST_SHOP_KEY, normalized.shopId);
      setForm(createEmptyForm(normalized.shopId, normalized.date));
      setIsAdvancedOpen(false);
      window.setTimeout(() => transactionsListRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    } catch (caughtError) {
      alertSupabaseError(caughtError);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEditedTransaction(updated: TransactionInput) {
    if (!editingTransaction) {
      return;
    }

    const normalized = normalizeTransactionInput(updated);
    const validationError = validateForm(normalized, editingTransaction.id);

    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await updateTransaction(editingTransaction.id, normalized);
      setEditingTransaction(null);
    } catch (caughtError) {
      alertSupabaseError(caughtError);
    } finally {
      setIsSaving(false);
    }
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Nouvelle vente</h2>
        </div>
        <div className="mt-4 grid gap-3 md:max-w-2xl">
          <SelectField label="Boutique" value={form.shopId} onChange={(value) => updateField("shopId", value)}>
            <option value="">Choisir une boutique</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </SelectField>
          <InputField
            ref={orderInputRef}
            label="Commande Etsy"
            value={form.orderNumber}
            onChange={(value) => updateField("orderNumber", value)}
            inputMode="numeric"
          />
          <InputField
            label="Montant recu"
            value={form.grossRevenue || ""}
            onChange={(value) => updateField("grossRevenue", value)}
            inputMode="decimal"
            suffix="EUR"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Frais Etsy"
              value={form.etsyFees}
              onChange={(value) => updateField("etsyFees", value)}
              inputMode="decimal"
              suffix="EUR"
            />
            <InputField
              label="Cout du produit"
              value={form.productCost || ""}
              onChange={(value) => updateField("productCost", value)}
              inputMode="decimal"
              suffix="EUR"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 rounded-lg bg-mist p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink/65">Benefice</span>
            <strong className={preview.netProfit >= 0 ? "text-moss" : "text-clay"}>
              {formatCurrency(preview.netProfit)}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink/65">Marge</span>
            <strong>{formatPercent(preview.margin)}</strong>
          </div>
        </div>

        <div className="mt-4">
          <button
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-moss px-5 font-semibold text-white disabled:opacity-60"
            onClick={saveSale}
            disabled={isSaving}
          >
            <Save size={18} />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>

        <details className="mt-4" open={isAdvancedOpen} onToggle={(event) => setIsAdvancedOpen(event.currentTarget.open)}>
          <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-2 text-sm font-semibold text-ink/70">
            <ChevronDown size={17} />
            Details avances
          </summary>
          <AdvancedFields form={form} onChange={updateField} />
        </details>
      </section>

      {isLoading ? <p className="text-sm text-ink/60">Chargement des transactions...</p> : null}
      {error ? <p className="text-sm font-medium text-clay">{error}</p> : null}

      <section ref={transactionsListRef} className="grid gap-4 rounded-lg border border-sage bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Liste des transactions</h2>
          <p className="text-sm text-ink/60">
            {sortedTransactions.length} transaction{sortedTransactions.length > 1 ? "s" : ""} sur
            la periode selectionnee.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField label="Date de debut" type="date" value={startDate} onChange={setStartDate} />
          <InputField label="Date de fin" type="date" value={endDate} onChange={setEndDate} />
        </div>
      </section>

      <TransactionsTable
        transactions={sortedTransactions}
        shops={shops}
        onEdit={setEditingTransaction}
        onRefund={setRefundTarget}
        onView={setSelectedTransaction}
      />

      {selectedTransaction ? (
        <TransactionDetailModal
          shops={shops}
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onCorrectRefund={() => {
            setRefundTarget(selectedTransaction);
            setSelectedTransaction(null);
          }}
        />
      ) : null}
      {editingTransaction ? (
        <EditTransactionModal
          isSaving={isSaving}
          shops={shops}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={saveEditedTransaction}
        />
      ) : null}
      {refundTarget ? (
        <RefundModal
          isSaving={isSaving}
          transaction={refundTarget}
          onCancelRefund={async () => {
            if (!window.confirm("Annuler le remboursement de cette transaction ?")) {
              return;
            }

            setIsSaving(true);
            try {
              await cancelTransactionRefund(refundTarget);
              setRefundTarget(null);
            } finally {
              setIsSaving(false);
            }
          }}
          onClose={() => setRefundTarget(null)}
          onConfirm={async (refundType, etsyFeesRefunded) => {
            setIsSaving(true);
            try {
              await refundTransaction(refundTarget, {
                refundType,
                etsyFeesRefunded,
                productCostRecovered: refundType === "full_product_recovered"
              });
              setRefundTarget(null);
            } catch (caughtError) {
              alertSupabaseError(caughtError);
            } finally {
              setIsSaving(false);
            }
          }}
        />
      ) : null}
    </PageShell>
  );
}

function AdvancedFields({
  form,
  onChange
}: {
  form: TransactionInput;
  onChange: (key: keyof TransactionInput, value: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <InputField label="Date de la vente" type="date" value={form.date} onChange={(value) => onChange("date", value)} />
      <InputField label="Livraison fournisseur" value={form.shippingPaid || ""} onChange={(value) => onChange("shippingPaid", value)} inputMode="decimal" />
      <InputField label="Offsite Ads" value={form.etsyAds || ""} onChange={(value) => onChange("etsyAds", value)} inputMode="decimal" />
      <InputField label="Autres frais" value={form.otherFees || ""} onChange={(value) => onChange("otherFees", value)} inputMode="decimal" />
      <label className="grid gap-2 text-sm font-medium text-ink/70 sm:col-span-2 xl:col-span-3">
        Notes
        <textarea
          className="focus-ring min-h-24 rounded-lg border border-sage bg-mist px-3 py-3 text-ink"
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
        />
      </label>
    </div>
  );
}

function TransactionDetailModal({
  shops,
  transaction,
  onClose,
  onCorrectRefund
}: {
  shops: Shop[];
  transaction: Transaction;
  onClose: () => void;
  onCorrectRefund: () => void;
}) {
  const shopName = shops.find((shop) => shop.id === transaction.shopId)?.name ?? "Boutique";

  return (
    <Modal title={`Commande #${transaction.orderNumber || "-"}`} onClose={onClose}>
      <div className="grid gap-2 text-sm">
        <DetailRow label="Boutique" value={shopName} />
        <DetailRow label="Date" value={formatDate(transaction.date)} />
        <DetailRow label="CA brut initial" value={formatCurrency(transaction.grossRevenue)} />
        <DetailRow label="Remboursement" value={formatCurrency(transaction.refundAmount)} />
        <DetailRow label="CA net" value={formatCurrency(transaction.netRevenue)} />
        <DetailRow label="Benefice final" value={formatCurrency(transaction.netProfit)} />
        <DetailRow label="Frais Etsy" value={formatCurrency(transaction.etsyFees)} />
        <DetailRow label="Frais Etsy rembourses" value={formatCurrency(transaction.etsyFeesRefunded)} />
        <DetailRow label="Offsite Ads" value={formatCurrency(transaction.etsyAds)} />
        <DetailRow label="Cout produit" value={formatCurrency(transaction.productCost)} />
        <DetailRow label="Livraison fournisseur" value={formatCurrency(transaction.shippingPaid)} />
        {transaction.refundedAt ? <DetailRow label="Date remboursement" value={formatDate(transaction.refundedAt.slice(0, 10))} /> : null}
        {transaction.notes ? <p className="mt-2 rounded-lg bg-mist p-3 text-ink/70">{transaction.notes}</p> : null}
      </div>
      {transaction.status === "refunded" ? (
        <button className="focus-ring mt-4 h-11 rounded-lg border border-sage bg-white px-4 text-sm font-semibold" onClick={onCorrectRefund}>
          Corriger le remboursement
        </button>
      ) : null}
    </Modal>
  );
}

function EditTransactionModal({
  isSaving,
  shops,
  transaction,
  onClose,
  onSave
}: {
  isSaving: boolean;
  shops: Shop[];
  transaction: Transaction;
  onClose: () => void;
  onSave: (transaction: TransactionInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TransactionInput>(transaction);

  function updateDraft(key: keyof TransactionInput, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: key === "shopId" || key === "date" || key === "month" || key === "orderNumber" || key === "status" || key === "notes" || key === "refundType" || key === "refundedAt" ? value : parseAmount(value),
      ...(key === "date" ? { month: `${value.slice(0, 7)}-01` } : {})
    }));
  }

  const preview = calculateTransactionMetrics(draft);

  return (
    <Modal title={`Modifier #${transaction.orderNumber || "-"}`} onClose={onClose}>
      <div className="grid gap-3">
        <SelectField label="Boutique" value={draft.shopId} onChange={(value) => updateDraft("shopId", value)}>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>{shop.name}</option>
          ))}
        </SelectField>
        <InputField label="Commande Etsy" value={draft.orderNumber} onChange={(value) => updateDraft("orderNumber", value)} />
        <InputField label="Montant recu" value={draft.grossRevenue || ""} onChange={(value) => updateDraft("grossRevenue", value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField label="Frais Etsy" value={draft.etsyFees} onChange={(value) => updateDraft("etsyFees", value)} inputMode="decimal" />
          <InputField label="Cout du produit" value={draft.productCost || ""} onChange={(value) => updateDraft("productCost", value)} inputMode="decimal" />
        </div>
        <AdvancedFields form={draft} onChange={updateDraft} />
        <div className="rounded-lg bg-mist p-3 text-sm">
          Benefice prevu : <strong>{formatCurrency(preview.netProfit)}</strong>
        </div>
        <button className="focus-ring h-11 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} onClick={() => onSave(draft)}>
          {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </Modal>
  );
}

function RefundModal({
  isSaving,
  transaction,
  onCancelRefund,
  onClose,
  onConfirm
}: {
  isSaving: boolean;
  transaction: Transaction;
  onCancelRefund: () => Promise<void>;
  onClose: () => void;
  onConfirm: (refundType: RefundType, etsyFeesRefunded: number) => Promise<void>;
}) {
  const [refundType, setRefundType] = useState<RefundType | "">(transaction.refundType ?? "");
  const [etsyFeesRefunded, setEtsyFeesRefunded] = useState(transaction.etsyFeesRefunded);
  const preview =
    refundType === ""
      ? null
      : calculateRefundedTransactionProfit({
          ...transaction,
          status: "refunded",
          refundType,
          refundAmount: transaction.grossRevenue,
          productCostRecovered: refundType === "full_product_recovered",
          etsyFeesRefunded
        });

  return (
    <Modal title={`Rembourser la commande #${transaction.orderNumber || "-"}`} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-2 rounded-lg bg-mist p-4 text-sm">
          <DetailRow label="Montant paye" value={formatCurrency(transaction.grossRevenue)} />
          <DetailRow label="Cout du produit" value={formatCurrency(transaction.productCost)} />
          <DetailRow label="Benefice actuel" value={formatCurrency(transaction.netProfit)} />
        </div>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">Type de remboursement</legend>
          <RefundChoice
            checked={refundType === "full_product_recovered"}
            description="Le client retourne le produit. Le cout du produit n'est plus compte comme une perte."
            label="Remboursement integral - produit recupere"
            onChange={() => setRefundType("full_product_recovered")}
          />
          <RefundChoice
            checked={refundType === "full_product_not_recovered"}
            description="Le client conserve le produit. Le cout du produit reste compte comme une perte."
            label="Remboursement integral - produit non recupere"
            onChange={() => setRefundType("full_product_not_recovered")}
          />
        </fieldset>
        <InputField
          label="Frais Etsy rembourses"
          value={etsyFeesRefunded || ""}
          onChange={(value) => setEtsyFeesRefunded(parseAmount(value))}
          inputMode="decimal"
        />
        <div className="grid gap-2 rounded-lg border border-sage p-4 text-sm">
          <p className="font-semibold">Avant remboursement</p>
          <DetailRow label="Benefice" value={formatCurrency(transaction.netProfit)} />
          <p className="mt-2 font-semibold">Apres remboursement</p>
          <DetailRow label="Resultat" value={formatCurrency(preview?.finalProfit ?? transaction.netProfit)} />
          <p className="text-ink/60">Cette transaction restera dans votre historique.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          {transaction.status === "refunded" ? (
            <button className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-clay px-4 text-sm font-semibold text-clay disabled:opacity-60" disabled={isSaving} onClick={onCancelRefund}>
              <RotateCcw size={16} />
              Annuler le remboursement
            </button>
          ) : <span />}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="focus-ring h-11 rounded-lg border border-sage bg-white px-4 text-sm font-semibold" onClick={onClose}>
              Annuler
            </button>
            <button
              className="focus-ring h-11 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isSaving || refundType === ""}
              onClick={() => refundType && onConfirm(refundType, etsyFeesRefunded)}
            >
              {isSaving ? "Enregistrement..." : "Confirmer le remboursement"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function RefundChoice({
  checked,
  description,
  label,
  onChange
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-sage p-3 text-sm">
      <input type="radio" checked={checked} onChange={onChange} />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="mt-1 block text-ink/60">{description}</span>
      </span>
    </label>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/55 p-0 sm:items-center sm:justify-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-soft sm:max-w-2xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-sage bg-white p-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-sage" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </section>
    </div>
  );
}

const InputField = forwardRef<
  HTMLInputElement,
  {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
    inputMode?: "decimal" | "numeric";
    suffix?: string;
  }
>(function InputField(
  {
    label,
    value,
    onChange,
    type = "text",
    inputMode,
    suffix
  },
  ref
) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink/70">
      {label}
      <span className="relative">
        <input
          ref={ref}
          className="focus-ring h-12 w-full rounded-lg border border-sage bg-mist px-3 pr-14 text-ink"
          type={type}
          step={type === "number" || inputMode === "decimal" ? "0.01" : undefined}
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/45">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
});

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink/60">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
