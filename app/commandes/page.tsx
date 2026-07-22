"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, History, PackagePlus, Plus, Search, X } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { OrderImagePicker } from "@/components/supplier-orders/order-image-picker";
import { useClientData } from "@/components/client-data";
import { getOrderAlerts, getOrderProblems, getSupplierAccounts, getSupplierSettings, markSupplierOrderDelivered } from "@/lib/order-workflow";
import { createSupplierOrder, getAllSupplierOrders } from "@/lib/supplier-orders";
import { alertSupabaseError } from "@/lib/supabase-error";
import { getTodayIsoDate } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LogisticsStatus, SupplierAccount, SupplierOrder, SupplierOrderInput, SupplierOrderProblem, SupplierSettings } from "@/lib/types";

const STATUS_LABELS: Record<LogisticsStatus, string> = {
  to_order: "A commander",
  ordered: "Commandees",
  shipped: "Expediees",
  delivered: "Livrees",
  problem: "Problemes",
  cancelled: "Annulees",
  lost: "Perdues"
};

const FINANCIAL_LABELS = {
  paid: "Payee",
  partially_refunded: "Partiellement remboursee",
  refunded: "Remboursee",
  dispute: "Litige en cours"
};

const DEFAULT_SETTINGS: SupplierSettings = {
  supplierOrderAlertHours: 12,
  supplierShippingAlertDays: 5,
  deliveryLateAlertDays: 0
};

type Tab = "all" | LogisticsStatus;

function emptyManualOrder(): SupplierOrderInput {
  return {
    platform: "AliExpress",
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
  return <Suspense fallback={<PageShell eyebrow="AliExpress" title="Suivi des commandes"><p className="text-sm text-ink/60">Chargement des commandes...</p></PageShell>}><CommandesContent /></Suspense>;
}

function CommandesContent() {
  const searchParams = useSearchParams();
  const { shops, transactions } = useClientData();
  const requestedFilter = searchParams.get("filter");
  const specialFilter = requestedFilter && ["shipping_late", "delivery_late", "reminder"].includes(requestedFilter)
    ? requestedFilter
    : null;
  const [activeTab, setActiveTab] = useState<Tab>(
    requestedFilter && requestedFilter in STATUS_LABELS ? (requestedFilter as LogisticsStatus) : "all"
  );
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [accounts, setAccounts] = useState<SupplierAccount[]>([]);
  const [problems, setProblems] = useState<SupplierOrderProblem[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState<SupplierOrderInput>(emptyManualOrder);
  const [images, setImages] = useState<File[]>([]);

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      const [nextOrders, nextAccounts, nextProblems, nextSettings] = await Promise.all([
        getAllSupplierOrders(),
        getSupplierAccounts(),
        getOrderProblems(),
        getSupplierSettings()
      ]);
      setOrders(nextOrders);
      setAccounts(nextAccounts);
      setProblems(nextProblems);
      setSettings(nextSettings);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erreur Supabase");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const transactionById = useMemo(
    () => new Map(transactions.map((transaction) => [transaction.id, transaction])),
    [transactions]
  );
  const shopNameById = useMemo(() => new Map(shops.map((shop) => [shop.id, shop.name])), [shops]);
  const accountNameById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  );
  const hydratedOrders = useMemo(
    () => orders.map((order) => ({ ...order, transaction: order.transactionId ? transactionById.get(order.transactionId) ?? null : null })),
    [orders, transactionById]
  );

  const counts = useMemo(() => {
    const result = { all: hydratedOrders.length } as Record<Tab, number>;
    Object.keys(STATUS_LABELS).forEach((status) => {
      result[status as LogisticsStatus] = hydratedOrders.filter((order) => order.logisticsStatus === status).length;
    });
    return result;
  }, [hydratedOrders]);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rank: Record<LogisticsStatus, number> = { problem: 0, to_order: 1, ordered: 2, shipped: 3, lost: 4, delivered: 5, cancelled: 6 };
    return hydratedOrders
      .filter((order) => activeTab === "all" || order.logisticsStatus === activeTab)
      .filter((order) => !specialFilter || getOrderAlerts(order, settings, problems.filter((problem) => problem.orderId === order.id)).some((alert) => alert.type === specialFilter))
      .filter((order) => !accountFilter || order.supplierAccountId === accountFilter)
      .filter((order) => {
        if (!normalizedQuery) return true;
        const shopName = shopNameById.get(order.shopId ?? "") ?? "";
        const accountName = accountNameById.get(order.supplierAccountId ?? "") ?? order.accountUsed;
        return [order.etsyOrderNumber, order.supplierOrderNumber, order.trackingNumber, shopName, accountName, order.supplierUrl, order.notes]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => rank[a.logisticsStatus] - rank[b.logisticsStatus] || b.saleDate.localeCompare(a.saleDate));
  }, [accountFilter, accountNameById, activeTab, hydratedOrders, problems, query, settings, shopNameById, specialFilter]);

  async function deliver(orderId: string) {
    setIsSaving(true);
    try {
      await markSupplierOrderDelivered(orderId, new Date().toISOString());
      await load();
    } catch (caughtError) {
      alertSupabaseError(caughtError);
    } finally {
      setIsSaving(false);
    }
  }

  async function addManualOrder() {
    if (!manualForm.orderNumber.trim()) {
      alert("Ajoute le numero de commande fournisseur.");
      return;
    }
    setIsSaving(true);
    try {
      await createSupplierOrder(manualForm, images);
      setManualForm(emptyManualOrder());
      setImages([]);
      setIsManualOpen(false);
      await load();
    } catch (caughtError) {
      alertSupabaseError(caughtError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageShell
      eyebrow="AliExpress"
      title="Suivi des commandes"
      actions={
        <>
          <button className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-sage bg-white px-4 text-sm font-semibold" onClick={() => setIsManualOpen(true)}>
            <Plus size={18} /> Commande hors vente
          </button>
          <Link className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-sage bg-white px-4 text-sm font-semibold" href="/commandes/historique">
            <History size={18} /> Historique
          </Link>
        </>
      }
    >
      <section className="grid gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <TabButton active={activeTab === "all"} label="Toutes" count={counts.all} onClick={() => setActiveTab("all")} />
          {(["to_order", "ordered", "shipped", "delivered", "problem", "cancelled"] as LogisticsStatus[]).map((status) => (
            <TabButton key={status} active={activeTab === status} label={STATUS_LABELS[status]} count={counts[status]} onClick={() => setActiveTab(status)} />
          ))}
        </div>
        <div className="grid gap-3 rounded-lg border border-sage bg-white p-3 shadow-soft md:grid-cols-[1fr_260px_auto]">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" size={18} />
            <input className="focus-ring h-11 w-full min-w-0 rounded-lg border border-sage bg-mist pl-10 pr-3 text-base md:text-sm" placeholder="Etsy, AliExpress, suivi, boutique..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select className="focus-ring h-11 min-w-0 rounded-lg border border-sage bg-mist px-3 text-base md:text-sm" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
            <option value="">Tous les comptes AliExpress</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <button className="focus-ring h-11 rounded-lg border border-sage px-4 text-sm font-semibold" onClick={() => { setQuery(""); setAccountFilter(""); setActiveTab("all"); }}>
            Reinitialiser
          </button>
        </div>
      </section>

      {isManualOpen ? (
        <ManualOrderForm form={manualForm} images={images} isSaving={isSaving} onChange={setManualForm} onImagesChange={setImages} onClose={() => setIsManualOpen(false)} onSave={addManualOrder} />
      ) : null}

      {isLoading ? <p className="text-sm text-ink/60">Chargement des commandes...</p> : null}
      {error ? <p className="rounded-lg bg-clay/10 p-3 text-sm font-medium text-clay">{error}</p> : null}
      {!isLoading && visibleOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sage bg-white p-8 text-center">
          <PackagePlus className="mx-auto text-moss" size={28} />
          <p className="mt-3 font-semibold">Aucune commande a traiter</p>
          <p className="mt-1 text-sm text-ink/60">Toutes les ventes de cette selection ont deja ete traitees sur AliExpress.</p>
        </div>
      ) : null}

      <div className="grid gap-3 lg:hidden">
        {visibleOrders.map((order) => (
          <OrderCard key={order.id} order={order} accountName={accountNameById.get(order.supplierAccountId ?? "") ?? order.accountUsed} alerts={getOrderAlerts(order, settings, problems.filter((problem) => problem.orderId === order.id))} shopName={shopNameById.get(order.shopId ?? "") ?? "Commande hors vente"} isSaving={isSaving} onDeliver={deliver} />
        ))}
      </div>

      {visibleOrders.length > 0 ? (
        <div className="hidden overflow-x-auto rounded-lg border border-sage bg-white shadow-soft lg:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-mist text-xs uppercase text-ink/55"><tr><th className="px-4 py-3">Vente Etsy</th><th className="px-4 py-3">AliExpress</th><th className="px-4 py-3">Suivi</th><th className="px-4 py-3">Statuts</th><th className="px-4 py-3">Benefice</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-sage">
              {visibleOrders.map((order) => {
                const alerts = getOrderAlerts(order, settings, problems.filter((problem) => problem.orderId === order.id));
                return <tr key={order.id} className="align-top hover:bg-mist/60">
                  <td className="px-4 py-4"><p className="font-semibold">#{order.etsyOrderNumber || "Hors vente"}</p><p className="text-ink/60">{shopNameById.get(order.shopId ?? "") ?? "-"} · {formatDate(order.saleDate)}</p><p>{formatCurrency(order.transaction?.grossRevenue ?? 0)}</p></td>
                  <td className="px-4 py-4"><p className="font-medium">{order.supplierOrderNumber || "A commander"}</p><p className="text-ink/60">{accountNameById.get(order.supplierAccountId ?? "") ?? "Compte non renseigne"}</p><p>{formatCurrency(order.actualSupplierCost ?? order.estimatedProductCost)}</p></td>
                  <td className="px-4 py-4"><p>{order.trackingNumber || "-"}</p><p className="text-ink/60">{order.estimatedDeliveryAt ? formatDate(order.estimatedDeliveryAt) : "Date non renseignee"}</p></td>
                  <td className="px-4 py-4"><StatusBadge status={order.logisticsStatus} /><p className="mt-2 text-xs text-ink/60">{FINANCIAL_LABELS[order.financialStatus]}</p>{alerts[0] ? <AlertBadge label={alerts[0].label} danger={alerts[0].tone === "danger"} /> : null}</td>
                  <td className="px-4 py-4 font-semibold text-moss">{formatCurrency(order.transaction?.netProfit ?? 0)}</td>
                  <td className="px-4 py-4"><OrderActions order={order} isSaving={isSaving} onDeliver={deliver} /></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageShell>
  );
}

function TabButton({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return <button className={`focus-ring h-10 shrink-0 rounded-lg border px-3 text-sm font-semibold ${active ? "border-moss bg-moss text-white" : "border-sage bg-white text-ink/70"}`} onClick={onClick}>{label} ({count})</button>;
}

function StatusBadge({ status }: { status: LogisticsStatus }) {
  return <span className="inline-flex rounded-md bg-mist px-2 py-1 text-xs font-semibold text-moss">{STATUS_LABELS[status]}</span>;
}

function AlertBadge({ danger, label }: { danger: boolean; label: string }) {
  return <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${danger ? "text-clay" : "text-amber-700"}`}><AlertTriangle size={14} />{label}</p>;
}

function OrderActions({ isSaving, onDeliver, order }: { isSaving: boolean; onDeliver: (id: string) => void; order: SupplierOrder }) {
  return <div className="flex flex-wrap gap-2">
    <Link className="focus-ring inline-flex h-9 items-center rounded-lg bg-moss px-3 text-xs font-semibold text-white" href={`/commandes/${order.id}`}>{order.logisticsStatus === "to_order" ? "Commander sur AliExpress" : "Ouvrir"}</Link>
    {order.logisticsStatus === "shipped" ? <button className="focus-ring inline-flex h-9 items-center gap-1 rounded-lg border border-sage px-3 text-xs font-semibold" disabled={isSaving} onClick={() => onDeliver(order.id)}><Check size={15} /> Livree</button> : null}
  </div>;
}

function OrderCard({ accountName, alerts, isSaving, onDeliver, order, shopName }: { accountName: string; alerts: ReturnType<typeof getOrderAlerts>; isSaving: boolean; onDeliver: (id: string) => void; order: SupplierOrder; shopName: string }) {
  return <article className="rounded-lg border border-sage bg-white p-4 shadow-soft">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-ink/55">{shopName}</p><h2 className="font-semibold">#{order.etsyOrderNumber || order.supplierOrderNumber || "Hors vente"}</h2><p className="mt-1 text-sm text-ink/60">Vente du {formatDate(order.saleDate)}</p></div><StatusBadge status={order.logisticsStatus} /></div>
    <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><Info label="Montant recu" value={formatCurrency(order.transaction?.grossRevenue ?? 0)} /><Info label="Cout produit" value={formatCurrency(order.actualSupplierCost ?? order.estimatedProductCost)} /><Info label="Compte AliExpress" value={accountName || "Non renseigne"} /><Info label="Suivi" value={order.trackingNumber || "Non renseigne"} /><Info label="Livraison estimee" value={order.estimatedDeliveryAt ? formatDate(order.estimatedDeliveryAt) : "Non renseignee"} /><Info label="Benefice actuel" value={formatCurrency(order.transaction?.netProfit ?? 0)} /></div>
    {alerts.map((alert) => <AlertBadge key={alert.type} label={alert.label} danger={alert.tone === "danger"} />)}
    <div className="mt-4"><OrderActions order={order} isSaving={isSaving} onDeliver={onDeliver} /></div>
  </article>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-xs text-ink/55">{label}</p><p className="truncate font-medium">{value}</p></div>; }

function ManualOrderForm({ form, images, isSaving, onChange, onClose, onImagesChange, onSave }: { form: SupplierOrderInput; images: File[]; isSaving: boolean; onChange: (form: SupplierOrderInput) => void; onClose: () => void; onImagesChange: (files: File[]) => void; onSave: () => void }) {
  const field = (key: keyof SupplierOrderInput, value: string) => onChange({ ...form, [key]: key === "totalAmount" ? Number(value.replace(",", ".")) || 0 : value });
  return <section className="rounded-lg border border-sage bg-white p-4 shadow-soft"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-clay">Exception</p><h2 className="font-semibold">Commande hors vente</h2></div><button className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-sage" onClick={onClose} aria-label="Fermer"><X size={17} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Numero AliExpress" value={form.orderNumber} onChange={(value) => field("orderNumber", value)} /><Field label="Compte utilise" value={form.accountUsed} onChange={(value) => field("accountUsed", value)} /><Field label="Date de commande" type="date" value={form.orderDate} onChange={(value) => field("orderDate", value)} /><Field label="Montant total" inputMode="decimal" value={String(form.totalAmount).replace(".", ",")} onChange={(value) => field("totalAmount", value)} /><Field label="Lien AliExpress" value={form.orderLink} onChange={(value) => field("orderLink", value)} /><Field label="Pays" value={form.country} onChange={(value) => field("country", value)} /><label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70 sm:col-span-2">Notes<textarea className="focus-ring min-h-20 rounded-lg border border-sage bg-mist p-3 text-base" value={form.notes} onChange={(event) => field("notes", event.target.value)} /></label><OrderImagePicker files={images} onChange={onImagesChange} /></div><button className="focus-ring mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} onClick={onSave}><Plus size={17} /> Enregistrer la commande</button></section>;
}

function Field({ inputMode, label, onChange, type = "text", value }: { inputMode?: "decimal"; label: string; onChange: (value: string) => void; type?: string; value: string }) { return <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70">{label}<input className="focus-ring h-12 min-w-0 w-full rounded-lg border border-sage bg-mist px-3 text-base" inputMode={inputMode} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
