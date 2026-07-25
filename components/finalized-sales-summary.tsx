"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Banknote, List, Pencil, Plus, Trash2, X } from "lucide-react";
import { useClientData } from "@/components/client-data";
import { calculateFinalProfit, calculateFinalizedSalesSummary } from "@/lib/calculations";
import { getTodayIsoDate } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import { deleteEtsyPayout, getEtsyPayouts, saveEtsyPayout } from "@/lib/order-workflow";
import { getAllSupplierOrders } from "@/lib/supplier-orders";
import { alertSupabaseError } from "@/lib/supabase-error";
import type { EtsyPayout, FinalizedSaleRecord, SupplierOrder } from "@/lib/types";

type PeriodPreset = "today" | "week" | "month" | "previous_month" | "year" | "custom";
type DateMode = "finalized" | "sale";

export function FinalizedSalesSummary() {
  const { shops, transactions } = useClientData();
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [payouts, setPayouts] = useState<EtsyPayout[]>([]);
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const initialRange = getRange("month");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [shopId, setShopId] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("finalized");
  const [showSales, setShowSales] = useState(false);
  const [showPayouts, setShowPayouts] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [editingPayout, setEditingPayout] = useState<EtsyPayout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [nextOrders, nextPayouts] = await Promise.all([
        getAllSupplierOrders(),
        getEtsyPayouts()
      ]);
      setOrders(nextOrders);
      setPayouts(nextPayouts);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erreur Supabase");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const transactionById = useMemo(
    () => new Map(transactions.map((transaction) => [transaction.id, transaction])),
    [transactions]
  );
  const shopNameById = useMemo(
    () => new Map(shops.map((shop) => [shop.id, shop.name])),
    [shops]
  );

  const includedRecords = useMemo(() => {
    const records: FinalizedSaleRecord[] = [];
    const seenTransactionIds = new Set<string>();
    orders.forEach((order) => {
      if (!order.isFinalized || !order.transactionId || seenTransactionIds.has(order.transactionId)) return;
      const transaction = transactionById.get(order.transactionId);
      if (!transaction) return;
      const selectedDate = dateMode === "finalized" ? order.finalizedAt?.slice(0, 10) : order.saleDate;
      if (!selectedDate || selectedDate < startDate || selectedDate > endDate) return;
      if (shopId && transaction.shopId !== shopId) return;
      seenTransactionIds.add(order.transactionId);
      records.push({ order: { ...order, transaction }, transaction });
    });
    return records.sort((a, b) => (b.order.finalizedAt ?? b.order.saleDate).localeCompare(a.order.finalizedAt ?? a.order.saleDate));
  }, [dateMode, endDate, orders, shopId, startDate, transactionById]);

  const includedPayouts = useMemo(
    () => payouts.filter((payout) => payout.payoutDate >= startDate && payout.payoutDate <= endDate && (!shopId || payout.shopId === shopId)),
    [endDate, payouts, shopId, startDate]
  );
  const receivedPayouts = includedPayouts.reduce((total, payout) => total + payout.amount, 0);
  const summary = calculateFinalizedSalesSummary(includedRecords, receivedPayouts);
  const deliveredNotFinalized = orders.filter((order) => order.logisticsStatus === "delivered" && !order.isFinalized).length;

  function selectPreset(nextPreset: PeriodPreset) {
    setPreset(nextPreset);
    if (nextPreset !== "custom") {
      const range = getRange(nextPreset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  }

  async function removePayout(payout: EtsyPayout) {
    if (!window.confirm(`Supprimer le versement de ${formatCurrency(payout.amount)} ?`)) return;
    setIsSaving(true);
    try {
      await deleteEtsyPayout(payout.id);
      await load();
    } catch (caughtError) {
      alertSupabaseError(caughtError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-sage bg-white shadow-soft">
      <div className="border-b border-sage p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-moss">Rapprochement Etsy</p>
            <h2 className="mt-1 text-xl font-semibold">Bilan des ventes finalisees</h2>
            <p className="mt-1 text-sm text-ink/60">Uniquement les commandes finalisees manuellement.</p>
          </div>
          {deliveredNotFinalized > 0 ? (
            <Link className="focus-ring flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800" href="/commandes?filter=delivered_not_finalized">
              {deliveredNotFinalized} livree{deliveredNotFinalized > 1 ? "s" : ""} a finaliser <ArrowRight size={16} />
            </Link>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Select label="Periode" value={preset} onChange={(value) => selectPreset(value as PeriodPreset)} options={[["today", "Aujourd'hui"], ["week", "Cette semaine"], ["month", "Ce mois"], ["previous_month", "Mois precedent"], ["year", "Cette annee"], ["custom", "Periode personnalisee"]]} />
          <Select label="Boutique" value={shopId} onChange={setShopId} options={[["", "Toutes les boutiques"], ...shops.map((shop) => [shop.id, shop.name] as [string, string])]} />
          <Select label="Mode de date" value={dateMode} onChange={(value) => setDateMode(value as DateMode)} options={[["finalized", "Date de finalisation"], ["sale", "Date de vente"]]} />
        </div>
        {preset === "custom" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DateField label="Date de debut" value={startDate} onChange={setStartDate} />
            <DateField label="Date de fin" value={endDate} onChange={setEndDate} />
          </div>
        ) : null}
      </div>

      {error ? <p className="m-4 rounded-lg bg-clay/10 p-3 text-sm font-medium text-clay">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Metric value={String(summary.finalizedSalesCount)} label="Ventes finalisees" />
        <Metric value={String(summary.fullyRefundedSalesCount)} label="Ventes remboursees" tone="negative" />
        <Metric value={formatCurrency(summary.netRevenue)} label="CA net" />
        <Metric value={formatCurrency(summary.finalProfit)} label="Benefice reel" tone={summary.finalProfit >= 0 ? "positive" : "negative"} />
        <Metric value={formatCurrency(summary.remainingPayout)} label="Reste a recevoir" tone="warning" />
      </div>

      <div className="grid gap-4 border-t border-sage p-4 lg:grid-cols-2 lg:p-5">
        <div className="grid content-start gap-2">
          <h3 className="font-semibold">Activite et resultat</h3>
          <SummaryLine label="Ventes normales" value={String(summary.normalSalesCount)} />
          <SummaryLine label="Ventes remboursees" value={String(summary.fullyRefundedSalesCount)} />
          <SummaryLine label="Ventes partiellement remboursees" value={String(summary.partiallyRefundedSalesCount)} />
          <Separator />
          <SummaryLine label="Chiffre d'affaires brut" value={formatCurrency(summary.grossRevenue)} />
          <SummaryLine label="Remboursements clients" value={`-${formatCurrency(summary.customerRefunds)}`} negative />
          <SummaryLine label="Chiffre d'affaires net" value={formatCurrency(summary.netRevenue)} strong />
          <Separator />
          <SummaryLine label="Frais Etsy" value={`-${formatCurrency(summary.etsyFees)}`} />
          <SummaryLine label="Couts produits AliExpress" value={`-${formatCurrency(summary.productCosts)}`} />
          <SummaryLine label="Livraisons fournisseur" value={`-${formatCurrency(summary.supplierShipping)}`} />
          <SummaryLine label="Offsite Ads" value={`-${formatCurrency(summary.offsiteAds)}`} />
          <SummaryLine label="Autres frais" value={`-${formatCurrency(summary.otherFees)}`} />
          <SummaryLine label="Remboursements AliExpress recus" value={`+${formatCurrency(summary.supplierRefunds)}`} positive />
          <SummaryLine label="Frais Etsy rembourses" value={`+${formatCurrency(summary.etsyFeesRefunded)}`} positive />
          <Separator />
          <SummaryLine label="Benefice reel" value={formatCurrency(summary.finalProfit)} strong positive={summary.finalProfit >= 0} negative={summary.finalProfit < 0} />
          <SummaryLine label="Marge moyenne" value={`${summary.averageMargin.toFixed(1).replace(".", ",")} %`} strong />
          <button type="button" className="focus-ring mt-2 inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-sage px-3 text-sm font-semibold" onClick={() => setShowSales(true)}><List size={16} /> Voir les ventes incluses</button>
        </div>

        <div className="grid content-start gap-3 rounded-lg bg-mist p-4">
          <div className="flex items-center gap-2"><Banknote className="text-moss" size={20} /><h3 className="font-semibold">Suivi des versements Etsy</h3></div>
          <SummaryLine label="Montant theorique a recevoir" value={formatCurrency(summary.theoreticalPayoutDue)} strong />
          {summary.etsyAdjustmentDebt > 0 ? <SummaryLine label="Ajustement ou dette estimee" value={formatCurrency(summary.etsyAdjustmentDebt)} negative /> : null}
          <SummaryLine label="Montant deja recu" value={formatCurrency(summary.receivedPayouts)} positive />
          <SummaryLine label="Montant restant a recevoir" value={formatCurrency(summary.remainingPayout)} strong warning={summary.remainingPayout > 0} />
          {summary.excessReceived > 0 ? <SummaryLine label="Ecart positif recu" value={formatCurrency(summary.excessReceived)} positive strong /> : null}
          <p className="text-xs leading-5 text-ink/55">Les versements Etsy peuvent regrouper des ventes realisees sur plusieurs periodes. Le montant restant est une estimation de rapprochement.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-moss px-3 text-sm font-semibold text-white" onClick={() => { setEditingPayout(null); setShowPayoutForm(true); }}><Plus size={16} /> Ajouter un versement</button>
            <button type="button" className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-sage bg-white px-3 text-sm font-semibold" onClick={() => setShowPayouts(true)}>Voir les versements</button>
          </div>
        </div>
      </div>

      {showSales ? <SalesModal records={includedRecords} shopNameById={shopNameById} onClose={() => setShowSales(false)} /> : null}
      {showPayouts ? <PayoutsModal payouts={includedPayouts} shopNameById={shopNameById} isSaving={isSaving} onClose={() => setShowPayouts(false)} onDelete={removePayout} onEdit={(payout) => { setEditingPayout(payout); setShowPayouts(false); setShowPayoutForm(true); }} /> : null}
      {showPayoutForm ? <PayoutForm payout={editingPayout} shops={shops} isSaving={isSaving} onClose={() => setShowPayoutForm(false)} onSave={async (input) => { setIsSaving(true); try { await saveEtsyPayout(input); setShowPayoutForm(false); setEditingPayout(null); await load(); } catch (caughtError) { alertSupabaseError(caughtError); } finally { setIsSaving(false); } }} /> : null}
    </section>
  );
}

function getRange(preset: Exclude<PeriodPreset, "custom">) {
  const today = getTodayIsoDate();
  const current = new Date(`${today}T12:00:00`);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  if (preset === "today") return { start: today, end: today };
  if (preset === "week") { const start = new Date(current); const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1); return { start: iso(start), end: today }; }
  if (preset === "year") return { start: `${today.slice(0, 4)}-01-01`, end: today };
  if (preset === "previous_month") { const start = new Date(current.getFullYear(), current.getMonth() - 1, 1, 12); const end = new Date(current.getFullYear(), current.getMonth(), 0, 12); return { start: iso(start), end: iso(end) }; }
  return { start: `${today.slice(0, 7)}-01`, end: today };
}

function Metric({ label, tone, value }: { label: string; tone?: "positive" | "negative" | "warning"; value: string }) { const color = tone === "positive" ? "text-moss" : tone === "negative" ? "text-clay" : tone === "warning" ? "text-amber-700" : "text-ink"; return <div className="min-w-0 rounded-lg border border-sage p-3"><p className={`break-words text-xl font-semibold sm:text-2xl ${color}`}>{value}</p><p className="mt-1 text-xs text-ink/60">{label}</p></div>; }
function SummaryLine({ label, negative, positive, strong, value, warning }: { label: string; negative?: boolean; positive?: boolean; strong?: boolean; value: string; warning?: boolean }) { return <div className={`flex items-start justify-between gap-4 py-1 text-sm ${strong ? "font-semibold" : ""}`}><span className="text-ink/65">{label}</span><span className={`shrink-0 text-right ${negative ? "text-clay" : positive ? "text-moss" : warning ? "text-amber-700" : ""}`}>{value}</span></div>; }
function Separator() { return <div className="my-1 border-t border-sage" />; }
function Select({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: [string, string][]; value: string }) { return <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70">{label}<select className="focus-ring h-11 min-w-0 rounded-lg border border-sage bg-mist px-3 text-base md:text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
function DateField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) { return <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70">{label}<input className="focus-ring h-11 min-w-0 w-full rounded-lg border border-sage bg-mist text-base" type="date" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) { return <div className="fixed inset-0 z-50 flex items-end bg-ink/60 sm:items-center sm:justify-center sm:p-4"><section className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-soft sm:max-w-5xl sm:rounded-lg"><div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-sage bg-white p-4"><h2 className="text-xl font-semibold">{title}</h2><button type="button" className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-sage" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div><div className="p-4">{children}</div></section></div>; }

function SalesModal({ onClose, records, shopNameById }: { onClose: () => void; records: FinalizedSaleRecord[]; shopNameById: Map<string, string> }) { return <Modal title="Ventes incluses dans le bilan" onClose={onClose}>{records.length === 0 ? <p className="text-sm text-ink/60">Aucune vente finalisee sur cette selection.</p> : <div className="grid gap-3">{records.map(({ order, transaction }) => <Link key={transaction.id} href={`/commandes/${order.id}`} className="focus-ring grid gap-2 rounded-lg border border-sage p-3 hover:bg-mist sm:grid-cols-4"><div><p className="text-xs text-ink/55">Commande</p><p className="font-semibold">#{order.etsyOrderNumber}</p><p className="text-sm text-ink/60">{shopNameById.get(transaction.shopId) ?? "-"}</p></div><div><p className="text-xs text-ink/55">Dates</p><p className="text-sm">Vente : {formatDate(order.saleDate)}</p><p className="text-sm">Finalisee : {order.finalizedAt ? formatDate(order.finalizedAt.slice(0, 10)) : "-"}</p></div><div><p className="text-xs text-ink/55">Finances</p><p className="text-sm">Brut : {formatCurrency(transaction.grossRevenue)}</p><p className="text-sm">Remb. : {formatCurrency(transaction.refundAmount)}</p><p className="text-sm">Frais : {formatCurrency(transaction.etsyFees)}</p></div><div><p className="text-xs text-ink/55">Resultat</p><p className="font-semibold text-moss">{formatCurrency(calculateFinalProfit({ ...transaction, actualSupplierCost: order.actualSupplierCost, shippingPaid: order.supplierShipping }))}</p><p className="text-sm text-ink/60">{transaction.status}</p></div></Link>)}</div>}</Modal>; }

function PayoutsModal({ isSaving, onClose, onDelete, onEdit, payouts, shopNameById }: { isSaving: boolean; onClose: () => void; onDelete: (payout: EtsyPayout) => void; onEdit: (payout: EtsyPayout) => void; payouts: EtsyPayout[]; shopNameById: Map<string, string> }) { return <Modal title="Versements Etsy" onClose={onClose}>{payouts.length === 0 ? <p className="text-sm text-ink/60">Aucun versement sur cette periode.</p> : <div className="grid gap-3">{payouts.map((payout) => <article key={payout.id} className="grid gap-3 rounded-lg border border-sage p-3 sm:grid-cols-[130px_1fr_150px_auto]"><div><p className="text-xs text-ink/55">Date</p><p className="font-medium">{formatDate(payout.payoutDate)}</p></div><div><p className="font-semibold">{shopNameById.get(payout.shopId) ?? "-"}</p><p className="text-sm text-ink/60">{payout.reference || "Sans reference"}</p><p className="text-sm text-ink/60">{payout.notes}</p></div><p className="font-semibold text-moss">{formatCurrency(payout.amount)}</p><div className="flex gap-2"><button type="button" className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-sage" onClick={() => onEdit(payout)} aria-label="Modifier"><Pencil size={16} /></button><button type="button" className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-sage text-clay disabled:opacity-60" disabled={isSaving} onClick={() => onDelete(payout)} aria-label="Supprimer"><Trash2 size={16} /></button></div></article>)}</div>}</Modal>; }

function PayoutForm({ isSaving, onClose, onSave, payout, shops }: { isSaving: boolean; onClose: () => void; onSave: (input: { id?: string; shopId: string; amount: number; payoutDate: string; reference: string; notes: string }) => void; payout: EtsyPayout | null; shops: { id: string; name: string }[] }) { const [form, setForm] = useState({ shopId: payout?.shopId ?? shops[0]?.id ?? "", payoutDate: payout?.payoutDate ?? getTodayIsoDate(), amount: payout ? String(payout.amount).replace(".", ",") : "", reference: payout?.reference ?? "", notes: payout?.notes ?? "" }); return <Modal title={payout ? "Modifier le versement Etsy" : "Ajouter un versement Etsy"} onClose={onClose}><div className="grid gap-3 sm:grid-cols-2"><Select label="Boutique" value={form.shopId} onChange={(value) => setForm({ ...form, shopId: value })} options={shops.map((shop) => [shop.id, shop.name])} /><DateField label="Date du versement" value={form.payoutDate} onChange={(value) => setForm({ ...form, payoutDate: value })} /><TextField label="Montant recu" inputMode="decimal" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} /><TextField label="Reference" value={form.reference} onChange={(value) => setForm({ ...form, reference: value })} /><label className="grid gap-2 text-sm font-medium text-ink/70 sm:col-span-2">Notes<textarea className="focus-ring min-h-24 rounded-lg border border-sage bg-mist p-3 text-base" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="focus-ring h-11 rounded-lg border border-sage px-4 text-sm font-semibold" onClick={onClose}>Annuler</button><button type="button" className="focus-ring h-11 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving || Number(form.amount.replace(",", ".")) <= 0} onClick={() => onSave({ id: payout?.id, shopId: form.shopId, payoutDate: form.payoutDate, amount: Number(form.amount.replace(",", ".")), reference: form.reference, notes: form.notes })}>{isSaving ? "Enregistrement..." : "Enregistrer le versement"}</button></div></Modal>; }
function TextField({ inputMode, label, onChange, value }: { inputMode?: "decimal"; label: string; onChange: (value: string) => void; value: string }) { return <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70">{label}<input className="focus-ring h-11 min-w-0 rounded-lg border border-sage bg-mist px-3 text-base" inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
